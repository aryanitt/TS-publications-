import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import {
  BookOpen, Check, CheckCircle2, Copy, Layers,
  MessageSquare, Plus, Search, Target, Pencil, X, CheckCircle, ChevronRight,
} from "lucide-react";
import { GlassCard, StatCard, Badge, Drawer } from "../../components/Primitives.jsx";
import {
  EMP_SOP_SCRIPTS, EMP_SOP_CROSS, EMP_SOP_CHECKLIST,
} from "../../data/employeeMock.js";
import { BtnPrimary, BtnSecondary } from "../components/EmpUI.jsx";
import { SEGMENT_WRAP, SEGMENT_BTN, SEGMENT_BTN_INACTIVE } from "../../lib/segmentPills.js";
import { useEmployee } from "../../context/EmployeeContext.jsx";

const INPUT = "w-full h-10 px-3 rounded-xl bg-white border border-slate-200 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200 focus:border-slate-300 transition";
const TEXTAREA = `${INPUT} !h-auto py-2.5 resize-none`;
const LABEL = "block text-[10px] font-bold uppercase tracking-wide text-slate-500 mb-1.5";

const TABS = [
  { id: "sops", label: "All SOPs", short: "SOPs", icon: BookOpen },
  { id: "scripts", label: "Call Scripts", short: "Scripts", icon: MessageSquare },
  { id: "cross", label: "Cross Selling", short: "Cross", icon: Target },
  { id: "checklist", label: "Daily Checklist", short: "List", icon: CheckCircle2 },
];

function Field({ label, children, className = "" }) {
  return (
    <div className={className}>
      <label className={LABEL}>{label}</label>
      {children}
    </div>
  );
}

function SopDrawer({ open, mode, form, setForm, onClose, onSave }) {
  const isEdit = mode === "edit-sop";
  return (
    <Drawer open={open} onClose={onClose} title={isEdit ? "Edit SOP" : "Add SOP"} width="drawer-panel">
      <p className="text-xs text-slate-500 mb-4 pb-3 border-b border-slate-100">
        {isEdit ? "Update title, steps, and scripts" : "Create a new standard operating procedure"}
      </p>
      <div className="space-y-4">
        <Field label="SOP Title">
          <input className={INPUT} value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} placeholder="How to Start Talking to Leads" />
        </Field>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Subtitle">
            <input className={INPUT} value={form.sub} onChange={(e) => setForm((f) => ({ ...f, sub: e.target.value }))} placeholder="Intro script · First 30 sec" />
          </Field>
          <Field label="Category">
            <select className={INPUT} value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}>
              {["SaaS", "Branding", "Process", "Media", "General"].map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </Field>
        </div>
        <Field label="Opening Script">
          <textarea rows={4} className={TEXTAREA} value={form.openingScript} onChange={(e) => setForm((f) => ({ ...f, openingScript: e.target.value }))} placeholder="Hi {leadName}, I'm {repName} from..." />
        </Field>
        <Field label="Key Tips">
          <textarea rows={3} className={TEXTAREA} value={form.tips} onChange={(e) => setForm((f) => ({ ...f, tips: e.target.value }))} placeholder="Keep tone confident and friendly..." />
        </Field>
        <Field label="Checklist (one item per line)">
          <textarea rows={4} className={TEXTAREA} value={form.checklistText} onChange={(e) => setForm((f) => ({ ...f, checklistText: e.target.value }))} placeholder="Greet warmly using first name&#10;Introduce yourself and company" />
        </Field>
      </div>
      <div className="sticky bottom-0 -mx-4 sm:-mx-5 px-4 sm:px-5 py-4 mt-6 bg-white border-t border-slate-100 flex flex-wrap gap-2">
        <BtnPrimary onClick={onSave} className="flex-1 sm:flex-initial">
          <CheckCircle className="w-4 h-4" /> {isEdit ? "Save Changes" : "Create SOP"}
        </BtnPrimary>
        <BtnSecondary onClick={onClose} className="sm:ml-auto">
          <X className="w-4 h-4" /> Cancel
        </BtnSecondary>
      </div>
    </Drawer>
  );
}

