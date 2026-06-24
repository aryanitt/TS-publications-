/** Demo data for Lead Management — used when API returns empty or fails. */

const daysAgo = (n) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString();
};

export const dummyEmployees = [
  { id: 101, name: "Priya Sharma", email: "priya@company.in", role: "Senior AE", department: "Sales", status: "active" },
  { id: 102, name: "Rahul Mehta", email: "rahul@company.in", role: "Account Executive", department: "Sales", status: "active" },
  { id: 103, name: "Ananya Reddy", email: "ananya@company.in", role: "SDR", department: "Sales", status: "active" },
  { id: 104, name: "Vikram Singh", email: "vikram@company.in", role: "Sales Rep", department: "Marketing", status: "active" },
  { id: 105, name: "Kavya Nair", email: "kavya@company.in", role: "Inside Sales", department: "Support", status: "active" },
  { id: 106, name: "Arjun Patel", email: "arjun@company.in", role: "AE", department: "Sales", status: "on_leave" },
];

export const dummyLeads = [
  {
    id: 1001,
    lead_name: "Amit Desai",
    company_name: "Desai Logistics",
    phone: "+919876543210",
    email: "amit@desailogistics.in",
    city: "Mumbai",
    source: "Facebook Ads",
    form_name: "Meta Lead Form",
    temperature: "Hot Lead",
    pipeline_stage: "Negotiation",
    status: "Hot Lead",
    win_probability: 72,
    expected_revenue: 450000,
    interactions: 8,
    next_followup_date: "2026-06-22",
    created_at: daysAgo(1),
  },
  {
    id: 1002,
    lead_name: "Sneha Iyer",
    company_name: "Iyer Tech Solutions",
    phone: "+919988776655",
    email: "sneha@iyertech.com",
    city: "Bangalore",
    source: "Google Ads",
    temperature: "Warm Lead",
    pipeline_stage: "Qualified",
    status: "Warm Lead",
    win_probability: 55,
    expected_revenue: 280000,
    interactions: 4,
    next_followup_date: "2026-06-20",
    created_at: daysAgo(2),
  },
  {
    id: 1003,
    lead_name: "Rajesh Kumar",
    company_name: "Kumar Enterprises",
    phone: "+919811223344",
    email: "rajesh@kumar.in",
    city: "Delhi",
    source: "Website",
    temperature: "Cold Lead",
    pipeline_stage: "New Lead",
    status: "New Lead",
    win_probability: 25,
    expected_revenue: 95000,
    interactions: 1,
    next_followup_date: "2026-06-25",
    created_at: daysAgo(0),
  },
  {
    id: 1004,
    lead_name: "Meera Joshi",
    company_name: "Joshi Retail",
    phone: "+919900112233",
    email: "meera@joshiretail.in",
    city: "Pune",
    source: "WhatsApp",
    temperature: "Hot Lead",
    pipeline_stage: "Contacted",
    status: "Contacted",
    win_probability: 48,
    expected_revenue: 175000,
    interactions: 6,
    next_followup_date: "2026-06-19",
    created_at: daysAgo(3),
  },
  {
    id: 1005,
    lead_name: "Deepak Malhotra",
    company_name: "Malhotra Finance",
    phone: "+919877665544",
    email: "deepak@malhotra.co",
    city: "Gurgaon",
    source: "Manual",
    temperature: "Warm Lead",
    pipeline_stage: "Proposal Sent",
    status: "Proposal Sent",
    win_probability: 61,
    expected_revenue: 520000,
    interactions: 5,
    next_followup_date: "2026-06-21",
    created_at: daysAgo(5),
  },
  {
    id: 1006,
    lead_name: "Lakshmi Venkat",
    company_name: "Venkat Exports",
    phone: "+919944556677",
    email: "lakshmi@venkatexports.in",
    city: "Chennai",
    source: "N8N Webhook",
    form_name: "n8n_inbound",
    temperature: "Cold Lead",
    pipeline_stage: "New Lead",
    status: "New Lead",
    win_probability: 18,
    expected_revenue: 120000,
    interactions: 0,
    created_at: daysAgo(0),
  },
  {
    id: 1007,
    lead_name: "Harish Bhatt",
    company_name: "Bhatt Manufacturing",
    phone: "+919966778899",
    email: "harish@bhattmfg.com",
    city: "Ahmedabad",
    source: "API",
    form_name: "crm_api_sync",
    temperature: "Warm Lead",
    pipeline_stage: "Contacted",
    status: "Contacted",
    win_probability: 42,
    expected_revenue: 310000,
    interactions: 3,
    next_followup_date: "2026-06-23",
    created_at: daysAgo(1),
  },
  {
    id: 1008,
    lead_name: "Pooja Agarwal",
    company_name: "Agarwal Healthcare",
    phone: "+919933445566",
    email: "pooja@agarwalhealth.in",
    city: "Jaipur",
    source: "Instagram Ads",
    temperature: "Hot Lead",
    pipeline_stage: "Closed Won",
    status: "Closed Won",
    win_probability: 100,
    expected_revenue: 680000,
    interactions: 12,
    created_at: daysAgo(14),
  },
  {
    id: 1009,
    lead_name: "Sanjay Rao",
    company_name: "Rao Constructions",
    phone: "+919922334455",
    email: "san@raobuild.in",
    city: "Hyderabad",
    source: "Google Ads",
    temperature: "Cold Lead",
    pipeline_stage: "New Lead",
    status: "New Lead",
    win_probability: 15,
    expected_revenue: 85000,
    interactions: 0,
    created_at: daysAgo(0),
  },
  {
    id: 1010,
    lead_name: "Neha Kapoor",
    company_name: "Kapoor Studios",
    phone: "+919911223344",
    email: "neha@kapoorstudios.in",
    city: "Mumbai",
    source: "Website",
    temperature: "Warm Lead",
    pipeline_stage: "In Progress",
    status: "In Progress",
    win_probability: 50,
    expected_revenue: 210000,
    interactions: 7,
    next_followup_date: "2026-06-18",
    created_at: daysAgo(4),
  },
  {
    id: 1011,
    lead_name: "Rohit Saxena",
    company_name: "Saxena Auto",
    phone: "+919900998877",
    email: "rohit@saxenaauto.com",
    city: "Lucknow",
    source: "Facebook Ads",
    temperature: "Hot Lead",
    pipeline_stage: "Negotiation",
    status: "Negotiation",
    win_probability: 78,
    expected_revenue: 890000,
    interactions: 9,
    next_followup_date: "2026-06-19",
    created_at: daysAgo(6),
  },
  {
    id: 1012,
    lead_name: "Divya Menon",
    company_name: "Menon Foods",
    phone: "+919877112233",
    email: "divya@menonfoods.in",
    city: "Kochi",
    source: "WhatsApp",
    temperature: "Warm Lead",
    pipeline_stage: "Contacted",
    status: "Contacted",
    win_probability: 38,
    expected_revenue: 145000,
    interactions: 2,
    next_followup_date: "2026-06-24",
    created_at: daysAgo(2),
  },
  {
    id: 1013,
    lead_name: "Karan Gill",
    company_name: "Gill Sports",
    phone: "+919866554433",
    email: "karan@gillsports.in",
    city: "Chandigarh",
    source: "Referral",
    temperature: "Cold Lead",
    pipeline_stage: "New Lead",
    status: "New Lead",
    win_probability: 22,
    expected_revenue: 65000,
    interactions: 1,
    created_at: daysAgo(1),
  },
  {
    id: 1014,
    lead_name: "Isha Banerjee",
    company_name: "Banerjee Media",
    phone: "+919855443322",
    email: "isha@banerjeemedia.in",
    city: "Kolkata",
    source: "N8N Webhook",
    form_name: "n8n_meta_sync",
    temperature: "Hot Lead",
    pipeline_stage: "Qualified",
    status: "Qualified",
    win_probability: 58,
    expected_revenue: 340000,
    interactions: 4,
    next_followup_date: "2026-06-20",
    created_at: daysAgo(0),
  },
  {
    id: 1015,
    lead_name: "Manish Tiwari",
    company_name: "Tiwari Infra",
    phone: "+919844332211",
    email: "manish@tiwariinfra.com",
    city: "Bhopal",
    source: "Google Ads",
    temperature: "Warm Lead",
    pipeline_stage: "Closed Won",
    status: "Closed Won",
    win_probability: 100,
    expected_revenue: 420000,
    interactions: 11,
    created_at: daysAgo(20),
  },
  {
    id: 1016,
    lead_name: "Shreya Dutta",
    company_name: "Dutta EdTech",
    phone: "+919833221100",
    email: "shreya@duttaedtech.in",
    city: "Bangalore",
    source: "Website",
    temperature: "Cold Lead",
    pipeline_stage: "New Lead",
    status: "New Lead",
    win_probability: 12,
    expected_revenue: 55000,
    interactions: 0,
    created_at: daysAgo(0),
  },
  {
    id: 1017,
    lead_name: "Vivek Choudhary",
    company_name: "Choudhary Pharma",
    phone: "+919822110099",
    email: "vivek@choudharypharma.in",
    city: "Indore",
    source: "Manual",
    temperature: "Hot Lead",
    pipeline_stage: "Proposal Sent",
    status: "Proposal Sent",
    win_probability: 65,
    expected_revenue: 750000,
    interactions: 6,
    next_followup_date: "2026-06-22",
    created_at: daysAgo(7),
  },
  {
    id: 1018,
    lead_name: "Tanvi Shah",
    company_name: "Shah Jewellers",
    phone: "+919811009988",
    email: "tanvi@shahjewellers.in",
    city: "Surat",
    source: "API",
    form_name: "partner_api",
    temperature: "Warm Lead",
    pipeline_stage: "Contacted",
    status: "Contacted",
    win_probability: 44,
    expected_revenue: 195000,
    interactions: 3,
    next_followup_date: "2026-06-21",
    created_at: daysAgo(1),
  },
];

