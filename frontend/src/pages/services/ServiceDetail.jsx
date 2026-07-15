import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft, Share2, Download, Pencil, Bot, Database, Target, Briefcase, Code,
  Users, DollarSign, TrendingUp, CheckCircle2,
} from "lucide-react";
import toast from "react-hot-toast";
import { GlassCard, StatCard, Badge } from "../../components/Primitives.jsx";
import { formatServiceMoney, formatServicePriceLabel, serviceBadgeTone } from "../../data/servicesMock.js";
import { apiGet } from "../../lib/api.js";

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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await apiGet("/api/services", { skipCache: true, cacheTtl: 0 });
        const found = (res?.services || []).find((s) => String(s.id) === String(serviceId)) || null;
        if (!cancelled) setService(found);
      } catch {
        if (!cancelled) setService(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
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
    </div>
  );
}