function ScriptDrawer({ open, form, setForm, onClose, onSave }) {
  return (
    <Drawer open={open} onClose={onClose} title="Edit Script" width="drawer-panel">
      <p className="text-xs text-slate-500 mb-4 pb-3 border-b border-slate-100">
        Modify call script text — changes apply immediately
      </p>
      <div className="space-y-4">
        <Field label="Script Title">
          <input className={INPUT} value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
        </Field>
        <Field label="Script Body">
          <textarea rows={6} className={TEXTAREA} value={form.body} onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))} />
        </Field>
        <Field label="When to Use">
          <input className={INPUT} value={form.use} onChange={(e) => setForm((f) => ({ ...f, use: e.target.value }))} placeholder="First contact with any new lead" />
        </Field>
      </div>
      <div className="sticky bottom-0 -mx-4 sm:-mx-5 px-4 sm:px-5 py-4 mt-6 bg-white border-t border-slate-100 flex flex-wrap gap-2">
        <BtnPrimary onClick={onSave} className="flex-1 sm:flex-initial">
          <CheckCircle className="w-4 h-4" /> Save Script
        </BtnPrimary>
        <BtnSecondary onClick={onClose} className="sm:ml-auto">
          <X className="w-4 h-4" /> Cancel
        </BtnSecondary>
      </div>
    </Drawer>
  );
}

function SopCard({ sop, onEdit }) {
  const navigate = useNavigate();
  const stepCount = sop.steps?.length || 0;

  return (
    <article className="rounded-xl sm:rounded-2xl border border-slate-200/80 bg-white overflow-hidden hover:border-slate-300 hover:shadow-[0_8px_24px_rgba(15,23,42,0.06)] transition-all group min-w-0">
      <div className="flex items-center gap-1.5 sm:gap-2 p-2.5 sm:p-4">
        <button
          type="button"
          className="flex flex-1 items-center gap-2 sm:gap-3 min-w-0 text-left"
          onClick={() => navigate(`/employee/sales-process/${sop.id}`)}
        >
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-slate-50 border border-slate-200 grid place-items-center shrink-0 text-base sm:text-lg">
            {sop.icon || "📋"}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 min-w-0">
              <p className="text-xs sm:text-sm font-bold text-slate-900 truncate group-hover:text-slate-700">{sop.title}</p>
              <span className="shrink-0 text-[7px] sm:hidden font-bold uppercase tracking-wide px-1.5 py-0.5 rounded border bg-sky-50 text-sky-700 border-sky-100">
                {sop.category}
              </span>
            </div>
            <p className="text-[10px] sm:text-[11px] text-slate-500 mt-0.5 truncate hidden sm:block">{sop.sub}</p>
            <p className="text-[9px] sm:text-[10px] text-slate-400 mt-0.5">{stepCount} steps · {sop.duration || "—"}</p>
          </div>
          <ChevronRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-400 shrink-0 group-hover:text-slate-600 transition" />
        </button>
        <button
          type="button"
          onClick={() => onEdit(sop)}
          className="p-1.5 sm:p-2 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 shrink-0 border border-transparent hover:border-rose-100 transition"
          aria-label="Quick edit"
        >
          <Pencil className="w-3.5 h-3.5" />
        </button>
      </div>
      <div className="hidden sm:flex px-4 pb-3 justify-between items-center border-t border-slate-50 pt-2">
        <Badge tone="muted">{sop.category}</Badge>
        <span className="text-[10px] font-semibold text-slate-500">Tap card to open playbook</span>
      </div>
    </article>
  );
}

const EMPTY_SOP_FORM = {
  id: null,
  title: "",
  sub: "",
  category: "General",
  openingScript: "",
  tips: "",
  checklistText: "",
};

const EMPTY_SCRIPT_FORM = { id: null, title: "", body: "", use: "", sopId: null, stepId: null, type: "standalone" };

