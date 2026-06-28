import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import {
  CURRENT_EMPLOYEE,
  MOCK_EMPLOYEE_ID,
  createInitialTasks,
  normalizeTasksMap,
  tasksMapFromApi,
  priorityToApi,
  EMP_LEADS,
  EMP_FOLLOWUPS,
  empLeadFromDrawerPayload,
  EMP_CALLS,
  EMP_LEAD_CALL_ACTIVITY,
  ALL_EMP_SOPS,
  mergeApiSopsWithLocal,
  normalizeCallSop,
  getFollowUpUrgency,
  formatFollowUpSchedule,
  buildFollowUpTaskName,
  followUpPriority,
  callToApiPayload,
  callFromApi,
  followUpToApiPayload,
  followUpFromApi,
  EMP_MEETINGS_UPCOMING,
  EMP_MEETINGS_HISTORY,
  meetingToApiPayload,
  meetingFromApi,
  partitionMeetings,
  generateGoogleMeetLink,
} from "../data/employeeMock.js";
import { apiGet, apiPost, apiPut, apiPatch, invalidateCache, shouldPersistToApi } from "../lib/api.js";
import { getCrmHeaders, mapApiEmployee, storeEmployee, getStoredEmployee } from "../lib/crmContext.js";
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

function readBootstrappedEmployee() {
  const stored = getStoredEmployee();
  if (stored?.id && stored.id !== MOCK_EMPLOYEE_ID) {
    return { ...CURRENT_EMPLOYEE, ...stored };
  }
  return CURRENT_EMPLOYEE;
}

function isMockEmployeeId(id) {
  return id == null || Number(id) === MOCK_EMPLOYEE_ID;
}