/** Pre-built assignment state so demo metrics & workload panels look realistic. */
export function createDemoAssignmentState(baseState, employees, leads) {
  const empByIndex = (i) => employees[i % employees.length];
  const assignments = {};
  const auditLog = [];
  const todayStats = { total: 0, byEmployee: {} };
  const employeeSettings = {
    [106]: { receivingPaused: true, maxCapacity: 15, skills: [] },
  };

  const assignTo = (lead, empIdx, method, hoursAgo = 2) => {
    const emp = empByIndex(empIdx);
    if (!emp) return;
    const leadId = String(lead.id);
    const at = new Date(Date.now() - hoursAgo * 3600000).toISOString();
    assignments[leadId] = {
      employeeId: String(emp.id),
      employeeName: emp.name,
      assignedAt: at,
      method,
    };
    auditLog.push({
      id: Date.now() + Number(leadId),
      at,
      action: "assigned",
      leadId,
      leadName: lead.lead_name,
      employeeId: String(emp.id),
      employeeName: emp.name,
      method,
    });
    if (hoursAgo < 24) {
      todayStats.total += 1;
      const k = String(emp.id);
      todayStats.byEmployee[k] = (todayStats.byEmployee[k] || 0) + 1;
    }
  };

  // Assign ~65% of leads; leave rest unassigned for queue demo
  const unassignedIds = new Set([1003, 1006, 1009, 1013, 1016]);
  leads.forEach((lead, i) => {
    if (unassignedIds.has(lead.id)) return;
    assignTo(lead, i, i % 3 === 0 ? "auto-round-robin" : "manual", (i % 5) + 1);
  });

  return {
    ...baseState,
    assignments,
    employeeSettings,
    distribution: {
      mode: "round-robin",
      roundRobinOrder: employees.filter((e) => e.status !== "on_leave").map((e) => e.id),
      rrIndex: 2,
      autoAssign: true,
    },
    auditLog: auditLog.sort((a, b) => new Date(b.at) - new Date(a.at)),
    todayKey: new Date().toISOString().slice(0, 10),
    todayStats,
  };
}

export function resolveDemoLeads(apiLeads) {
  if (Array.isArray(apiLeads) && apiLeads.length > 0) return apiLeads;
  return dummyLeads;
}

export function resolveDemoEmployees(apiEmployees) {
  if (Array.isArray(apiEmployees) && apiEmployees.length > 0) return apiEmployees;
  return dummyEmployees;
}

/** Create a lead locally when the API is unavailable (demo / offline). */
export function createLocalLead(payload) {
  const id = Date.now();
  return {
    success: true,
    lead: {
      id,
      ...payload,
      source: payload.source || "Manual",
      temperature: payload.temperature || "Cold Lead",
      pipeline_stage: payload.pipeline_stage || "New Lead",
      status: payload.status || "New Lead",
      win_probability: payload.win_probability ?? 50,
      expected_revenue: payload.expected_revenue ?? 0,
      interactions: payload.interactions ?? 0,
      created_at: new Date().toISOString(),
    },
  };
}
