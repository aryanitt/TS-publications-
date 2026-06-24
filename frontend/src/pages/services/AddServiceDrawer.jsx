import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Drawer } from "../../components/Primitives.jsx";
import { SERVICE_CATEGORIES } from "../../data/servicesMock.js";

const CATEGORY_OPTIONS = SERVICE_CATEGORIES.filter((c) => c.id !== "all");

const BADGE_OPTIONS = ["ACTIVE", "POPULAR", "ENTERPRISE"];

const EMPTY_FORM = {
  name: "",
  category: "ai",
  description: "",
  price: "",
  status: "ACTIVE",
  badge: "ACTIVE",
  tag1: "",
  tag2: "",
};

function slugify(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || `service-${Date.now()}`;
}

function parsePriceNum(price) {
  const n = Number(String(price).replace(/[^0-9.]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

export function buildServiceFromForm(form) {
  const categoryMeta = CATEGORY_OPTIONS.find((c) => c.id === form.category);
  const iconMap = { ai: "bot", crm: "database", leadgen: "target", consulting: "briefcase", dev: "code" };
  const tags = [form.tag1, form.tag2].filter(Boolean);

  return {
    id: slugify(form.name),
    name: form.name.trim(),
    category: form.category,
    categoryLabel: categoryMeta?.label?.replace(/^Category: /, "") || categoryMeta?.label || "General",
    status: form.status,
    badge: form.badge,
    description: form.description.trim(),
    tags: tags.length ? tags : ["NEW SERVICE"],
    revenue: 0,
    clients: 0,
    leads: 0,
    converted: 0,
    convRate: 0,
    price: form.price.trim(),
    priceNum: parsePriceNum(form.price),
    icon: iconMap[form.category] || "bot",
    features: [{ title: "Core Offering", desc: form.description.trim() }],
    tiers: [
      { name: "Starter", price: form.price.trim() || "Custom", features: ["Standard scope"], popular: true },
    ],
    insights: ["New service — track performance after launch."],
    delivery: [{ step: "Setup", status: "pending" }],
    team: [],
  };
}

export default function AddServiceDrawer({ open, onClose }) {
  const [form, setForm] = useState(EMPTY_FORM);

  useEffect(() => {
    if (open) setForm(EMPTY_FORM);
  }, [open]);

  const update = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));

  const handleSaveDraft = () => {
    if (!form.name.trim()) {
      toast.error("Enter a service name");
      return;
    }
    toast.success("Service saved as draft");
  };

  const handlePublish = () => {
    if (!form.name.trim()) {
      toast.error("Enter a service name");
      return;
    }
    if (!form.description.trim()) {
      toast.error("Add a short description");
      return;
    }
    if (!form.price.trim()) {
      toast.error("Enter a price");
      return;
    }
    onClose?.(buildServiceFromForm(form));
  };

  const inputClass =
    "w-full h-10 px-3 rounded-xl border border-rose-100 bg-white text-sm font-medium text-slate-800 outline-none focus:border-rose-400";
  const labelClass = "text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5";

  return (
    <Drawer open={open} onClose={() => onClose?.()} title="Add Service" width="drawer-panel">
      <p className="text-xs text-slate-500 mb-4 pb-3 border-b border-rose-50">
        Create a new productized offering for your catalog
      </p>

      <div className="flex gap-2 mb-5">
        <button
          type="button"
          onClick={handleSaveDraft}
          className="flex-1 sm:flex-initial px-4 py-2 rounded-xl border border-rose-200 bg-white text-slate-700 text-xs font-bold hover:bg-rose-50 transition"
        >
          Save Draft
        </button>
        <button
          type="button"
          onClick={handlePublish}
          className="flex-1 sm:flex-initial px-4 py-2 rounded-xl bg-rose-700 text-white text-xs font-bold hover:bg-rose-800 shadow-sm transition"
        >
          Publish Service
        </button>
      </div>

      <div className="space-y-4">
        <div className="rounded-xl border border-rose-100 bg-[#fffbfb] p-4 space-y-4">
          <div>
            <label className={labelClass}>Service Name</label>
            <input
              value={form.name}
              onChange={(e) => update("name", e.target.value)}
              placeholder="e.g. AI Automation Suite"
              className={inputClass}
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Category</label>
              <select
                value={form.category}
                onChange={(e) => update("category", e.target.value)}
                className={inputClass}
              >
                {CATEGORY_OPTIONS.map((c) => (
                  <option key={c.id} value={c.id}>{c.label.replace(/^Category: /, "")}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>Price</label>
              <input
                value={form.price}
                onChange={(e) => update("price", e.target.value)}
                placeholder="$5,000/mo"
                className={inputClass}
              />
            </div>
          </div>
          <div>
            <label className={labelClass}>Description</label>
            <textarea
              value={form.description}
              onChange={(e) => update("description", e.target.value)}
              rows={3}
              placeholder="What does this service include?"
              className="w-full px-3 py-2.5 rounded-xl border border-rose-100 bg-white text-sm outline-none focus:border-rose-400 resize-none"
            />
          </div>
        </div>

        <div className="rounded-xl border border-rose-100 bg-[#fffbfb] p-4 space-y-4">
          <div>
            <label className={labelClass}>Status</label>
            <div className="flex flex-wrap gap-2">
              {["ACTIVE", "PAUSED", "DRAFT"].map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => update("status", s)}
                  className={`px-3 py-1.5 rounded-xl text-[11px] font-bold border transition ${
                    form.status === s
                      ? "bg-rose-50 border-rose-400 text-rose-800"
                      : "bg-white border-rose-100 text-slate-600 hover:border-rose-200"
                  }`}
                >
                  {s.charAt(0) + s.slice(1).toLowerCase()}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className={labelClass}>Catalog Badge</label>
            <div className="flex flex-wrap gap-2">
              {BADGE_OPTIONS.map((b) => (
                <button
                  key={b}
                  type="button"
                  onClick={() => update("badge", b)}
                  className={`px-3 py-1.5 rounded-xl text-[11px] font-bold border transition ${
                    form.badge === b
                      ? "bg-rose-50 border-rose-400 text-rose-800"
                      : "bg-white border-rose-100 text-slate-600 hover:border-rose-200"
                  }`}
                >
                  {b}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Tag 1</label>
              <input
                value={form.tag1}
                onChange={(e) => update("tag1", e.target.value)}
                placeholder="AI SOLUTIONS"
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Tag 2</label>
              <input
                value={form.tag2}
                onChange={(e) => update("tag2", e.target.value)}
                placeholder="6-8 WEEKS"
                className={inputClass}
              />
            </div>
          </div>
        </div>
      </div>
    </Drawer>
  );
}