export function EmployeeProvider({ children }) {
  const [employee, setEmployee] = useState(readBootstrappedEmployee);
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

  const [tasks, setTasksState] = useState({});
  const [followUps, setFollowUpsState] = useState(() =>
    EMP_FOLLOWUPS.map((f) => ({ ...f, done: false })),
  );
  const [calls, setCalls] = useState(EMP_CALLS);
  const [meetingsUpcoming, setMeetingsUpcoming] = useState(EMP_MEETINGS_UPCOMING);
  const [meetingsHistory, setMeetingsHistory] = useState(EMP_MEETINGS_HISTORY);
  const [activities, setActivities] = useState(EMP_LEAD_CALL_ACTIVITY);
  const [sops, setSopsState] = useState(() => ALL_EMP_SOPS.map(normalizeCallSop));
  const [teamEmployees, setTeamEmployees] = useState([]);

  const loadEmployeeWorkspace = useCallback(async (empId, empProfile = employee) => {
    try {
      const res = await apiGet(`/api/v1/employee/${empId}/dashboard`, {
        headers: getCrmHeaders(),
        skipCache: true,
        cacheTtl: 0,
      });
      const data = unwrapApiData(res) || res.data || res;
      if (Array.isArray(data.tasks)) {
        setTasksState(tasksMapFromApi(data.tasks, empProfile));
      }
      const workspaceLeads = Array.isArray(data.leads)
        ? data.leads.map((l) => apiLeadToEmployee(l, AVATAR_COLORS))
        : [];
      if (workspaceLeads.length) {
        setLeads(workspaceLeads);
      }
      if (Array.isArray(data.followups)) {
        const leadSource = workspaceLeads.length ? workspaceLeads : leads;
        setFollowUpsState(
          data.followups.map((f) => followUpFromApi(f, leadSource)),
        );
      }
      try {
        const fuRes = await apiGet(`/api/v1/employee/${empId}/followups`, {
          headers: getCrmHeaders(),
          skipCache: true,
          cacheTtl: 0,
        });
        const fuItems = unwrapApiData(fuRes);
        if (Array.isArray(fuItems)) {
          const leadSource = workspaceLeads.length ? workspaceLeads : leads;
          setFollowUpsState(fuItems.map((f) => followUpFromApi(f, leadSource)));
        }
      } catch {
        /* dashboard followups may already be set */
      }
      try {
        const meetRes = await apiGet(`/api/v1/employee/${empId}/meetings`, {
          headers: getCrmHeaders(),
          skipCache: true,
          cacheTtl: 0,
        });
        const meetItems = unwrapApiData(meetRes);
        if (Array.isArray(meetItems)) {
          const leadSource = workspaceLeads.length ? workspaceLeads : leads;
          const split = partitionMeetings(meetItems, leadSource);
          setMeetingsUpcoming(split.upcoming);
          setMeetingsHistory(split.history);
        }
      } catch {
        /* keep existing meetings list */
      }
      if (Array.isArray(data.calls)) {
        setCalls(data.calls.map((c) => callFromApi(c, workspaceLeads)));
      }
      if (Array.isArray(data.meetings)) {
        const split = partitionMeetings(data.meetings, workspaceLeads.length ? workspaceLeads : leads);
        setMeetingsUpcoming(split.upcoming);
        setMeetingsHistory(split.history);
      }
      setUsingApi(true);
      return true;
    } catch {
      return false;
    }
  }, [employee, leads]);

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
          setTeamEmployees(employees.map((e) => mapApiEmployee(e)));
          setUsingApi(true);

          try {
            await refreshLeads(mapped.id);
          } catch {
            /* leads may load on next refresh */
          }
          try {
            await loadEmployeeWorkspace(mapped.id, mapped);
          } catch {
            /* workspace partial load is ok */
          }
          try {
            const sopRes = await apiGet("/api/sop/all", { skipCache: true, cacheTtl: 0 });
            if (sopRes.success && sopRes.sops?.length) {
              setSopsState(mergeApiSopsWithLocal(sopRes.sops));
            }
          } catch {
            setSopsState(ALL_EMP_SOPS.map(normalizeCallSop));
          }
          if (!cancelled) {
            setLoading(false);
            return;
          }
        }
      } catch {
        // fall through to mock
      }
      if (!cancelled) {
        const stored = getStoredEmployee();
        const hasStoredReal = stored?.id && stored.id !== MOCK_EMPLOYEE_ID;
        if (!hasStoredReal) {
          setUsingApi(false);
          setLeads(EMP_LEADS);
          setTasksState(createInitialTasks());
          setMeetingsUpcoming(EMP_MEETINGS_UPCOMING);
          setMeetingsHistory(EMP_MEETINGS_HISTORY);
        } else {
          setEmployee({ ...CURRENT_EMPLOYEE, ...stored });
          setUsingApi(shouldPersistToApi(false));
          try {
            await refreshLeads(stored.id);
            await loadEmployeeWorkspace(stored.id, { ...CURRENT_EMPLOYEE, ...stored });
            await refreshMeetings(stored.id);
          } catch {
            /* partial reload ok */
          }
        }
        setLoading(false);
      }
    }

    bootstrap();
    return () => { cancelled = true; };
  }, [refreshLeads, loadEmployeeWorkspace]);

  const refreshTasks = useCallback(async (empId = employee.id) => {
    try {
      const res = await apiGet(`/api/v1/employee/${empId}/tasks`, {
        headers: getCrmHeaders(),
        skipCache: true,
        cacheTtl: 0,
      });
      const items = unwrapApiData(res);
      setTasksState(tasksMapFromApi(items, employee));
      return true;
    } catch {
      return false;
    }
  }, [employee]);

  const resolveApiEmployeeId = useCallback(async (preferredId, preferredName) => {
    if (!isMockEmployeeId(preferredId)) return preferredId;

    const res = await apiGet("/api/v1/employees", {
      headers: getCrmHeaders(),
      skipCache: true,
      cacheTtl: 0,
    });
    const employees = unwrapApiData(res);
    if (!Array.isArray(employees) || !employees.length) {
      throw new Error("No employees in database — add team members first");
    }

    const name = String(preferredName || employee?.name || "").trim();
    const matched = employees.find((e) => e.name === name)
      || employees.find((e) => e.name === CURRENT_EMPLOYEE.name)
      || employees[0];
    if (!matched?.id) {
      throw new Error("Could not resolve employee id for this task");
    }

    const mapped = { ...employee, ...mapApiEmployee(matched) };
    setEmployee(mapped);
    storeEmployee(mapped);
    setUsingApi(true);
    return matched.id;
  }, [employee]);

  const refreshFollowUps = useCallback(async (empId = employee.id, leadList = leads) => {
    try {
      let resolvedId = empId;
      if (isMockEmployeeId(empId)) {
        resolvedId = await resolveApiEmployeeId(empId, employee.name);
      }
      const res = await apiGet(`/api/v1/employee/${resolvedId}/followups`, {
        headers: getCrmHeaders(),
        skipCache: true,
        cacheTtl: 0,
      });
      const items = unwrapApiData(res);
      if (!Array.isArray(items)) return false;
      setFollowUpsState(items.map((f) => followUpFromApi(f, leadList)));
      setUsingApi(true);
      return true;
    } catch {
      return false;
    }
  }, [employee, leads, resolveApiEmployeeId]);

  const resolveAssigneeId = useCallback(async (assigneeName) => {
    const name = String(assigneeName || "").trim();
    const self = employee?.name || "";
    if (!name || !self || name === self || name.split(" ")[0] === self.split(" ")[0]) {
      return resolveApiEmployeeId(employee.id, employee.name);
    }
    try {
      const res = await apiGet("/api/team/employees", { skipCache: true, cacheTtl: 0 });
      const match = res.employees?.find(
        (e) => e.name === name || e.name?.split(" ")[0] === name.split(" ")[0],
      );
      if (match?.id) return match.id;
    } catch {
      // fall through
    }
    return resolveApiEmployeeId(employee.id, name);
  }, [employee, resolveApiEmployeeId]);

  const createTask = useCallback(async ({ date, task }) => {
    const tempId = Date.now();
    const localTask = { ...task, id: tempId };
    const persist = shouldPersistToApi(usingApi);

    setTasksState((prev) => ({
      ...prev,
      [date]: [...(prev[date] || []), localTask],
    }));

    if (!persist) return localTask;

    try {
      const assigneeId = await resolveAssigneeId(task.assignee);
      if (!assigneeId) {
        throw new Error("Could not resolve assignee for this task");
      }

      const res = await apiPost("/api/v1/employee/tasks", {
        assigneeId,
        title: task.name,
        priority: priorityToApi(task.priority),
        dueAt: `${date}T${task.deadline || "17:00"}:00`,
        status: "pending",
      }, { headers: getCrmHeaders() });

      const saved = unwrapApiData(res) || res?.data || res;
      const savedId = saved?.id ?? saved?.taskId ?? saved?._id;
      if (!savedId) {
        throw new Error("Task was not saved — server returned no task id");
      }

      setTasksState((prev) => ({
        ...prev,
        [date]: (prev[date] || []).map((t) => (
          t.id === tempId ? { ...localTask, id: savedId } : t
        )),
      }));
      invalidateCache("/api/v1");
      await refreshTasks(assigneeId);
      return { ...localTask, id: savedId };
    } catch (err) {
      setTasksState((prev) => ({
        ...prev,
        [date]: (prev[date] || []).filter((t) => t.id !== tempId),
      }));
      toast.error(err.message || "Could not save task to server");
      return null;
    }
  }, [employee, resolveAssigneeId, usingApi, refreshTasks]);

  const updateTaskStatus = useCallback(async (date, taskId, done) => {
    setTasksState((prev) => ({
      ...prev,
      [date]: (prev[date] || []).map((t) => (t.id === taskId ? { ...t, done } : t)),
    }));

    if (!shouldPersistToApi(usingApi) || !taskId) return;

    try {
      await apiPatch(`/api/v1/employee/tasks/${taskId}`, {
        status: done ? "done" : "pending",
        completedAt: done ? new Date().toISOString() : null,
      }, { headers: getCrmHeaders() });
      invalidateCache("/api/v1");
    } catch (err) {
      toast.error(err.message || "Could not update task");
      await refreshTasks();
    }
  }, [refreshTasks, usingApi]);

  const removeTask = useCallback(async (date, taskId) => {
    const previous = tasks;
    setTasksState((prev) => ({
      ...prev,
      [date]: (prev[date] || []).filter((t) => t.id !== taskId),
    }));

    if (!shouldPersistToApi(usingApi) || !taskId) return;

    try {
      await apiPatch(`/api/v1/employee/tasks/${taskId}`, {
        status: "cancelled",
      }, { headers: getCrmHeaders() });
      invalidateCache("/api/v1");
    } catch (err) {
      setTasksState(previous);
      toast.error(err.message || "Could not delete task");
    }
  }, [tasks, usingApi]);

  const setTasks = useCallback((updater) => {
    setTasksState((prev) => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      return normalizeTasksMap(next, { useMockFallback: !usingApi });
    });
  }, [usingApi]);

  const setFollowUps = useCallback((updater) => {
    setFollowUpsState((prev) => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      return next;
    });
  }, []);

  const setSops = useCallback((updater) => {
    setSopsState((prev) => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      return next;
    });
  }, []);

  const addCallRecord = useCallback(async (newCall) => {
    const tempId = newCall.id || Date.now();
    const optimistic = { ...newCall, id: tempId };
    setCalls((prev) => [optimistic, ...prev]);

    if (!shouldPersistToApi(usingApi)) return optimistic;

    if (!newCall.leadId) {
      setCalls((prev) => prev.filter((c) => c.id !== tempId));
      toast.error("Could not save call — select a valid lead");
      return null;
    }

    try {
      const employeeId = await resolveApiEmployeeId(employee.id, employee.name);
      const payload = callToApiPayload(newCall, employeeId);
      const res = await apiPost("/api/v1/employee/calls", payload, { headers: getCrmHeaders() });
      const saved = unwrapApiData(res) || res.data || res;
      const mapped = callFromApi(saved, leads);
      setCalls((prev) => [mapped, ...prev.filter((c) => c.id !== tempId)]);

      const momText = String(newCall.aiMoM || newCall.note || newCall.aiSummary || "").trim();
      if (momText) {
        try {
          await apiPost(
            `/api/v1/leads/${newCall.leadId}/notes`,
            { body: `[Call MoM]\n${momText}` },
            { headers: getCrmHeaders() },
          );
        } catch {
          /* call row saved; lead note is supplementary */
        }
      }

      invalidateCache("/api/v1");
      return mapped;
    } catch (err) {
      setCalls((prev) => prev.filter((c) => c.id !== tempId));
      toast.error(err.message || "Could not save call to server");
      return null;
    }
  }, [usingApi, employee, leads, resolveApiEmployeeId]);

  const addActivityRecord = useCallback((leadId, newEvent) => {
    setActivities((prev) => {
      const existing = prev[leadId] || [];
      const updated = [newEvent, ...existing];
      return { ...prev, [leadId]: updated };
    });
  }, []);

  const scheduleFollowUp = useCallback(async ({ leadName, company, type, date, time, note, leadId }) => {
    const lead = leads.find((l) => l.name === leadName || l.id === leadId);
    const resolvedLeadId = leadId ?? lead?.id;
    const urgency = getFollowUpUrgency(date);
    const resolvedCompany = company || lead?.company || "—";
    const av = lead?.av || initialsFromName(leadName);
    const color = lead?.color || "#64748b";

    if (shouldPersistToApi(usingApi)) {
      if (!resolvedLeadId) {
        toast.error("Select a valid lead to schedule follow-up");
        return null;
      }
      try {
        const employeeId = await resolveApiEmployeeId(employee.id, employee.name);
        const payload = followUpToApiPayload(
          { leadName, company, type, date, time, note, leadId: resolvedLeadId },
          employeeId,
          leads,
        );
        const res = await apiPost("/api/v1/employee/followups", payload, { headers: getCrmHeaders() });
        const saved = unwrapApiData(res) || res.data || res;
        const followUp = { ...followUpFromApi(saved, leads, type), company: resolvedCompany, av, color };
        const task = {
          id: saved.taskId,
          name: buildFollowUpTaskName({ type, name: leadName, note }),
          done: false,
          priority: followUpPriority(urgency),
          assignee: employee.name,
          assigneeAv: employee.initials,
          assigneeColor: employee.avatarColor,
          deadline: time,
          source: "followup",
          followUpId: saved.id,
        };

        setFollowUps((prev) => [...prev, followUp]);
        setTasks((prev) => ({
          ...prev,
          [date]: [...(prev[date] || []), task],
        }));
        invalidateCache("/api/v1");
        await refreshFollowUps(employeeId, leads);
        return followUp;
      } catch (err) {
        toast.error(err.message || "Could not save follow-up to server");
        return null;
      }
    }

    const id = Date.now();
    const taskId = id + 1;

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
      leadId: resolvedLeadId,
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
  }, [employee, leads, setFollowUps, setTasks, usingApi, resolveApiEmployeeId, refreshFollowUps]);

  useEffect(() => {
    if (loading) return;
    if (!employee?.id) return;
    refreshFollowUps(employee.id, leads);
  }, [loading, employee?.id, refreshFollowUps, leads]);

  useEffect(() => {
    if (loading) return;
    if (!employee?.id) return;
    refreshMeetings(employee.id, leads);
  }, [loading, employee?.id, refreshMeetings, leads]);

  const completeFollowUp = useCallback(async (followUpId) => {
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

    if (!shouldPersistToApi(usingApi) || !followUpId) return;

    try {
      await apiPatch(`/api/v1/employee/followups/${followUpId}/complete`, {}, { headers: getCrmHeaders() });
      invalidateCache("/api/v1");
    } catch (err) {
      toast.error(err.message || "Could not mark follow-up complete on server");
    }
  }, [setFollowUps, setTasks, usingApi]);

  const syncTaskWithFollowUp = useCallback(async (date, taskId, done) => {
    let linkedFollowUpId;
    setTasks((prev) => {
      const task = prev[date]?.find((t) => t.id === taskId);
      linkedFollowUpId = task?.followUpId;
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

    if (shouldPersistToApi(usingApi) && done && linkedFollowUpId) {
      try {
        await apiPatch(`/api/v1/employee/followups/${linkedFollowUpId}/complete`, {}, { headers: getCrmHeaders() });
        invalidateCache("/api/v1");
      } catch {
        /* follow-up may already be complete */
      }
    }

    if (shouldPersistToApi(usingApi) && taskId) {
      try {
        await apiPatch(`/api/v1/employee/tasks/${taskId}`, {
          status: done ? "done" : "pending",
          completedAt: done ? new Date().toISOString() : null,
        }, { headers: getCrmHeaders() });
        invalidateCache("/api/v1");
      } catch (err) {
        toast.error(err.message || "Could not update task on server");
        await refreshTasks();
      }
    }
  }, [setTasks, setFollowUps, usingApi, refreshTasks]);

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

    if (shouldPersistToApi(usingApi)) {
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

    if (shouldPersistToApi(usingApi)) {
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

    if (shouldPersistToApi(usingApi)) {
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

  const reassignLead = useCallback(async (leadId, employeeId, employeeName, method = "manual") => {
    setLeads((prev) => prev.map((l) => (
      l.id === leadId ? { ...l, assignee: employeeName, assigneeId: employeeId } : l
    )));

    if (!shouldPersistToApi(usingApi)) return true;

    try {
      await apiPost("/api/v1/assignment/assign", {
        leadId,
        employeeId,
        method: method === "auto" ? "reassign" : method,
      }, { headers: getCrmHeaders() });
      invalidateCache("/api/v1");
      await refreshLeads(employee.id);
      return true;
    } catch (err) {
      toast.error(err.message || "Could not reassign lead");
      await refreshLeads(employee.id);
      return false;
    }
  }, [employee.id, refreshLeads, usingApi]);

  const refreshMeetings = useCallback(async (empId = employee.id, leadList = leads) => {
    try {
      let resolvedId = empId;
      if (isMockEmployeeId(empId)) {
        resolvedId = await resolveApiEmployeeId(empId, employee.name);
      }
      const res = await apiGet(`/api/v1/employee/${resolvedId}/meetings`, {
        headers: getCrmHeaders(),
        skipCache: true,
        cacheTtl: 0,
      });
      const items = unwrapApiData(res);
      const split = partitionMeetings(items, leadList);
      setMeetingsUpcoming(split.upcoming);
      setMeetingsHistory(split.history);
      setUsingApi(true);
      return true;
    } catch {
      return false;
    }
  }, [employee, leads, resolveApiEmployeeId]);

  const createMeeting = useCallback(async (form) => {
    const lead = leads.find((l) => String(l.id) === String(form.leadId));
    const platformLabel = { google_meet: "Google Meet", zoom: "Zoom", teams: "Teams" }[form.platform]
      || form.platform
      || "Google Meet";
    const meetLink = form.meetLink || (form.platform === "google_meet" ? generateGoogleMeetLink() : "");
    const tempId = Date.now();
    const optimistic = {
      id: tempId,
      title: form.title.trim(),
      time: `Scheduled, ${form.time}`,
      date: form.date,
      scheduledAt: `${form.date}T${form.time || "09:00"}:00`,
      platform: platformLabel,
      lead: lead?.name || "—",
      company: lead?.company || "—",
      color: lead?.color || "#e11d48",
      meetLink,
      status: "scheduled",
    };

    setMeetingsUpcoming((prev) => [optimistic, ...prev]);

    if (!shouldPersistToApi(usingApi)) return optimistic;

    if (!form.leadId) {
      setMeetingsUpcoming((prev) => prev.filter((m) => m.id !== tempId));
      toast.error("Select a lead before booking a meeting");
      return null;
    }

    try {
      const employeeId = await resolveApiEmployeeId(employee.id, employee.name);
      const payload = meetingToApiPayload({ ...form, meetLink }, employeeId);
      const res = await apiPost("/api/v1/employee/meetings", payload, { headers: getCrmHeaders() });
      const saved = unwrapApiData(res) || res?.data || res;
      const savedId = saved?.id ?? saved?._id;
      if (!savedId) throw new Error("Meeting was not saved — server returned no id");

      const mapped = meetingFromApi(saved, leads);
      setMeetingsUpcoming((prev) => [mapped, ...prev.filter((m) => m.id !== tempId)]);
      invalidateCache("/api/v1");
      await refreshMeetings(employeeId, leads);
      return mapped;
    } catch (err) {
      setMeetingsUpcoming((prev) => prev.filter((m) => m.id !== tempId));
      toast.error(err.message || "Could not save meeting to server");
      return null;
    }
  }, [employee, leads, usingApi, resolveApiEmployeeId, refreshMeetings]);

  const cancelMeeting = useCallback(async (meetingId) => {
    const previousUpcoming = meetingsUpcoming;
    setMeetingsUpcoming((prev) => prev.filter((m) => m.id !== meetingId));

    if (!shouldPersistToApi(usingApi) || !meetingId) return;

    try {
      await apiPatch(`/api/v1/employee/meetings/${meetingId}`, { status: "cancelled" }, {
        headers: getCrmHeaders(),
      });
      invalidateCache("/api/v1");
    } catch (err) {
      setMeetingsUpcoming(previousUpcoming);
      toast.error(err.message || "Could not delete meeting");
    }
  }, [meetingsUpcoming, usingApi]);

  const value = useMemo(() => ({
    employee,
    tasks,
    setTasks,
    createTask,
    updateTaskStatus,
    removeTask,
    refreshTasks,
    followUps,
    setFollowUps,
    scheduleFollowUp,
    completeFollowUp,
    refreshFollowUps,
    syncTaskWithFollowUp,
    leads,
    setLeads,
    addLead,
    updateLeadStage,
    updateLeadTemperature,
    refreshLeads,
    reassignLead,
    teamEmployees,
    usingApi,
    calls,
    setCalls,
    addCallRecord,
    activities,
    addActivityRecord,
    sops,
    setSops,
    meetingsUpcoming,
    meetingsHistory,
    createMeeting,
    cancelMeeting,
    refreshMeetings,
    loading,
  }), [
    employee, tasks, setTasks, createTask, updateTaskStatus, removeTask, refreshTasks,
    followUps, setFollowUps, scheduleFollowUp, completeFollowUp, refreshFollowUps,
    syncTaskWithFollowUp, leads, addLead, updateLeadStage, updateLeadTemperature, refreshLeads,
    reassignLead, teamEmployees,
    usingApi, calls, addCallRecord, activities, addActivityRecord, sops, setSops,
    meetingsUpcoming, meetingsHistory, createMeeting, cancelMeeting, refreshMeetings, loading,
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
