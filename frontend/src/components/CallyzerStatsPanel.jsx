import { Phone } from "lucide-react";
import { GlassCard } from "./Primitives.jsx";

function Metric({ label, value, sub, tone = "default" }) {
  const tones = {
    default: "text-slate-900",
    green: "text-emerald-700",
    orange: "text-orange-600",
    red: "text-rose-600",
    pink: "text-pink-600",
  };

  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50/70 px-3 py-2.5 min-w-0">
      <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400 truncate">{label}</p>
      <p className={`text-lg sm:text-xl font-black tabular-nums mt-0.5 ${tones[tone] || tones.default}`}>{value}</p>
      {sub ? <p className="text-[10px] text-slate-500 mt-0.5 truncate">{sub}</p> : null}
    </div>
  );
}

export default function CallyzerStatsPanel({
  stats,
  loading,
  configured,
  message,
  title = "Callyzer Call Analytics",
  subtitle,
  compact = false,
}) {
  if (!configured) return null;

  if (loading && !stats) {
    return (
      <GlassCard className="p-4">
        <p className="text-sm text-slate-500">Loading Callyzer call data…</p>
      </GlassCard>
    );
  }

  if (!stats) {
    return (
      <GlassCard className="p-4 border-amber-100 bg-amber-50/30">
        <p className="text-xs font-bold text-amber-900">Callyzer</p>
        <p className="text-sm text-amber-800 mt-1">
          {message || "No Callyzer stats yet. Set the employee Callyser ID (e.g. 91-9462265230) in Team settings."}
        </p>
      </GlassCard>
    );
  }

  const gridClass = compact
    ? "grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-2"
    : "grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-2 sm:gap-3";

  return (
    <GlassCard className="p-3 sm:p-4 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-rose-600 flex items-center gap-1">
            <Phone className="w-3.5 h-3.5" /> {title}
          </p>
          {subtitle && <p className="text-[11px] text-slate-500 mt-0.5">{subtitle}</p>}
          {stats.empName && (
            <p className="text-xs font-semibold text-slate-700 mt-1">
              {stats.empName}
              {stats.empNumber ? ` · +${stats.empCountryCode || "91"}-${stats.empNumber}` : ""}
            </p>
          )}
        </div>
        <span className="text-[10px] font-bold text-slate-400 uppercase shrink-0">Auto-sync · Callyzer</span>
      </div>

      <div className={gridClass}>
        <Metric label="Total Calls" value={stats.totalCalls} sub={stats.totalDuration} />
        <Metric label="Connected" value={stats.connectedCalls} tone="green" sub={`Working ${stats.workingHours}`} />
        <Metric label="Incoming" value={stats.incomingCalls} tone="green" sub={stats.incomingDuration} />
        <Metric label="Outgoing" value={stats.outgoingCalls} tone="orange" sub={stats.outgoingDuration} />
        <Metric label="Missed" value={stats.missedCalls} tone="red" />
        <Metric label="Rejected" value={stats.rejectedCalls} tone="pink" />
        <Metric label="Never Attended" value={stats.neverAttended} tone="pink" />
        <Metric label="Client No Pickup" value={stats.notPickupByClient} tone="pink" />
        <Metric label="Unique Clients" value={stats.uniqueClients} tone="default" sub="Distinct numbers" />
        <Metric label="5 Min+ Conversations" value={stats.conversations5MinPlus ?? 0} tone="green" sub={stats.conversations5MinDuration || "Connected calls ≥ 5 min"} />
      </div>

      {!compact && stats.lastCallLog?.client_name && (
        <div className="rounded-xl border border-rose-100 bg-rose-50/40 px-3 py-2 text-[11px] text-slate-600">
          <span className="font-bold text-slate-800">Last call:</span>{" "}
          {stats.lastCallLog.client_name} · {stats.lastCallLog.call_type} · {stats.lastCallLog.call_date} {stats.lastCallLog.call_time}
        </div>
      )}
    </GlassCard>
  );
}

export function CallyzerTeamTable({ stats, loading }) {
  if (loading && !stats?.length) {
    return <p className="text-sm text-slate-500 py-4">Loading team call stats from Callyzer…</p>;
  }
  if (!stats?.length) {
    return (
      <p className="text-sm text-slate-500 py-4">
        No Callyzer team stats. Map each employee&apos;s Callyser ID in Team (phone from Callyzer, e.g. 91-9462265230).
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-rose-100">
      <table className="min-w-full text-left text-[11px]">
        <thead className="bg-rose-50/60 text-slate-500 uppercase tracking-wide">
          <tr>
            <th className="px-3 py-2 font-bold">Employee</th>
            <th className="px-3 py-2 font-bold">Total</th>
            <th className="px-3 py-2 font-bold">Duration</th>
            <th className="px-3 py-2 font-bold text-emerald-700">Incoming</th>
            <th className="px-3 py-2 font-bold text-orange-600">Outgoing</th>
            <th className="px-3 py-2 font-bold text-rose-600">Missed</th>
            <th className="px-3 py-2 font-bold">Connected</th>
            <th className="px-3 py-2 font-bold">Unique Clients</th>
          </tr>
        </thead>
        <tbody>
          {stats.map((row, idx) => (
            <tr key={`${row.empNumber || row.empName}-${idx}`} className="border-t border-rose-50 hover:bg-rose-50/30">
              <td className="px-3 py-2 font-semibold text-slate-800">
                {row.empName || "—"}
                <span className="block text-[10px] text-slate-400 font-normal">
                  {row.empCode ? `Code ${row.empCode} · ` : ""}
                  {row.empNumber ? `+${row.empCountryCode || "91"}-${row.empNumber}` : ""}
                </span>
              </td>
              <td className="px-3 py-2 font-bold tabular-nums">{row.totalCalls}</td>
              <td className="px-3 py-2 tabular-nums">{row.totalDuration}</td>
              <td className="px-3 py-2 text-emerald-700 tabular-nums">{row.incomingCalls}</td>
              <td className="px-3 py-2 text-orange-600 tabular-nums">{row.outgoingCalls}</td>
              <td className="px-3 py-2 text-rose-600 tabular-nums">{row.missedCalls}</td>
              <td className="px-3 py-2 tabular-nums">{row.connectedCalls}</td>
              <td className="px-3 py-2 tabular-nums">{row.uniqueClients}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
