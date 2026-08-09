import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft, Share2, Download, Pencil, Trash2, Bot, Database, Target, Briefcase, Code,
  Users, DollarSign, TrendingUp, CheckCircle2,
} from "lucide-react";
import toast from "react-hot-toast";
import { GlassCard, StatCard, Badge } from "../../components/Primitives.jsx";
import { formatServiceMoney, formatServicePriceLabel, serviceBadgeTone } from "../../data/servicesMock.js";
import { apiGet, apiDelete } from "../../lib/api.js";
import { extractLeadService, cleanServiceName, leadBelongsToService } from "../../lib/servicesRegistry.js";

const ICON_MAP = {
  bot: Bot,
  database: Database,
  target: Target,
  briefcase: Briefcase,
  code: Code,
};

export default function ServiceDetail() {
  const { serviceId } = useParams();
  const navigate = useNavigate();
  const [service, setService] = useState(null);
  const [serviceLeads, setServiceLeads] = useState([]);
  const [loading, setLoading] = useState(true);

  const handleDeleteService = async () => {
    if (!service) return;
    if (!window.confirm(`Are you sure you want to delete the service "${service.name}"?`)) return;
    try {
      await apiDelete(`/api/services/${service.id}`);
      toast.success(`Service "${service.name}" deleted successfully`);
      navigate("/services");
    } catch (err) {
      toast.error(`Failed to delete service: ${err.message || String(err)}`);
    }
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const [svcRes, leadsRes] = await Promise.allSettled([
          apiGet("/api/services", { skipCache: true, cacheTtl: 0 }),
          apiGet("/api/v1/leads?limit=500&page=1"),
        ]);
        
        const servicesList = svcRes.status === "fulfilled" && Array.isArray(svcRes.value?.services)
          ? svcRes.value.services
          : [];

        const leadsList = leadsRes.status === "fulfilled"
          ? (Array.isArray(leadsRes.value) ? leadsRes.value : (leadsRes.value?.data || leadsRes.value?.leads || []))
          : [];

        const cleanParam = String(serviceId || "").toLowerCase().replace(/^svc-/, "").replace(/[^a-z0-9]+/g, "-");

        let found = servicesList.find((s) => {
          const sIdClean = String(s.id || "").toLowerCase().replace(/^svc-/, "").replace(/[^a-z0-9]+/g, "-");
          const sNameClean = String(s.name || "").toLowerCase().replace(/[^a-z0-9]+/g, "-");
          return String(s.id) === String(serviceId) ||
            sIdClean === cleanParam ||
            sNameClean === cleanParam ||
            String(s.name || "").toLowerCase() === String(serviceId).toLowerCase();
        }) || null;

        if (!found && serviceId) {
          let matchedName = "";
          for (const l of leadsList) {
            const extracted = extractLeadService(l);
            if (extracted) {
              const slug = extracted.toLowerCase().replace(/[^a-z0-9]+/g, "-");
              if (slug === cleanParam || extracted.toLowerCase() === String(serviceId).toLowerCase()) {
                matchedName = extracted;
                break;
              }
            }
          }

          if (!matchedName && cleanParam) {
            matchedName = cleanParam
              .split("-")
              .filter(Boolean)
              .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
              .join(" ");
          }

          if (matchedName) {
            found = {
              id: serviceId,
              name: matchedName,
              category: "general",
              categoryLabel: "General Services",
              status: "ACTIVE",
              badge: "POPULAR",
              description: `Auto-created service offering for ${matchedName}`,
              revenue: 0,
              leads: 0,
              converted: 0,
              convRate: 0,
              priceNum: 0,
              price: "Custom",
              icon: "briefcase",
            };
          }
        }

        if (found) {
          const matching = leadsList.filter((l) => leadBelongsToService(l, found.name));
          found.leads = matching.length > 0 ? matching.length : Number(found.leads) || 0;
          found.converted = matching.length > 0
            ? matching.filter((l) => String(l.status || "").toLowerCase().includes("converted") || String(l.status || "").toLowerCase().includes("payment")).length
            : Number(found.converted) || 0;
          found.revenue = matching.length > 0
            ? matching.reduce((acc, l) => acc + (Number(l.expectedRevenue || l.expected_revenue) || 0), 0)
            : Number(found.revenue) || 0;
          found.convRate = found.leads > 0 ? Math.round((found.converted / found.leads) * 100) : Number(found.convRate) || 0;

          if (!cancelled) {
            setService(found);
            setServiceLeads(matching);
          }
        } else {
          if (!cancelled) {
            setService(null);
            setServiceLeads([]);
          }
        }
      } catch (err) {
        console.error("Error loading service details:", err);
        if (!cancelled) setService(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [serviceId]);

  if (loading) {
    return (
      <GlassCard className="p-10 text-center">
        <p className="text-sm text-slate-400">Loading service…</p>
      </GlassCard>
    );
  }

  if (!service) {
    return (
      <GlassCard className="p-10 text-center">
        <p className="text-sm text-slate-600">Service not found.</p>
        <Link to="/services" className="text-xs font-bold text-rose-700 mt-2 inline-block">Back to Services</Link>
      </GlassCard>
    );
  }

  const Icon = ICON_MAP[service.icon] || Bot;

  return (
    <div className="space-y-4 page-shell min-w-0 max-w-5xl">

      <GlassCard className="p-3.5 sm:p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between min-w-0">
          <div className="flex items-center gap-3 min-w-0">
            <Link
              to="/services"
              className="w-9 h-9 rounded-xl border border-rose-100 bg-white text-rose-700 grid place-items-center shrink-0 hover:bg-rose-50 transition"
              aria-label="Back to catalog"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 grid place-items-center shrink-0">
              <Icon className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-base sm:text-lg font-black text-slate-900 truncate">{service.name}</h1>
                <Badge tone={serviceBadgeTone(service.badge)}>{service.badge}</Badge>
                <Badge tone={service.status === "ACTIVE" ? "success" : "muted"}>{service.status}</Badge>
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5 truncate">
                {service.categoryLabel} · {formatServicePriceLabel(service.price, service.priceNum)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 pl-12 sm:pl-0">
            <button
              type="button"
              onClick={() => toast.success("Link copied")}
              className="h-9 px-3 rounded-xl border border-rose-200 bg-white text-xs font-bold text-rose-800 hover:bg-rose-50 inline-flex items-center gap-1.5 transition"
            >
              <Share2 className="w-3.5 h-3.5 shrink-0" />
              <span className="hidden sm:inline">Share</span>
            </button>
            <button
              type="button"
              onClick={() => toast.success("Export started")}
              className="h-9 px-3 rounded-xl border border-rose-200 bg-white text-xs font-bold text-rose-800 hover:bg-rose-50 inline-flex items-center gap-1.5 transition"
            >
              <Download className="w-3.5 h-3.5 shrink-0" />
              <span className="hidden sm:inline">Export</span>
            </button>
            <button
              type="button"
              onClick={() => navigate(`/services/${service.id}/edit`)}
              className="h-9 px-3 rounded-xl bg-rose-700 text-white text-xs font-bold hover:bg-rose-800 inline-flex items-center gap-1.5 shadow-sm transition"
            >
              <Pencil className="w-3.5 h-3.5 shrink-0" />
              Edit
            </button>
            <button
              type="button"
              onClick={handleDeleteService}
              className="h-9 px-3 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 text-xs font-bold inline-flex items-center gap-1.5 border border-red-200 transition"
            >
              <Trash2 className="w-3.5 h-3.5 shrink-0" />
              <span className="hidden sm:inline">Delete</span>
            </button>
          </div>
        </div>
      </GlassCard>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
        <StatCard label="Total Leads" value={service.leads >= 1000 ? `${(service.leads / 1000).toFixed(1)}k` : String(service.leads)} icon={Users} iconBg="bg-rose-50" iconColor="text-rose-600" hover={false} />
        <StatCard label="Converted" value={String(service.converted)} icon={CheckCircle2} iconBg="bg-emerald-50" iconColor="text-emerald-600" hover={false} />
        <StatCard label="Revenue" value={formatServiceMoney(service.revenue)} icon={DollarSign} iconBg="bg-sky-50" iconColor="text-sky-600" hover={false} />
        <StatCard label="Conv. Rate" value={`${service.convRate}%`} icon={TrendingUp} iconBg="bg-amber-50" iconColor="text-amber-600" hover={false} />
      </div>

      <GlassCard className="p-4 sm:p-5">
        <h3 className="text-[11px] font-extrabold text-rose-700 uppercase tracking-wider mb-2">
          Service Architecture & Features
        </h3>
        <p className="text-sm text-slate-600 leading-relaxed mb-4">{service.description}</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {(service.features || []).map((f) => (
            <div key={f.title} className="rounded-xl border border-rose-100 bg-white p-3.5">
              <p className="text-xs font-bold text-slate-900">{f.title}</p>
              <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </GlassCard>

      <GlassCard className="p-4 sm:p-5">
        <h3 className="text-[11px] font-extrabold text-rose-700 uppercase tracking-wider mb-3">Service Tiers</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
          {(service.tiers || []).map((tier) => (
            <div
              key={tier.name}
              className={`rounded-xl border p-3.5 flex flex-col ${
                tier.popular ? "border-rose-400 bg-rose-50/40 ring-1 ring-rose-200" : "border-rose-100 bg-white"
              }`}
            >
              {tier.popular && (
                <span className="self-start text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-rose-700 text-white mb-2">
                  Most Popular
                </span>
              )}
              <p className="text-sm font-black text-slate-900">{tier.name}</p>
              <p className="text-base font-black text-rose-700 mt-0.5">{formatServicePriceLabel(tier.price)}</p>
              <ul className="mt-2.5 space-y-1.5 flex-1">
                {tier.features.map((feat) => (
                  <li key={feat} className="flex items-start gap-2 text-[11px] text-slate-600">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                    {feat}
                  </li>
                ))}
              </ul>
              <button
                type="button"
                className={`mt-3 w-full py-2 rounded-xl text-xs font-bold transition ${
                  tier.popular ? "bg-rose-700 text-white hover:bg-rose-800" : "border border-rose-200 text-rose-800 hover:bg-rose-50"
                }`}
              >
                Select Plan
              </button>
            </div>
          ))}
        </div>
      </GlassCard>

      <GlassCard className="p-4 sm:p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-[11px] font-extrabold text-rose-700 uppercase tracking-wider">
            Leads Under This Service ({serviceLeads.length})
          </h3>
          <Link to="/leads" className="text-xs font-bold text-rose-600 hover:text-rose-800">
            View All Leads →
          </Link>
        </div>

        {serviceLeads.length === 0 ? (
          <p className="text-xs text-slate-500 py-4 text-center">No leads currently assigned to this service.</p>
        ) : (
          <div className="max-h-[350px] overflow-y-auto overflow-x-auto border border-rose-100 rounded-xl">
            <table className="w-full text-left text-xs">
              <thead className="sticky top-0 bg-white shadow-xs z-10">
                <tr className="border-b border-rose-100 text-slate-400 font-extrabold text-[10px] uppercase">
                  <th className="py-2.5 px-3">Lead Name</th>
                  <th className="py-2.5 px-3">Phone</th>
                  <th className="py-2.5 px-3">Stage / Status</th>
                  <th className="py-2.5 px-3">Assigned To</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-rose-50">
                {serviceLeads.map((lead, idx) => (
                  <tr key={lead.id || idx} className="hover:bg-rose-50/50 transition">
                    <td className="py-2.5 px-3 font-bold text-slate-900">
                      {lead.leadName || lead.lead_name || lead.name || "Unknown Lead"}
                    </td>
                    <td className="py-2.5 px-3 text-slate-600 font-mono">
                      {lead.phone || lead.phone_number || "—"}
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="inline-block px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 text-[10px] font-bold">
                        {lead.status || lead.pipelineStage || lead.pipeline_stage || "New Lead"}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-slate-600 font-medium">
                      {typeof lead.assignedTo === "object" ? lead.assignedTo?.name : (lead.assignee_name || lead.employeeName || "Unassigned")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </GlassCard>
    </div>
  );
}
