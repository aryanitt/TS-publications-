import { Phone, Mail, Calendar, User, History, ArrowRightLeft } from "lucide-react";
import { Drawer, Badge } from "../Primitives.jsx";
import { normalizeSource, getLeadEmployeeName, getAssignmentState } from "../../lib/leadAssignment.js";
import CashCollectedPanel from "../CashCollectedPanel.jsx";

const SOURCE_LABELS = {
  meta_ads: { label: "Meta Ads", tone: "info" },
  google_ads: { label: "Google Ads", tone: "warning" },
  website: { label: "Website", tone: "success" },
  whatsapp: { label: "WhatsApp", tone: "success" },
  manual: { label: "Manual", tone: "muted" },
  api: { label: "API", tone: "primary" },
  n8n: { label: "N8N", tone: "info" },
};

function SourceBadge({ lead }) {
  const key = normalizeSource(lead.source || lead.form_name);
  const cfg = SOURCE_LABELS[key] || { label: lead.source || "Unknown", tone: "muted" };
  return <Badge tone={cfg.tone}>{cfg.label}</Badge>;
}

export default function LeadDetailDrawer({
  open,
  onClose,
  lead,
  assignment,
  employees,
  onAssign,
  auditEntries = [],
}) {
  if (!lead) return null;

  const employeeName = getLeadEmployeeName(lead, getAssignmentState()) || assignment?.employeeName || "";

  const field = (label, value, icon) => (
    <div className="flex items-start gap-3 py-2.5 border-b border-rose-50 last:border-0">
      {icon && (
        <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 grid place-items-center shrink-0">
          {icon}
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</p>
        <p className="text-sm font-semibold text-slate-800 mt-0.5 break-words">{value || "—"}</p>
      </div>
    </div>
  );

  return (
    <Drawer open={open} onClose={onClose} title="Lead Details">
      <div className="space-y-5">
        <div className="rounded-2xl border border-rose-100 bg-gradient-to-br from-white to-rose-50/30 p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-lg font-bold text-slate-900">{lead.lead_name || "Unnamed Lead"}</h3>
              <p className="text-sm text-slate-500 mt-0.5">{lead.company_name || "No company"}</p>
            </div>
            <SourceBadge lead={lead} />
          </div>
          <div className="flex flex-wrap gap-2 mt-3">
            <Badge tone={assignment ? "success" : "warning"}>
              {assignment ? `Assigned · ${assignment.employeeName}` : "Unassigned"}
            </Badge>
            {lead.pipeline_stage && <Badge tone="info">{lead.pipeline_stage}</Badge>}
            {lead.temperature && <Badge tone="primary">{lead.temperature}</Badge>}
          </div>
        </div>

        <div className="rounded-2xl border border-rose-100 bg-white p-4">
          <p className="text-xs font-bold text-rose-700 mb-2">Contact & Pipeline</p>
          {field("Phone", lead.phone || lead.phone_number, <Phone size={14} />)}
          {field("Email", lead.email, <Mail size={14} />)}
          {field("City", lead.city, null)}
          {field("Employee Name", employeeName, <User size={14} />)}
          {field("Owner", employeeName, <User size={14} />)}
          {field("Follow-up", lead.next_followup_date, <Calendar size={14} />)}
          {field("Expected Revenue", lead.expected_revenue ? `₹${Number(lead.expected_revenue).toLocaleString("en-IN")}` : "—", null)}
          {field("Service / Requirements", lead.requirements || "—", null)}
        </div>

        <CashCollectedPanel
          leadId={lead.id}
          leadName={lead.lead_name}
          employeeId={lead.assigned_to || lead.assignedTo?.id || lead.assigneeId}
        />

        <div className="rounded-2xl border border-rose-100 bg-white p-4">
          <p className="text-xs font-bold text-rose-700 mb-3 flex items-center gap-2">
            <ArrowRightLeft size={14} /> Quick Assign
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto">
            {employees.map((emp) => (
              <button
                key={emp.id}
                type="button"
                onClick={() => onAssign(lead, emp)}
                className="text-left px-3 py-2 rounded-xl border border-rose-100 hover:border-rose-300 hover:bg-rose-50 transition text-sm font-semibold text-slate-700"
              >
                <User size={12} className="inline mr-1 text-rose-500" />
                {emp.name}
              </button>
            ))}
          </div>
        </div>

        {auditEntries.length > 0 && (
          <div className="rounded-2xl border border-rose-100 bg-white p-4">
            <p className="text-xs font-bold text-rose-700 mb-3 flex items-center gap-2">
              <History size={14} /> Assignment History
            </p>
            <ul className="space-y-2 max-h-36 overflow-y-auto">
              {auditEntries.map((e) => (
                <li key={e.id} className="text-[11px] text-slate-600 border-l-2 border-rose-200 pl-3">
                  <span className="font-bold text-slate-800 capitalize">{e.action}</span>
                  {" · "}
                  {e.employeeName || "—"}
                  <span className="block text-slate-400 mt-0.5">
                    {new Date(e.at).toLocaleString()} · {e.method}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </Drawer>
  );
}