export default function EmployeeSalesProcess() {
  const { sops, setSops } = useEmployee();
  const [tab, setTab] = useState("sops");
  const [standaloneScripts, setStandaloneScripts] = useState(() =>
    EMP_SOP_SCRIPTS.map((s, i) => ({ ...s, id: `standalone-${i}`, type: "standalone" })),
  );
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [checks, setChecks] = useState({});
  const [sopDrawerOpen, setSopDrawerOpen] = useState(false);
  const [sopDrawerMode, setSopDrawerMode] = useState("add-sop");
  const [sopForm, setSopForm] = useState(EMPTY_SOP_FORM);
  const [scriptDrawerOpen, setScriptDrawerOpen] = useState(false);
  const [scriptForm, setScriptForm] = useState(EMPTY_SCRIPT_FORM);

  const categories = useMemo(() => {
    const set = new Set(sops.map((s) => s.category).filter(Boolean));
    return ["all", ...Array.from(set)];
  }, [sops]);

  const filteredSops = useMemo(() => {
    let list = sops;
    if (category !== "all") list = list.filter((s) => s.category === category);
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (s) =>
          s.title.toLowerCase().includes(q) ||
          s.sub?.toLowerCase().includes(q) ||
          s.category?.toLowerCase().includes(q),
      );
    }
    return list;
  }, [sops, search, category]);

  const allScripts = useMemo(() => {
    const fromSops = [];
    sops.forEach((sop) => {
      sop.steps?.forEach((step) => {
        if (step.scripts?.opening) {
          fromSops.push({
            id: `sop-${sop.id}-${step.id}`,
            type: "step",
            sopId: sop.id,
            stepId: step.id,
            title: `${sop.title} — ${step.label}`,
            body: step.scripts.opening,
            use: sop.sub,
          });
        }
      });
    });
    return [...standaloneScripts, ...fromSops];
  }, [sops, standaloneScripts]);

  const filteredScripts = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return allScripts;
    return allScripts.filter(
      (s) =>
        s.title.toLowerCase().includes(q) ||
        s.body.toLowerCase().includes(q) ||
        s.use?.toLowerCase().includes(q),
    );
  }, [allScripts, search]);

  const crossItems = useMemo(() => {
    const fromSops = sops.filter((s) => s.crossSell).map((s) => ({
      product: s.crossSell.product,
      icon: s.crossSell.icon,
      categories: s.category,
      crossTo: s.title,
      success: s.crossSell.success,
      deals: s.crossSell.deals,
      pitch: s.crossSell.pitch,
    }));
    return [...EMP_SOP_CROSS, ...fromSops];
  }, [sops]);

  const stats = useMemo(() => ({
    sops: sops.length,
    scripts: allScripts.length,
    categories: categories.length - 1,
    cross: crossItems.length,
  }), [sops.length, allScripts.length, categories.length, crossItems.length]);

  const openAddSop = () => {
    setSopForm(EMPTY_SOP_FORM);
    setSopDrawerMode("add-sop");
    setSopDrawerOpen(true);
  };

  const openEditSop = (sop) => {
    const firstStep = sop.steps?.[0];
    setSopForm({
      id: sop.id,
      title: sop.title,
      sub: sop.sub || "",
      category: sop.category || "General",
      openingScript: firstStep?.scripts?.opening || "",
      tips: firstStep?.scripts?.tips || "",
      checklistText: (firstStep?.checklist || []).join("\n"),
    });
    setSopDrawerMode("edit-sop");
    setSopDrawerOpen(true);
  };

  const saveSop = () => {
    if (!sopForm.title.trim()) {
      toast.error("SOP title is required");
      return;
    }
    const checklist = sopForm.checklistText.split("\n").map((l) => l.trim()).filter(Boolean);
    const step = {
      id: "main",
      label: "Main Script",
      questions: checklist.map((t, i) => ({ id: `q${i}`, text: t, type: "check" })),
      discovery: [],
      checklist,
      scripts: {
        opening: sopForm.openingScript,
        talkingPoints: [],
        tips: sopForm.tips,
      },
    };

    if (sopDrawerMode === "edit-sop" && sopForm.id != null) {
      setSops((prev) =>
        prev.map((s) =>
          s.id === sopForm.id
            ? {
                ...s,
                title: sopForm.title.trim(),
                sub: sopForm.sub.trim(),
                category: sopForm.category,
                steps: s.steps?.length
                  ? [{ ...s.steps[0], ...step, label: s.steps[0].label }, ...s.steps.slice(1)]
                  : [step],
              }
            : s,
        ),
      );
      toast.success("SOP updated");
    } else {
      const newSop = {
        id: Date.now(),
        title: sopForm.title.trim(),
        sub: sopForm.sub.trim(),
        category: sopForm.category,
        budgetRange: "—",
        duration: "3–5 mins",
        icon: "📋",
        steps: [step],
        objections: [],
        crossSell: null,
      };
      setSops((prev) => [newSop, ...prev]);
      toast.success("SOP created");
    }
    setSopDrawerOpen(false);
  };

  const openEditScript = (script) => {
    setScriptForm({
      id: script.id,
      title: script.title,
      body: script.body,
      use: script.use || "",
      sopId: script.sopId ?? null,
      stepId: script.stepId ?? null,
      type: script.type,
    });
    setScriptDrawerOpen(true);
  };

  const saveScript = () => {
    if (!scriptForm.title.trim() || !scriptForm.body.trim()) {
      toast.error("Title and script body are required");
      return;
    }

    if (scriptForm.type === "standalone") {
      setStandaloneScripts((prev) =>
        prev.map((s) =>
          s.id === scriptForm.id
            ? { ...s, title: scriptForm.title, body: scriptForm.body, use: scriptForm.use }
            : s,
        ),
      );
    } else {
      setSops((prev) =>
        prev.map((sop) => {
          if (sop.id !== scriptForm.sopId) return sop;
          return {
            ...sop,
            steps: sop.steps.map((step) =>
              step.id === scriptForm.stepId
                ? { ...step, scripts: { ...step.scripts, opening: scriptForm.body } }
                : step,
            ),
          };
        }),
      );
    }
    toast.success("Script saved");
    setScriptDrawerOpen(false);
  };

  const copyScript = (body) => {
    navigator.clipboard?.writeText(body);
    toast.success("Script copied");
  };

  const toggleCheck = (key) => {
    setChecks((p) => ({ ...p, [key]: !p[key] }));
    toast.success("Checklist updated");
  };

  return (
    <div className="space-y-3 sm:space-y-5 page-shell min-w-0 animate-fade-in">
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-2 sm:gap-3 md:gap-4">
        <StatCard compact label="Total SOPs" value={String(stats.sops)} icon={BookOpen} tone="primary" change="playbooks" sub="" />
        <StatCard compact label="Call Scripts" value={String(stats.scripts)} icon={MessageSquare} tone="info" change="editable" sub="" />
        <StatCard compact label="Categories" value={String(stats.categories)} icon={Layers} tone="success" change="segments" sub="" />
        <StatCard compact label="Cross-Sell" value={String(stats.cross)} icon={Target} tone="warning" change="guides" sub="" />
      </div>

      <GlassCard className="p-2.5 sm:p-4">
        <div className="flex flex-col gap-2 sm:gap-3">
          {/* Mobile: 4 tabs in one row */}
          <div className="grid grid-cols-4 gap-0.5 p-0.5 rounded-lg bg-slate-100/80 border border-slate-200/80 sm:hidden">
            {TABS.map(({ id, short, icon: Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => setTab(id)}
                className={`flex flex-col items-center justify-center gap-0.5 py-1.5 rounded-md text-[8px] font-bold transition ${SEGMENT_BTN} ${
                  tab === id ? "bg-white text-slate-800 shadow-sm ring-1 ring-slate-200" : SEGMENT_BTN_INACTIVE
                }`}
              >
                <Icon className="w-3 h-3" />
                {short}
              </button>
            ))}
          </div>

          <div className="hidden sm:flex flex-col lg:flex-row lg:items-center gap-2">
            <div className={`${SEGMENT_WRAP} max-w-full`}>
              {TABS.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setTab(id)}
                  className={`flex items-center gap-1 ${SEGMENT_BTN} ${
                    tab === id ? "bg-white text-slate-800 shadow-sm ring-1 ring-slate-200" : SEGMENT_BTN_INACTIVE
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {label}
                </button>
              ))}
            </div>

            {tab === "sops" && (
              <BtnPrimary onClick={openAddSop} className="shrink-0 lg:ml-auto">
                <Plus className="w-4 h-4" /> Add SOP
              </BtnPrimary>
            )}
          </div>

          {tab !== "checklist" && (
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="flex gap-2 w-full">
                <div className="relative flex-1 min-w-0">
                  <Search className="absolute left-2.5 sm:left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-400 pointer-events-none" />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder={tab === "sops" ? "Search SOPs…" : "Search scripts…"}
                    className="w-full h-9 sm:h-10 pl-8 sm:pl-9 pr-3 rounded-xl bg-white border border-slate-200 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-slate-200 focus:border-slate-300 transition"
                  />
                </div>
                {tab === "sops" && (
                  <>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="h-9 sm:h-10 w-[6.5rem] sm:w-auto shrink-0 px-2 sm:px-3 rounded-xl bg-white border border-slate-200 text-[11px] sm:text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-200 transition"
                    >
                      {categories.map((c) => (
                        <option key={c} value={c}>{c === "all" ? "All" : c}</option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={openAddSop}
                      className="sm:hidden w-9 h-9 shrink-0 rounded-xl bg-rose-700 text-white grid place-items-center hover:bg-rose-800 transition shadow-sm"
                      aria-label="Add SOP"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </GlassCard>

      {tab === "sops" && (
        <div className="flex flex-col gap-1.5 sm:grid sm:grid-cols-1 xl:grid-cols-2 sm:gap-3">
          {filteredSops.length === 0 ? (
            <GlassCard className="xl:col-span-2 py-10 text-center">
              <p className="text-sm font-bold text-slate-600">No SOPs found</p>
              <BtnPrimary onClick={openAddSop} className="mt-4"><Plus className="w-4 h-4" /> Add SOP</BtnPrimary>
            </GlassCard>
          ) : (
            filteredSops.map((sop) => (
              <SopCard
                key={sop.id}
                sop={sop}
                onEdit={openEditSop}
              />
            ))
          )}
        </div>
      )}

      {tab === "scripts" && (
        <div className="flex flex-col gap-1.5 sm:grid sm:grid-cols-2 sm:gap-3">
          {filteredScripts.map((script) => (
            <article key={script.id} className="rounded-xl sm:rounded-2xl border border-slate-200/80 bg-white p-2.5 sm:p-4 hover:border-slate-300 transition-all min-w-0">
              <div className="flex items-start justify-between gap-2 mb-1.5 sm:mb-2">
                <div className="min-w-0 flex-1">
                  <p className="text-xs sm:text-sm font-bold text-slate-900 line-clamp-2">{script.title}</p>
                  {script.use && <p className="text-[9px] sm:text-[10px] text-slate-500 mt-0.5 line-clamp-1">Use: {script.use}</p>}
                </div>
                <span className="shrink-0 text-[7px] sm:text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded border bg-slate-50 text-slate-600 border-slate-200">
                  {script.type === "standalone" ? "Tpl" : "SOP"}
                </span>
              </div>
              <p className="text-[10px] sm:text-xs text-slate-700 leading-relaxed whitespace-pre-wrap line-clamp-2 sm:line-clamp-4 italic">
                &ldquo;{script.body}&rdquo;
              </p>
              <div className="flex gap-1.5 sm:gap-2 mt-2 sm:mt-3 pt-2 sm:pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => copyScript(script.body)}
                  className="inline-flex items-center justify-center gap-1 flex-1 py-1.5 sm:py-1.5 px-2 sm:px-3 rounded-lg sm:rounded-xl text-[10px] sm:text-[11px] font-semibold border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition min-h-[36px] sm:min-h-0"
                >
                  <Copy className="w-3 h-3 sm:w-3.5 sm:h-3.5" /> Copy
                </button>
                <button
                  type="button"
                  onClick={() => openEditScript(script)}
                  className="inline-flex items-center justify-center gap-1 flex-1 py-1.5 sm:py-1.5 px-2 sm:px-3 rounded-lg sm:rounded-xl text-[10px] sm:text-[11px] font-semibold border border-rose-700 bg-rose-700 text-white hover:bg-rose-800 transition min-h-[36px] sm:min-h-0"
                >
                  <Pencil className="w-3 h-3 sm:w-3.5 sm:h-3.5" /> Edit
                </button>
              </div>
            </article>
          ))}
        </div>
      )}

      {tab === "cross" && (
        <div className="flex flex-col gap-1.5 sm:grid sm:grid-cols-2 xl:grid-cols-3 sm:gap-3">
          {crossItems.map((x) => (
            <GlassCard key={`${x.product}-${x.crossTo}`} className="p-2.5 sm:p-4 min-w-0">
              <div className="flex items-start gap-2">
                <p className="text-xl sm:text-2xl shrink-0">{x.icon}</p>
                <div className="min-w-0 flex-1">
                  <p className="text-xs sm:text-sm font-bold text-slate-900 truncate">{x.product}</p>
                  <p className="text-[10px] sm:text-[11px] text-slate-500 mt-0.5 truncate">{x.categories}</p>
                  <div className="mt-1.5 sm:mt-2">
                    <Badge tone="info">→ {x.crossTo}</Badge>
                  </div>
                  {x.pitch && <p className="text-[10px] sm:text-xs text-slate-600 mt-1.5 sm:mt-2 leading-snug line-clamp-2 sm:line-clamp-none">{x.pitch}</p>}
                  <p className="text-[9px] sm:text-xs font-bold text-emerald-600 mt-1.5 sm:mt-2">{x.success}% · {x.deals} sold</p>
                </div>
              </div>
            </GlassCard>
          ))}
        </div>
      )}

      {tab === "checklist" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
          {[
            { title: "Morning Checklist", short: "Morning", items: EMP_SOP_CHECKLIST.morning },
            { title: "End-of-Day Checklist", short: "EOD", items: EMP_SOP_CHECKLIST.evening },
          ].map((group) => (
            <GlassCard key={group.title} className="p-2.5 sm:p-4">
              <p className="text-xs sm:text-sm font-black text-slate-900 mb-2 sm:mb-3">
                <span className="sm:hidden">{group.short}</span>
                <span className="hidden sm:inline">{group.title}</span>
              </p>
              <div className="space-y-1.5 sm:space-y-2">
                {group.items.map((item, i) => {
                  const key = `${group.title}-${i}`;
                  const checked = !!checks[key];
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => toggleCheck(key)}
                      className={`w-full text-left flex items-center gap-2 sm:gap-3 p-2.5 sm:p-3 rounded-lg sm:rounded-xl border transition ${
                        checked ? "bg-slate-50 border-slate-200" : "bg-white border-slate-100 hover:border-slate-200"
                      }`}
                    >
                      <div className={`w-4 h-4 sm:w-5 sm:h-5 rounded-md border-2 grid place-items-center shrink-0 ${checked ? "bg-slate-800 border-slate-800 text-white" : "border-slate-300"}`}>
                        {checked && <Check className="w-2.5 h-2.5 sm:w-3.5 sm:h-3.5 stroke-[3]" />}
                      </div>
                      <span className={`text-[11px] sm:text-sm font-semibold leading-snug ${checked ? "text-slate-500 line-through" : "text-slate-700"}`}>{item}</span>
                    </button>
                  );
                })}
              </div>
            </GlassCard>
          ))}
        </div>
      )}

      <SopDrawer
        open={sopDrawerOpen}
        mode={sopDrawerMode}
        form={sopForm}
        setForm={setSopForm}
        onClose={() => setSopDrawerOpen(false)}
        onSave={saveSop}
      />

      <ScriptDrawer
        open={scriptDrawerOpen}
        form={scriptForm}
        setForm={setScriptForm}
        onClose={() => setScriptDrawerOpen(false)}
        onSave={saveScript}
      />
    </div>
  );
}
