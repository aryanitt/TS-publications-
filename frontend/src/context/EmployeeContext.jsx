import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import {
  CURRENT_EMPLOYEE,
  createInitialTasks,
  normalizeTasksMap,
  EMP_LEADS,
  EMP_FOLLOWUPS,
  empLeadFromDrawerPayload,
  EMP_CALLS,
  EMP_LEAD_CALL_ACTIVITY,
  ALL_EMP_SOPS,
  getFollowUpUrgency,
  formatFollowUpSchedule,
  buildFollowUpTaskName,
  followUpPriority,
} from "../data/employeeMock.js";
import { apiGet, apiPost, apiPut, apiPatch, invalidateCache } from "../lib/api.js";
import { getCrmHeaders, mapApiEmployee, storeEmployee } from "../lib/crmContext.js";
import {
  apiLeadToEmployee,
  temperatureToApi,
  employeeStagePatch,
  unwrapApiData,
} from "../lib/leadSync.js";

const EmployeeContext = createContext(null);

const AVATAR_COLORS = ["#2563eb", "#10b981", "#f59e0b", "#7c3aed", "#dc2626", "#0ea5e9", "#64748b"];

function initialsFromName(name) {
  return name.split(/\s+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase();
}

function readJsonStorage(key, fallback) {
  if (typeof window === "undefined") return fallback();
  try {
    const saved = window.localStorage.getItem(key);
    if (!saved) return fallback();
    return JSON.parse(saved);
  } catch {
    return fallback();
  }
}

export function EmployeeProvider({ children }) {
  const [employee, setEmployee] = useState(CURRENT_EMPLOYEE);
  const [leads, setLeads] = useState(EMP_LEADS);
  const [loading, setLoading] = useState(true);
  const [usingApi, setUsingApi] = useState(false);

  const refreshLeads = useCallback(async (empId = employee.id) => {
    try {
      const res = await apiGet(`/api/v1/employee/${empId}/leads`, {
        headers: getCrmHeaders(),
        skipCache: true,
        cacheTtl: 0,
      });
      const items = unwrapApiData(res);
      setLeads(items.map((l) => apiLeadToEmployee(l, AVATAR_COLORS)));
      setUsingApi(true);
      return true;
    } catch {
      return false;
    }
  }, [employee.id]);

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      setLoading(true);
      try {
        const empRes = await apiGet("/api/v1/employees", {
          headers: getCrmHeaders(),
          skipCache: true,
          cacheTtl: 0,
        });
        const employees = unwrapApiData(empRes);
        const matched = employees.find((e) => e.name === CURRENT_EMPLOYEE.name) || employees[0];
        if (matched && !cancelled) {
          const mapped = { ...CURRENT_EMPLOYEE, ...mapApiEmployee(matched) };
          setEmployee(mapped);
          storeEmployee(mapped);
          const ok = await refreshLeads(mapped.id);
          if (ok && !cancelled) {
            setLoading(false);
            return;
          }
        }
      } catch {
        // fall through to mock
      }
      if (!cancelled) {
        setUsingApi(false);
        setLeads(EMP_LEADS);
        setLoading(false);
      }
    }

    bootstrap();
    return () => { cancelled = true; };
  }, [refreshLeads]);

  const [tasks, setTasksState] = useState(() =>
    normalizeTasksMap(readJsonStorage("emp_tasks_map", createInitialTasks)),
  );

  const [followUps, setFollowUpsState] = useState(() => {
    const saved = readJsonStorage("emp_followups_list", () => null);
    if (Array.isArray(saved)) return saved;
    return EMP_FOLLOWUPS.map((f) => ({ ...f, done: false }));
  });

  const setTasks = useCallback((updater) => {
    setTasksState((prev) => {
      const next = normalizeTasksMap(
        typeof updater === "function" ? updater(prev) : updater,
      );
      if (typeof window !== "undefined") {
        window.localStorage.setItem("emp_tasks_map", JSON.stringify(next));
      }
      return next;
    });
  }, []);

  const setFollowUps = useCallback((updater) => {
    setFollowUpsState((prev) => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      localStorage.setItem("emp_followups_list", JSON.stringify(next));
      return next;
    });
  }, []);

  const [calls, setCalls] = useState(() => {
    const saved = localStorage.getItem("emp_calls_list");
    return saved ? JSON.parse(saved) : EMP_CALLS;
  });

  const [activities, setActivities] = useState(() => {
    const saved = localStorage.getItem("emp_activities_map");
    return saved ? JSON.parse(saved) : EMP_LEAD_CALL_ACTIVITY;
  });

  const [sops, setSopsState] = useState(() => {
    const saved = localStorage.getItem("emp_sops_list");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          const ids = new Set(parsed.map((s) => s.id));
          const merged = [...parsed, ...ALL_EMP_SOPS.filter((s) => !ids.has(s.id))];
          return merged.length > parsed.length ? merged : parsed;
        }
      } catch {
        /* fall through */
      }
    }
    return ALL_EMP_SOPS;
  });

  const setSops = useCallback((updater) => {
    setSopsState((prev) => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      localStorage.setItem("emp_sops_list", JSON.stringify(next));
      return next;
    });
  }, []);

  const addCallRecord = useCallback((newCall) => {
    setCalls((prev) => {
      const updated = [newCall, ...prev];
      localStorage.setItem("emp_calls_list", JSON.stringify(updated));
      return updated;
    });
  }, []);

  const addActivityRecord = useCallback((leadId, newEvent) => {
    setActivities((prev) => {
      const existing = prev[leadId] || [];
      const updated = [newEvent, ...existing];
      const newMap = { ...prev, [leadId]: updated };
      localStorage.setItem("emp_activities_map", JSON.stringify(newMap));
      return newMap;
    });
  }, []);

  const scheduleFollowUp = useCallback(({ leadName, company, type, date, time, note, leadId }) => {
    const lead = leads.find((l) => l.name === leadName || l.id === leadId);
    const id = Date.now();
    const taskId = id + 1;
    const urgency = getFollowUpUrgency(date);
    const resolvedCompany = company || lead?.company || "—";
    const av = lead?.av || initialsFromName(leadName);
    const color = lead?.color || "#64748b";

    const followUp = {
      id,
      name: leadName,
      company: resolvedCompany,
      type,
      urgency,
      time: formatFollowUpSchedule(date, time),
      av,
      color,
      note: note?.trim() || `${type} follow-up scheduled`,
      scheduledDate: date,
      scheduledTime: time,
      done: false,
      taskId,
      leadId: lead?.id ?? leadId,
    };

    const task = {
      id: taskId,
      name: buildFollowUpTaskName({ type, name: leadName, note }),
      done: false,
      priority: followUpPriority(urgency),
      assignee: employee.name,
      assigneeAv: employee.initials,
      assigneeColor: employee.avatarColor,
      deadline: time,
      source: "followup",
      followUpId: id,
    };

    setFollowUps((prev) => [...prev, followUp]);
    setTasks((prev) => ({
      ...prev,
      [date]: [...(prev[date] || []), task],
    }));

    return followUp;
  }, [employee, leads, setFollowUps, setTasks]);

  const completeFollowUp = useCallback((followUpId) => {
    setFollowUps((prev) => prev.map((f) => (f.id === followUpId ? { ...f, done: true } : f)));
    setTasks((prev) => {
      const next = { ...prev };
      Object.keys(next).forEach((date) => {
        next[date] = (next[date] || []).map((t) => (
          t.followUpId === followUpId ? { ...t, done: true } : t
        ));
      });
      return next;
    });
  }, [setFollowUps, setTasks]);

  const syncTaskWithFollowUp = useCallback((date, taskId, done) => {
    setTasks((prev) => {
      const task = prev[date]?.find((t) => t.id === taskId);
      const dayTasks = prev[date] || [];
      const next = {
        ...prev,
        [date]: dayTasks.map((t) => (t.id === taskId ? { ...t, done } : t)),
      };
      if (task?.followUpId && done) {
        setFollowUps((fuPrev) => fuPrev.map((f) => (
          f.id === task.followUpId ? { ...f, done: true } : f
        )));
      }
      return next;
    });
  }, [setTasks, setFollowUps]);

  const addLead = useCallback(async (form) => {
    const localLead = form.lead_name || form.company_name
      ? empLeadFromDrawerPayload(form, AVATAR_COLORS)
      : (() => {
        const name = [form.firstName, form.lastName].filter(Boolean).join(" ").trim() || "New Lead";
        const id = Date.now();
        const av = initialsFromName(name);
        return {
          id,
          name,
          company: form.company || "—",
          status: form.status || "warm",
          stage: form.stage || "Attempted",
          source: form.source || "Website",
          budget: form.budget || "—",
          last: "Just now",
          av,
          color: AVATAR_COLORS[id % AVATAR_COLORS.length],
          city: form.city || "",
          state: form.state || "",
        };
      })();

    if (usingApi) {
      try {
        const res = await apiPost("/api/v1/leads", {
          leadName: localLead.name,
          companyName: localLead.company,
          phone: form.phone || localLead.phone,
          email: form.email || localLead.email,
          city: localLead.city,
          source: localLead.source,
          temperature: temperatureToApi(localLead.status),
          pipelineStage: localLead.stage,
          expectedRevenue: Number(form.expected_revenue || 0),
          requirements: form.service || form.interested_service,
        }, { headers: getCrmHeaders() });

        await apiPost("/api/v1/assignment/assign", {
          leadId: res.data?.id ?? res.id,
          employeeId: employee.id,
          method: "manual",
        }, { headers: getCrmHeaders() });

        invalidateCache("/api/v1");
        await refreshLeads(employee.id);
        toast.success(`${localLead.name} added to your pipeline`);
        return apiLeadToEmployee(res.data || res, AVATAR_COLORS);
      } catch (err) {
        toast.error(err.message || "Could not save lead to server");
      }
    }

    localLead.assignee = employee.name;
    localLead.assigneeId = employee.id;
    setLeads((prev) => [localLead, ...prev]);
    return localLead;
  }, [employee, refreshLeads, usingApi]);

  const updateLeadStage = useCallback(async (leadId, stageLabel) => {
    const current = leads.find((l) => l.id === leadId);
    const patch = employeeStagePatch(stageLabel, current?.status);

    setLeads((prev) => prev.map((l) => {
      if (l.id !== leadId) return l;
      return { ...l, stage: stageLabel, status: patch.employeeStatus };
    }));

    if (usingApi) {
      try {
        await apiPatch(`/api/v1/leads/${leadId}/stage`, {
          stage: stageLabel,
          status: stageLabel,
        }, { headers: getCrmHeaders() });
        invalidateCache("/api/v1");
      } catch (err) {
        toast.error(err.message || "Stage update failed");
      }
    }
  }, [leads, usingApi]);

  const updateLeadTemperature = useCallback(async (leadId, nextStatus) => {
    setLeads((prev) => prev.map((l) => (l.id === leadId ? { ...l, status: nextStatus } : l)));

    if (usingApi) {
      try {
        await apiPut(`/api/v1/leads/${leadId}`, {
          temperature: temperatureToApi(nextStatus),
        }, { headers: getCrmHeaders() });
        invalidateCache("/api/v1");
      } catch (err) {
        toast.error(err.message || "Temperature update failed");
      }
    }
  }, [usingApi]);

  const value = useMemo(() => ({
    employee,
    tasks,
    setTasks,
    followUps,
    setFollowUps,
    scheduleFollowUp,
    completeFollowUp,
    syncTaskWithFollowUp,
    leads,
    setLeads,
    addLead,
    updateLeadStage,
    updateLeadTemperature,
    refreshLeads,
    usingApi,
    calls,
    setCalls,
    addCallRecord,
    activities,
    addActivityRecord,
    sops,
    setSops,
    loading,
  }), [
    employee, tasks, setTasks, followUps, setFollowUps, scheduleFollowUp, completeFollowUp,
    syncTaskWithFollowUp, leads, addLead, updateLeadStage, updateLeadTemperature, refreshLeads,
    usingApi, calls, addCallRecord, activities, addActivityRecord, sops, setSops, loading,
  ]);

  return (
    <EmployeeContext.Provider value={value}>
      {children}
    </EmployeeContext.Provider>
  );
}

export function useEmployee() {
  const ctx = useContext(EmployeeContext);
  if (!ctx) throw new Error("useEmployee must be used within EmployeeProvider");
  return ctx;
}
