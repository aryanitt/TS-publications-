import { useState, useMemo } from "react";
import {
  Target, Scale, Percent, FileSliders,
  Search, AlertTriangle, RefreshCw,
} from "lucide-react";
import { Badge } from "../components/Primitives.jsx";
import toast, { Toaster } from "react-hot-toast";
import AdminProfileHeader, { DashboardScrollbarStyles } from "../components/AdminProfileHeader.jsx";
import { SettingsSidebar, SettingsMobileTabs, SettingsPanel, PanelFooter } from "../components/SettingsLayout.jsx";

// ─── TABS DEFINITION ──────────────────────────────────────────────────────────
const tabs = [
  { id: "targets",       label: "Target Management",    icon: Target },
  { id: "kpis",          label: "KPI Weightages",       icon: Scale },
  { id: "incentives",    label: "Incentive & Slabs",    icon: Percent },
  { id: "calculations",  label: "Performance Formulas", icon: FileSliders },
];

export default function Settings() {
  const [activeTab, setActiveTab] = useState("targets");
  const [draftCount, setDraftCount] = useState(2);
  const [currentVersion, setCurrentVersion] = useState("v2.3");

  // ─── 1. Target Management State ───
  const [employeeTargets, setEmployeeTargets] = useState([
    { id: 1, name: "Sarah Chen", team: "Sales & Growth", calls: 450, leads: 45, meetings: 35, revenue: 145000 },
    { id: 2, name: "James Wilson", team: "Enterprise Sales", calls: 390, leads: 39, meetings: 30, revenue: 118000 },
    { id: 3, name: "Emily Davis", team: "Sales & Growth", calls: 540, leads: 54, meetings: 40, revenue: 240000 },
    { id: 4, name: "Lisa Park", team: "Inbound Growth", calls: 312, leads: 31, meetings: 25, revenue: 72000 },
    { id: 5, name: "Marcus Brody", team: "Enterprise Sales", calls: 490, leads: 49, meetings: 38, revenue: 195000 },
    { id: 6, name: "Siddharth Mehta", team: "Sales & Growth", calls: 416, leads: 41, meetings: 30, revenue: 132000 },
  ]);
  const [targetSearch, setTargetSearch] = useState("");
  const [selectedTargetEmp, setSelectedTargetEmp] = useState(1);
  const [bulkTeam, setBulkTeam] = useState("Sales & Growth");
  const [bulkValue, setBulkValue] = useState("");
  const [bulkField, setBulkField] = useState("calls");

  // ─── 2. KPI Weightages State ───
  const [kpiWeights, setKpiWeights] = useState([
    { id: "revenue", label: "Cash Collected / Revenue", weight: 35, enabled: true },
    { id: "leads", label: "Converted Leads", weight: 25, enabled: true },
    { id: "meetings", label: "Completed Meetings", weight: 20, enabled: true },
    { id: "calls", label: "Call Volume Completed", weight: 20, enabled: true },
  ]);

  // ─── 3. Incentive slabs State ───
  const [incentiveSlabs, setIncentiveSlabs] = useState([
    { id: 1, tier: "Bronze", min: 0, max: 100000, rate: 3 },
    { id: 2, tier: "Silver", min: 100000, max: 250000, rate: 4.5 },
    { id: 3, tier: "Gold", min: 250000, max: 400000, rate: 6 },
    { id: 4, tier: "Platinum", min: 400000, max: 1000000, rate: 8 },
  ]);
  const [baseIncentiveRate, setBaseIncentiveRate] = useState(2.5);
  const [targetBonusAmount, setTargetBonusAmount] = useState(2500);

  // ─── 4. Performance Calculations State ───
  const [formulaType, setFormulaType] = useState("weighted");
  const [ratingThresholds, setRatingThresholds] = useState({
    outstanding: 110,
    excellent: 100,
    good: 85,
    average: 70,
  });

  const [auditLogs, setAuditLogs] = useState([
    { id: 1, action: "Published incentive rule config v2.3", admin: "Alex Chen", timestamp: "2026-06-19 10:14" },
    { id: 2, action: "Bulk updated call targets for Sales & Growth", admin: "Alex Chen", timestamp: "2026-06-18 16:02" },
  ]);

  // ─── Live Validation: Sum of Weights ───
  const totalKpiWeight = useMemo(() => {
    return kpiWeights.reduce((sum, item) => sum + (item.enabled ? Number(item.weight) : 0), 0);
  }, [kpiWeights]);

  const isWeightValid = totalKpiWeight === 100;

  // ─── Selected Target Employee computed details ───
  const activeTargetEmp = useMemo(() => {
    return employeeTargets.find(e => e.id === Number(selectedTargetEmp)) || employeeTargets[0];
  }, [employeeTargets, selectedTargetEmp]);

  // ─── Handlers ───
  const handleSaveDraft = () => {
    setDraftCount(prev => prev + 1);
    toast.success("Draft version saved successfully!");
  };

  const handlePublish = () => {
    if (!isWeightValid) {
      toast.error("Cannot publish: KPI Weightages must sum to 100%. Current: " + totalKpiWeight + "%");
      return;
    }
    const nextVerNum = "v2." + (Number(currentVersion.split(".")[1]) + 1);
    setCurrentVersion(nextVerNum);
    setDraftCount(0);
    toast.success(`Published rule configs successfully! Rule Engine upgraded to ${nextVerNum}`);
  };

  // Bulk target assignment logic
  const handleBulkUpdate = () => {
    if (!bulkValue || isNaN(Number(bulkValue))) {
      toast.error("Please enter a valid numeric bulk update value.");
      return;
    }
    const numVal = Number(bulkValue);
    setEmployeeTargets(prev =>
      prev.map(e => (e.team === bulkTeam ? { ...e, [bulkField]: numVal } : e))
    );

    const newLog = {
      id: Date.now(),
      action: `Bulk updated ${bulkField} target to ${numVal} for team: ${bulkTeam}`,
      admin: "Alex Chen",
      timestamp: new Date().toISOString().slice(0, 16).replace("T", " "),
      type: "targets"
    };
    setAuditLogs(prev => [newLog, ...prev]);
    setDraftCount(prev => prev + 1);
    toast.success(`Successfully bulk updated ${bulkField} targets for all ${bulkTeam} employees.`);
  };

  // Add target handler
  const handleTargetChange = (field, value) => {
    if (value === "" || isNaN(Number(value))) return;
    setEmployeeTargets(prev =>
      prev.map(e => (e.id === activeTargetEmp.id ? { ...e, [field]: Number(value) } : e))
    );
  };

  // KPI weight updates
  const handleWeightChange = (id, val) => {
    const num = Number(val);
    if (isNaN(num)) return;
    setKpiWeights(prev =>
      prev.map(item => (item.id === id ? { ...item, weight: num } : item))
    );
  };

  const handleKpiToggle = (id) => {
    setKpiWeights(prev =>
      prev.map(item => (item.id === id ? { ...item, enabled: !item.enabled } : item))
    );
  };

  // slabs handlers
  const handleSlabChange = (id, field, val) => {
    const num = Number(val);
    if (isNaN(num)) return;
    setIncentiveSlabs(prev =>
      prev.map(s => (s.id === id ? { ...s, [field]: num } : s))
    );
  };

  // ─── Filter targets list ───
  const filteredTargets = useMemo(() => {
    return employeeTargets.filter(e =>
      e.name.toLowerCase().includes(targetSearch.toLowerCase())
    );
  }, [employeeTargets, targetSearch]);

  return (
    <div className="space-y-4 sm:space-y-6 page-shell min-w-0">
      <Toaster position="top-right" />
      <DashboardScrollbarStyles />
      <AdminProfileHeader />

      {/* ── Main Two-Column Control Center Layout ── */}
      <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-4 sm:gap-6 min-w-0">
        <SettingsMobileTabs
          tabs={tabs}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          tabExtra={(t) =>
            t.id === "kpis" && !isWeightValid ? (
              <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-rose-600 animate-ping" />
            ) : null
          }
        />

        <SettingsSidebar
          title="Business Control"
          subtitle="Configure operational business rules"
          tabs={tabs}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          tabExtra={(t) =>
            t.id === "kpis" && !isWeightValid ? (
              <span className="absolute right-3 w-2 h-2 rounded-full bg-rose-600 animate-ping" />
            ) : null
          }
        />

        {/* Right Side Control Panels */}
        <SettingsPanel
          footer={
            <PanelFooter
              left={
                <Badge tone={draftCount > 0 ? "warning" : "muted"}>
                  {draftCount > 0 ? `${draftCount} Pending Edits` : "Buffer Synchronized"}
                </Badge>
              }
              actions={
                <>
                  <button
                    type="button"
                    onClick={handleSaveDraft}
                    className="flex-1 sm:flex-initial px-4 py-2 border border-rose-200 hover:border-rose-400 text-[#be123c] rounded-xl text-xs font-bold transition-all shadow-sm bg-white"
                  >
                    Save Draft
                  </button>
                  <button
                    type="button"
                    onClick={handlePublish}
                    className="flex-1 sm:flex-initial px-4 py-2 bg-[#be123c] hover:bg-[#a20f32] text-white rounded-xl text-xs font-bold transition-all shadow-md active:translate-y-px flex items-center justify-center gap-1.5"
                  >
                    <RefreshCw className="w-3.5 h-3.5" /> Publish Configuration
                  </button>
                </>
              }
            />
          }
        >
              {activeTab === "targets" && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider">Employee Target Slates</h3>
                    <p className="text-[11px] text-muted-foreground mt-0.5">Manage quotas and target levels assigned to performers</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    
                    {/* Select Employee Card */}
                    <div className="p-4 border border-rose-100/50 rounded-2xl bg-slate-50/50 flex flex-col gap-3">
                      <div className="relative">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                        <input
                          type="text"
                          placeholder="Search employee..."
                          value={targetSearch}
                          onChange={(e) => setTargetSearch(e.target.value)}
                          className="w-full pl-8 pr-3 py-1.5 border border-rose-200 rounded-xl bg-white text-slate-800 placeholder:text-slate-400 text-xs outline-none focus:border-rose-400"
                        />
                      </div>

                      <div className="space-y-1 overflow-y-auto max-h-48 pr-1 no-sb">
                        {filteredTargets.map(e => (
                          <div
                            key={e.id}
                            onClick={() => setSelectedTargetEmp(e.id)}
                            className={`p-2 rounded-xl text-xs font-bold cursor-pointer transition flex justify-between items-center ${
                              activeTargetEmp.id === e.id
                                ? "bg-rose-50 border border-rose-200 text-rose-700"
                                : "hover:bg-slate-100 text-slate-600 border border-transparent"
                            }`}
                          >
                            <span>{e.name}</span>
                            <span className="text-[9px] text-slate-400 font-medium truncate">{e.team}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Employee Target Form */}
                    <div className="md:col-span-2 p-4 border border-rose-100/50 rounded-2xl bg-white space-y-4">
                      <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                        <span className="text-xs font-black text-[#be123c] uppercase">{activeTargetEmp.name}'s Target slate</span>
                        <Badge tone="primary">{activeTargetEmp.team}</Badge>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Monthly Call Target</label>
                          <input
                            type="number"
                            value={activeTargetEmp.calls}
                            onChange={(e) => handleTargetChange("calls", e.target.value)}
                            className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 text-slate-800 text-xs font-bold outline-none focus:border-rose-400 focus:ring-1 focus:ring-rose-400"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Converted Leads Target</label>
                          <input
                            type="number"
                            value={activeTargetEmp.leads}
                            onChange={(e) => handleTargetChange("leads", e.target.value)}
                            className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 text-slate-800 text-xs font-bold outline-none focus:border-rose-400 focus:ring-1 focus:ring-rose-400"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Meetings Scheduled Target</label>
                          <input
                            type="number"
                            value={activeTargetEmp.meetings}
                            onChange={(e) => handleTargetChange("meetings", e.target.value)}
                            className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 text-slate-800 text-xs font-bold outline-none focus:border-rose-400 focus:ring-1 focus:ring-rose-400"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Revenue Collection Target ($)</label>
                          <input
                            type="number"
                            value={activeTargetEmp.revenue}
                            onChange={(e) => handleTargetChange("revenue", e.target.value)}
                            className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 text-slate-800 text-xs font-bold outline-none focus:border-rose-400 focus:ring-1 focus:ring-rose-400"
                          />
                        </div>
                      </div>
                    </div>

                  </div>

                  {/* Bulk Target updates panel */}
                  <div className="p-4 border border-rose-100 rounded-2xl bg-gradient-to-r from-rose-50/10 via-rose-50/20 to-rose-50/10">
                    <div className="mb-3">
                      <span className="text-[10px] font-black text-rose-700 uppercase tracking-wider block">Bulk Target Slate Assigner</span>
                      <span className="text-[10px] text-slate-400 font-medium">Re-assign targets to all team members collectively</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
                      <div>
                        <label className="text-[9px] font-bold text-slate-400 uppercase block mb-1">Target Team</label>
                        <select
                          value={bulkTeam}
                          onChange={(e) => setBulkTeam(e.target.value)}
                          className="w-full px-3 py-1.5 border border-slate-200 rounded-xl bg-white text-slate-700 text-xs outline-none"
                        >
                          <option>Sales & Growth</option>
                          <option>Enterprise Sales</option>
                          <option>Inbound Growth</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-[9px] font-bold text-slate-400 uppercase block mb-1">Metric Target Field</label>
                        <select
                          value={bulkField}
                          onChange={(e) => setBulkField(e.target.value)}
                          className="w-full px-3 py-1.5 border border-slate-200 rounded-xl bg-white text-slate-700 text-xs outline-none"
                        >
                          <option value="calls">Call Volume</option>
                          <option value="leads">Converted Leads</option>
                          <option value="meetings">Scheduled Meetings</option>
                          <option value="revenue">Revenue Quota</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-[9px] font-bold text-slate-400 uppercase block mb-1">New Target Value</label>
                        <input
                          type="number"
                          placeholder="e.g. 500"
                          value={bulkValue}
                          onChange={(e) => setBulkValue(e.target.value)}
                          className="w-full px-3 py-1.5 border border-slate-200 rounded-xl bg-white text-slate-700 text-xs outline-none"
                        />
                      </div>
                      <div>
                        <button
                          onClick={handleBulkUpdate}
                          className="w-full py-1.5 bg-[#be123c] hover:bg-[#a20f32] text-white rounded-xl text-xs font-bold shadow-sm active:translate-y-px transition"
                        >
                          Apply Bulk Change
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ── 2. KPI WEIGHTAGE CONFIGURATION ── */}
              {activeTab === "kpis" && (
                <div className="space-y-6">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider">KPI Rules & Weightages</h3>
                      <p className="text-[11px] text-muted-foreground mt-0.5">Determine the score weight allocation and status of core metric KPIs</p>
                    </div>
                    {isWeightValid ? (
                      <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200 flex items-center gap-1">
                        ✓ Total validated: 100%
                      </span>
                    ) : (
                      <span className="text-xs font-bold text-rose-600 bg-rose-50 px-3 py-1 rounded-full border border-rose-200 flex items-center gap-1">
                        ⚠ Weights Total: {totalKpiWeight}% (must equal 100%)
                      </span>
                    )}
                  </div>

                  <div className="space-y-4">
                    {kpiWeights.map(item => (
                      <div
                        key={item.id}
                        className={`p-4 border rounded-2xl transition flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                          item.enabled ? "bg-white border-rose-100" : "bg-slate-50/60 border-slate-100 opacity-60"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => handleKpiToggle(item.id)}
                            className={`w-9 h-5 rounded-full transition relative shrink-0 ${item.enabled ? "bg-[#be123c]" : "bg-slate-200"}`}
                          >
                            <div className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-all ${item.enabled ? "translate-x-4" : ""}`} />
                          </button>
                          <div>
                            <span className="text-xs font-bold text-slate-800 block">{item.label}</span>
                            <span className="text-[10px] text-slate-400">{item.enabled ? "Active rule vector" : "De-activated vector"}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-4">
                          <input
                            type="range"
                            min="0"
                            max="100"
                            disabled={!item.enabled}
                            value={item.enabled ? item.weight : 0}
                            onChange={(e) => handleWeightChange(item.id, e.target.value)}
                            className="w-36 h-1.5 rounded-lg bg-slate-100 accent-[#be123c]"
                          />
                          <div className="flex items-center gap-1">
                            <input
                              type="number"
                              disabled={!item.enabled}
                              value={item.enabled ? item.weight : 0}
                              onChange={(e) => handleWeightChange(item.id, e.target.value)}
                              className="w-16 px-2 py-1 border border-slate-200 rounded-xl bg-slate-50 text-slate-800 text-xs font-bold text-center outline-none focus:border-rose-400"
                            />
                            <span className="text-xs font-bold text-slate-400">%</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {!isWeightValid && (
                    <div className="p-4 rounded-2xl bg-rose-50/40 border border-rose-200 flex items-center gap-3">
                      <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 animate-bounce" />
                      <span className="text-xs text-rose-700 font-medium">
                        Live Validation Notice: Total weight sum is <strong>{totalKpiWeight}%</strong>. You must scale the percentages so they sum to <strong>100%</strong> to enable publishing configurations.
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* ── 3. INCENTIVE & SALARY RULES ── */}
              {activeTab === "incentives" && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider">Incentive Slabs & Salary Rules</h3>
                    <p className="text-[11px] text-muted-foreground mt-0.5">Configure commission slabs, default baseline rates, and target bonuses</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 border border-rose-100/50 rounded-2xl bg-slate-50/40">
                      <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Baseline Incentive Rate (%)</label>
                      <input
                        type="number"
                        step="0.1"
                        value={baseIncentiveRate}
                        onChange={(e) => setBaseIncentiveRate(Number(e.target.value))}
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white text-slate-800 text-xs font-bold outline-none"
                      />
                      <span className="text-[9px] text-slate-400 mt-1 block">Default rate when target threshold achievements are below bronze levels</span>
                    </div>

                    <div className="p-4 border border-rose-100/50 rounded-2xl bg-slate-50/40">
                      <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Monthly Target Reached Bonus ($)</label>
                      <input
                        type="number"
                        value={targetBonusAmount}
                        onChange={(e) => setTargetBonusAmount(Number(e.target.value))}
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white text-slate-800 text-xs font-bold outline-none"
                      />
                      <span className="text-[9px] text-slate-400 mt-1 block">Standard target achievement cash incentive bonus</span>
                    </div>
                  </div>

                  {/* Slabs configuration */}
                  <div>
                    <div className="flex justify-between items-center mb-3">
                      <span className="text-xs font-black text-slate-800 uppercase tracking-wider">Target Performance Slabs</span>
                      <Badge tone="info">{incentiveSlabs.length} Slabs Configured</Badge>
                    </div>

                    <div className="space-y-3">
                      {incentiveSlabs.map(slab => (
                        <div key={slab.id} className="p-4 border border-rose-50 rounded-2xl bg-white flex flex-col sm:flex-row items-center gap-4 justify-between">
                          <span className="text-xs font-extrabold text-slate-800 w-24">{slab.tier} Tier</span>
                          <div className="flex flex-1 flex-wrap gap-4 items-center justify-end">
                            <div>
                              <span className="text-[9px] font-bold text-slate-400 uppercase block mb-0.5">Min collection ($)</span>
                              <input
                                type="number"
                                value={slab.min}
                                onChange={(e) => handleSlabChange(slab.id, "min", e.target.value)}
                                className="w-28 px-2 py-1 border border-slate-200 rounded-xl bg-slate-50 text-slate-800 text-xs font-bold outline-none"
                              />
                            </div>
                            <div>
                              <span className="text-[9px] font-bold text-slate-400 uppercase block mb-0.5">Max collection ($)</span>
                              <input
                                type="number"
                                value={slab.max}
                                onChange={(e) => handleSlabChange(slab.id, "max", e.target.value)}
                                className="w-28 px-2 py-1 border border-slate-200 rounded-xl bg-slate-50 text-slate-800 text-xs font-bold outline-none"
                              />
                            </div>
                            <div>
                              <span className="text-[9px] font-bold text-slate-400 uppercase block mb-0.5">Commission Rate (%)</span>
                              <input
                                type="number"
                                step="0.1"
                                value={slab.rate}
                                onChange={(e) => handleSlabChange(slab.id, "rate", e.target.value)}
                                className="w-20 px-2 py-1 border border-slate-200 rounded-xl bg-slate-50 text-slate-800 text-xs font-bold outline-none text-center"
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* ── 4. PERFORMANCE CALCULATION SETTINGS ── */}
              {activeTab === "calculations" && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider">Performance Formula Configurations</h3>
                    <p className="text-[11px] text-muted-foreground mt-0.5">Select and calibrate calculation formulas for scoring teammates</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="p-4 border border-rose-100 rounded-2xl bg-white flex flex-col justify-between">
                      <div>
                        <span className="text-xs font-extrabold text-slate-800 uppercase block mb-1">Calculation Rule Sets</span>
                        <span className="text-[10px] text-slate-400">Formula used to combine weighted KPI scores</span>
                      </div>

                      <div className="space-y-2 mt-4">
                        {[
                          { id: "weighted", label: "Weighted Summation", desc: "Linear sum of weights multiplied by achievement percentages" },
                          { id: "threshold", label: "Threshold Gated", desc: "Allows scoring only if base minimum thresholds are cleared" },
                          { id: "stepped", label: "Stepped slab Matrix", desc: "Gradual multiplier increases as target vectors hit increments" },
                        ].map(f => (
                          <div
                            key={f.id}
                            onClick={() => setFormulaType(f.id)}
                            className={`p-3 rounded-xl border cursor-pointer transition ${
                              formulaType === f.id
                                ? "bg-rose-50 border-rose-200 text-rose-700"
                                : "bg-slate-50/50 hover:bg-slate-50 border-slate-100 text-slate-600"
                            }`}
                          >
                            <span className="text-xs font-bold block">{f.label}</span>
                            <span className="text-[9px] text-slate-400">{f.desc}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="p-4 border border-rose-100 rounded-2xl bg-white space-y-4">
                      <div>
                        <span className="text-xs font-extrabold text-slate-800 uppercase block mb-1">Grading & Rating Limits</span>
                        <span className="text-[10px] text-slate-400">Target performance thresholds for rating slates</span>
                      </div>

                      <div className="space-y-3">
                        <div>
                          <div className="flex justify-between text-[10px] font-bold text-slate-500 mb-1">
                            <span>Outstanding limit threshold</span>
                            <span>{ratingThresholds.outstanding}%</span>
                          </div>
                          <input
                            type="range" min="95" max="150" value={ratingThresholds.outstanding}
                            onChange={(e) => setRatingThresholds({ ...ratingThresholds, outstanding: Number(e.target.value) })}
                            className="w-full h-1 bg-slate-100 accent-[#be123c]"
                          />
                        </div>
                        <div>
                          <div className="flex justify-between text-[10px] font-bold text-slate-500 mb-1">
                            <span>Excellent limit threshold</span>
                            <span>{ratingThresholds.excellent}%</span>
                          </div>
                          <input
                            type="range" min="80" max="110" value={ratingThresholds.excellent}
                            onChange={(e) => setRatingThresholds({ ...ratingThresholds, excellent: Number(e.target.value) })}
                            className="w-full h-1 bg-slate-100 accent-[#be123c]"
                          />
                        </div>
                        <div>
                          <div className="flex justify-between text-[10px] font-bold text-slate-500 mb-1">
                            <span>Good limit threshold</span>
                            <span>{ratingThresholds.good}%</span>
                          </div>
                          <input
                            type="range" min="70" max="95" value={ratingThresholds.good}
                            onChange={(e) => setRatingThresholds({ ...ratingThresholds, good: Number(e.target.value) })}
                            className="w-full h-1 bg-slate-100 accent-[#be123c]"
                          />
                        </div>
                        <div>
                          <div className="flex justify-between text-[10px] font-bold text-slate-500 mb-1">
                            <span>Average limit threshold</span>
                            <span>{ratingThresholds.average}%</span>
                          </div>
                          <input
                            type="range" min="50" max="80" value={ratingThresholds.average}
                            onChange={(e) => setRatingThresholds({ ...ratingThresholds, average: Number(e.target.value) })}
                            className="w-full h-1 bg-slate-100 accent-[#be123c]"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

        </SettingsPanel>
      </div>

    </div>
  );
}