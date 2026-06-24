import { useEffect, useMemo, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import {
  Download, Plus, Search, Flame, ClipboardList,
  CheckCircle2, Calendar, Filter, ChevronLeft, ChevronRight as ChevronRightIcon,
  DollarSign, Clock,
} from "lucide-react";
import toast, { Toaster } from "react-hot-toast";
import AddLeadDrawer from "../../components/AddLeadDrawer.jsx";
import { GlassCard, StatCard, Badge } from "../../components/Primitives.jsx";
import {
  getFormById, getFormLeads,
  FORM_SERVICES, formatFormRevenue,
} from "../../data/formsMock.js";

const LEAD_STATUS_TONE = {
  NEW: "info",
  HOT: "danger",
  QUALIFIED: "purple",
  CONTACTED: "warning",
  CONVERTED: "success",
};

const PAGE_SIZE = 8;

function mapLeadToFormRow(newLead, fallbackService) {
  const revenue = Number(newLead.expected_revenue) || 0;
  return {
    id: newLead.id ?? newLead._id ?? Date.now(),
    name: newLead.lead_name || newLead.name || "Unknown",
    email: newLead.email || "",
    service: newLead.interested_service || newLead.service || fallbackService || "—",
    budget: revenue,
    status: "NEW",
    agent: "Unassigned",
    revenue,
    created: (newLead.created_at || newLead.created || new Date().toISOString()).split("T")[0],
  };
}

export default function FormLeads() {
  const { formId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const form = getFormById(formId);
  const baseLeads = useMemo(() => getFormLeads(formId), [formId]);
  const [extraLeads, setExtraLeads] = useState([]);
  const allLeads = useMemo(() => [...extraLeads, ...baseLeads], [extraLeads, baseLeads]);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [serviceFilter, setServiceFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [addOpen, setAddOpen] = useState(false);

  useEffect(() => {
    if (searchParams.get("action") === "addLead") setAddOpen(true);
  }, [searchParams]);

  const handleAddClose = (newLead) => {
    if (newLead) {
      setExtraLeads((prev) => [mapLeadToFormRow(newLead, form?.service), ...prev]);
      toast.success("Lead added to form");
    }
    setAddOpen(false);
    if (searchParams.get("action")) {
      setSearchParams({}, { replace: true });
    }
  };

  const filtered = useMemo(() => {
    return allLeads.filter((l) => {
      if (statusFilter !== "all" && l.status !== statusFilter) return false;
      if (serviceFilter !== "all" && l.service !== serviceFilter) return false;
      const q = search.toLowerCase();
      if (q && !l.name.toLowerCase().includes(q) && !l.email.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [allLeads, search, statusFilter, serviceFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageLeads = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const kpis = useMemo(() => {
    const hot = allLeads.filter((l) => l.status === "HOT").length;
    const assigned = allLeads.filter((l) => l.agent !== "Unassigned").length;
    const pending = allLeads.filter((l) => l.status === "NEW").length;
    const converted = allLeads.filter((l) => l.status === "CONVERTED").length;
    const revenue = allLeads.reduce((s, l) => s + l.revenue, 0);
    return {
      total: allLeads.length,
      hot,
      assigned,
      assignedPct: allLeads.length ? Math.round((assigned / allLeads.length) * 100) : 0,
      pending,
      converted,
      convertedPct: allLeads.length ? Math.round((converted / allLeads.length) * 100) : 0,
      revenue,
    };
  }, [allLeads]);

  if (!form) {
    return (
      <GlassCard className="p-10 text-center">
        <p className="text-sm text-slate-600">Form not found.</p>
        <Link to="/forms" className="text-xs font-bold text-rose-700 mt-2 inline-block">Back to Forms</Link>
      </GlassCard>
    );
  }

  return (
    <div className="space-y-5 page-shell min-w-0">
      <Toaster position="top-right" />

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-2 sm:gap-3">
        <StatCard label="Total Leads" value={String(kpis.total)} change="+12%" sub="this month" icon={ClipboardList} iconBg="bg-rose-50" iconColor="text-rose-600" hover={false} />
        <StatCard
          label="Hot Leads"
          value={String(kpis.hot)}
          change="Priority"
          sub="needs action"
          icon={Flame}
          iconBg="bg-orange-50"
          iconColor="text-orange-600"
          changeTone="danger"
          className="border-rose-200"
          hover={false}
        />
        <StatCard label="Assigned" value={String(kpis.assigned)} change={`${kpis.assignedPct}%`} sub="of total" icon={CheckCircle2} iconBg="bg-emerald-50" iconColor="text-emerald-600" hover={false} />
        <StatCard label="Pending" value={String(kpis.pending)} icon={Clock} iconBg="bg-amber-50" iconColor="text-amber-600" hover={false} />
        <StatCard label="Converted" value={String(kpis.converted)} change={`${kpis.convertedPct}%`} sub="rate" icon={CheckCircle2} iconBg="bg-sky-50" iconColor="text-sky-600" hover={false} />
        <StatCard label="Revenue Pot." value={formatFormRevenue(kpis.revenue)} change="Pipeline" sub="potential" icon={DollarSign} iconBg="bg-rose-50" iconColor="text-rose-600" hover={false} />
      </div>

      <div className="space-y-4">
          <GlassCard className="p-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between lg:gap-4">
              <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-2 sm:gap-3 flex-1 min-w-0">
                <div className="relative w-full sm:flex-1 sm:min-w-[200px] sm:max-w-[320px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-rose-300 pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Filter by name or contact..."
                    value={search}
                    onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                    className="w-full h-10 pl-9 pr-3 rounded-xl border border-rose-100 bg-white text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-rose-400"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2 sm:contents">
                  <select
                    value={statusFilter}
                    onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
                    className="w-full sm:w-auto sm:min-w-[118px] h-10 px-3 rounded-xl border border-rose-100 text-xs font-bold text-rose-800 bg-white outline-none focus:border-rose-400"
                  >
                    <option value="all">All Status</option>
                    {["NEW", "HOT", "QUALIFIED", "CONTACTED", "CONVERTED"].map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                  <select
                    value={serviceFilter}
                    onChange={(e) => { setServiceFilter(e.target.value); setPage(1); }}
                    className="w-full sm:w-auto sm:min-w-[128px] h-10 px-3 rounded-xl border border-rose-100 text-xs font-bold text-rose-800 bg-white outline-none focus:border-rose-400"
                  >
                    {FORM_SERVICES.map((s) => (
                      <option key={s.id} value={s.id}>{s.label}</option>
                    ))}
                  </select>
                </div>
                <div className="hidden md:flex items-center gap-2 shrink-0">
                  <button type="button" className="w-10 h-10 rounded-xl border border-rose-100 bg-white grid place-items-center text-slate-500 hover:bg-rose-50 transition">
                    <Calendar className="w-4 h-4" />
                  </button>
                  <button type="button" className="w-10 h-10 rounded-xl border border-rose-100 bg-white grid place-items-center text-slate-500 hover:bg-rose-50 transition">
                    <Filter className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => toast.success("Export started")}
                  className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 h-10 px-3.5 rounded-xl border border-rose-200 bg-white text-rose-800 text-xs font-bold hover:bg-rose-50 transition whitespace-nowrap"
                >
                  <Download className="w-3.5 h-3.5 shrink-0" />
                  Export Leads
                </button>
                <button
                  type="button"
                  onClick={() => setAddOpen(true)}
                  className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 h-10 px-3.5 rounded-xl bg-rose-700 text-white text-xs font-bold hover:bg-rose-800 transition whitespace-nowrap shadow-sm"
                >
                  <Plus className="w-3.5 h-3.5 shrink-0" />
                  Manual Lead
                </button>
              </div>
            </div>
          </GlassCard>

          <GlassCard className="overflow-hidden">
            <div className="responsive-table-mobile space-y-3 p-4 lg:hidden">
              {pageLeads.map((lead) => (
                <div key={lead.id} className="rounded-xl border border-rose-100 p-4 bg-white">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-9 h-9 rounded-full bg-rose-100 text-rose-700 text-xs font-bold grid place-items-center">
                      {lead.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-900">{lead.name}</p>
                      <p className="text-[10px] text-slate-500">{lead.email}</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 text-xs">
                    <Badge tone={LEAD_STATUS_TONE[lead.status] || "muted"}>{lead.status}</Badge>
                    <span className="text-slate-600">{lead.service}</span>
                    <span className="font-bold text-slate-800">{formatFormRevenue(lead.revenue)}</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="responsive-table-desktop overflow-x-auto">
              <table className="w-full text-left min-w-[720px]">
                <thead>
                  <tr className="border-b border-rose-50 bg-[#fffbfb]">
                    {["Lead Name", "Service & Budget", "Status", "Agent", "Revenue", "Created"].map((h) => (
                      <th key={h} className="px-4 py-3 text-[9px] font-bold text-slate-400 uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-rose-50">
                  {pageLeads.map((lead) => (
                    <tr key={lead.id} className="hover:bg-rose-50/30">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-rose-100 text-rose-700 text-[10px] font-bold grid place-items-center shrink-0">
                            {lead.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                          </div>
                          <div>
                            <p className="text-xs font-bold text-slate-900">{lead.name}</p>
                            <p className="text-[10px] text-slate-500">{lead.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs">
                        <p className="font-semibold text-slate-800">{lead.service}</p>
                        <p className="text-slate-500">{formatFormRevenue(lead.budget)}</p>
                      </td>
                      <td className="px-4 py-3">
                        <Badge tone={LEAD_STATUS_TONE[lead.status] || "muted"}>{lead.status}</Badge>
                      </td>
                      <td className="px-4 py-3 text-xs font-semibold text-slate-700">{lead.agent}</td>
                      <td className="px-4 py-3 text-xs font-bold text-slate-800">{formatFormRevenue(lead.revenue)}</td>
                      <td className="px-4 py-3 text-xs text-slate-500">{lead.created}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-rose-50">
              <p className="text-[11px] text-slate-500">
                Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length} leads
              </p>
              <div className="flex items-center gap-1">
                <button type="button" disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="w-8 h-8 rounded-lg border border-slate-200 disabled:opacity-40 grid place-items-center">
                  <ChevronLeft className="w-4 h-4" />
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).slice(0, 5).map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setPage(n)}
                    className={`w-8 h-8 rounded-lg text-xs font-bold ${page === n ? "bg-rose-700 text-white" : "border border-slate-200 text-slate-600"}`}
                  >
                    {n}
                  </button>
                ))}
                <button type="button" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} className="w-8 h-8 rounded-lg border border-slate-200 disabled:opacity-40 grid place-items-center">
                  <ChevronRightIcon className="w-4 h-4" />
                </button>
              </div>
            </div>
          </GlassCard>
      </div>

      <AddLeadDrawer
        open={addOpen}
        onClose={handleAddClose}
        showToast={(msg, type) => (type === "error" ? toast.error(msg) : toast.success(msg))}
        title="Add Manual Lead"
        subtitle={`${form.name} · Source: ${form.source}`}
      />
    </div>
  );
}
