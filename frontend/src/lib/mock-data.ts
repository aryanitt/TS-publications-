export const teamMembers = [
  { id: 1, name: "Alexandra Chen", role: "Head of Sales", department: "Sales", status: "active", avatar: "AC", email: "alex@company.com", productivity: 94, deals: 28 },
  { id: 2, name: "Marcus Rivera", role: "Senior Account Exec", department: "Sales", status: "active", avatar: "MR", email: "marcus@company.com", productivity: 88, deals: 22 },
  { id: 3, name: "Priya Anand", role: "Lead Designer", department: "Design", status: "remote", avatar: "PA", email: "priya@company.com", productivity: 91, deals: 0 },
  { id: 4, name: "Daniel Okafor", role: "Engineering Lead", department: "Engineering", status: "active", avatar: "DO", email: "daniel@company.com", productivity: 96, deals: 0 },
  { id: 5, name: "Sofia Lindqvist", role: "Marketing Manager", department: "Marketing", status: "on-leave", avatar: "SL", email: "sofia@company.com", productivity: 72, deals: 0 },
  { id: 6, name: "Jordan Park", role: "Customer Success", department: "Support", status: "active", avatar: "JP", email: "jordan@company.com", productivity: 85, deals: 14 },
  { id: 7, name: "Naomi Wei", role: "Product Manager", department: "Product", status: "remote", avatar: "NW", email: "naomi@company.com", productivity: 89, deals: 0 },
  { id: 8, name: "Liam Sørensen", role: "Sales Development", department: "Sales", status: "active", avatar: "LS", email: "liam@company.com", productivity: 78, deals: 18 },
];

export const sops = [
  { id: 1, title: "Customer Onboarding Process", category: "Sales", version: "v2.4", status: "approved", priority: "high", dueDate: "2026-06-15", assignee: "Alexandra Chen", updated: "2 days ago" },
  { id: 2, title: "Lead Qualification Framework", category: "Sales", version: "v1.8", status: "review", priority: "high", dueDate: "2026-06-10", assignee: "Marcus Rivera", updated: "5 hours ago" },
  { id: 3, title: "Support Ticket Escalation", category: "Support", version: "v3.1", status: "approved", priority: "medium", dueDate: "2026-07-01", assignee: "Jordan Park", updated: "1 week ago" },
  { id: 4, title: "Design Review Protocol", category: "Design", version: "v1.2", status: "draft", priority: "low", dueDate: "2026-06-28", assignee: "Priya Anand", updated: "3 days ago" },
  { id: 5, title: "Code Deployment Checklist", category: "Engineering", version: "v4.0", status: "approved", priority: "high", dueDate: "2026-06-12", assignee: "Daniel Okafor", updated: "1 day ago" },
  { id: 6, title: "Marketing Campaign Launch", category: "Marketing", version: "v2.0", status: "review", priority: "medium", dueDate: "2026-06-20", assignee: "Sofia Lindqvist", updated: "6 hours ago" },
  { id: 7, title: "Product Discovery Workshop", category: "Product", version: "v1.5", status: "approved", priority: "medium", dueDate: "2026-07-05", assignee: "Naomi Wei", updated: "4 days ago" },
  { id: 8, title: "Quarterly Sales Review", category: "Sales", version: "v3.3", status: "draft", priority: "high", dueDate: "2026-06-18", assignee: "Liam Sørensen", updated: "12 hours ago" },
];

export const pipelineStages = [
  { id: "new", title: "New Leads", color: "info" },
  { id: "contacted", title: "Contacted", color: "info" },
  { id: "qualified", title: "Qualified", color: "warning" },
  { id: "proposal", title: "Proposal Sent", color: "warning" },
  { id: "negotiation", title: "Negotiation", color: "primary" },
  { id: "won", title: "Closed Won", color: "success" },
  { id: "lost", title: "Closed Lost", color: "destructive" },
];

export const deals = [
  { id: 1, company: "Northwind Logistics", value: 84000, stage: "new", owner: "AC", contact: "Erin Page", probability: 20, dueDate: "Jun 18" },
  { id: 2, company: "Helix Biotech", value: 142000, stage: "new", owner: "MR", contact: "Tom Vega", probability: 25, dueDate: "Jun 22" },
  { id: 3, company: "Atlas Realty", value: 56000, stage: "contacted", owner: "LS", contact: "Mira Holt", probability: 35, dueDate: "Jun 15" },
  { id: 4, company: "Vector Studios", value: 38000, stage: "contacted", owner: "AC", contact: "Ravi Shah", probability: 40, dueDate: "Jun 20" },
  { id: 5, company: "Quantum Foods", value: 96000, stage: "qualified", owner: "MR", contact: "Lia Brown", probability: 55, dueDate: "Jun 25" },
  { id: 6, company: "Orbit Media", value: 124000, stage: "qualified", owner: "LS", contact: "Noah King", probability: 60, dueDate: "Jul 02" },
  { id: 7, company: "Sable Industries", value: 210000, stage: "proposal", owner: "AC", contact: "Anya Reed", probability: 70, dueDate: "Jun 28" },
  { id: 8, company: "Lumen Health", value: 175000, stage: "proposal", owner: "MR", contact: "Ken Pike", probability: 72, dueDate: "Jul 04" },
  { id: 9, company: "Mercury Bank", value: 320000, stage: "negotiation", owner: "AC", contact: "Sara Cole", probability: 85, dueDate: "Jun 30" },
  { id: 10, company: "Aspen Travel", value: 92000, stage: "negotiation", owner: "LS", contact: "Owen Frye", probability: 80, dueDate: "Jul 06" },
  { id: 11, company: "Pinecrest Edu", value: 68000, stage: "won", owner: "JP", contact: "Iris Wood", probability: 100, dueDate: "Closed" },
  { id: 12, company: "Vertex Auto", value: 145000, stage: "won", owner: "MR", contact: "Hugo Linn", probability: 100, dueDate: "Closed" },
  { id: 13, company: "Bristol Print", value: 24000, stage: "lost", owner: "LS", contact: "Dana Roe", probability: 0, dueDate: "Closed" },
];

export const customers = [
  { id: 1, company: "Pinecrest Education", contact: "Iris Wood", email: "iris@pinecrest.edu", tier: "Enterprise", mrr: 12400, status: "active", joined: "2024-08-12" },
  { id: 2, company: "Vertex Automotive", contact: "Hugo Linn", email: "hugo@vertex.io", tier: "Enterprise", mrr: 18900, status: "active", joined: "2024-03-04" },
  { id: 3, company: "Quill & Co", contact: "Eve Tann", email: "eve@quillco.com", tier: "Growth", mrr: 3400, status: "active", joined: "2025-01-20" },
  { id: 4, company: "Brightline Foods", contact: "Sam Olu", email: "sam@brightline.com", tier: "Growth", mrr: 4900, status: "trial", joined: "2026-05-02" },
  { id: 5, company: "Halcyon Studios", contact: "Mira Dey", email: "mira@halcyon.co", tier: "Starter", mrr: 990, status: "active", joined: "2025-11-18" },
  { id: 6, company: "Northbound Labs", contact: "Theo Marx", email: "theo@northb.io", tier: "Enterprise", mrr: 22100, status: "active", joined: "2023-06-30" },
];

export const revenueData = [
  { month: "Jan", revenue: 240, target: 220 },
  { month: "Feb", revenue: 280, target: 240 },
  { month: "Mar", revenue: 310, target: 260 },
  { month: "Apr", revenue: 295, target: 280 },
  { month: "May", revenue: 358, target: 300 },
  { month: "Jun", revenue: 412, target: 320 },
  { month: "Jul", revenue: 446, target: 340 },
  { month: "Aug", revenue: 489, target: 360 },
];

export const departmentLoad = [
  { name: "Sales", value: 34 },
  { name: "Engineering", value: 28 },
  { name: "Design", value: 14 },
  { name: "Marketing", value: 12 },
  { name: "Support", value: 12 },
];

export const productivityWeek = [
  { day: "Mon", productivity: 78 },
  { day: "Tue", productivity: 84 },
  { day: "Wed", productivity: 92 },
  { day: "Thu", productivity: 88 },
  { day: "Fri", productivity: 81 },
  { day: "Sat", productivity: 42 },
  { day: "Sun", productivity: 28 },
];

export const activities = [
  { id: 1, user: "Alexandra Chen", action: "closed deal with", target: "Mercury Bank", time: "12m ago", type: "deal" },
  { id: 2, user: "Marcus Rivera", action: "updated SOP", target: "Lead Qualification", time: "1h ago", type: "sop" },
  { id: 3, user: "Jordan Park", action: "added new customer", target: "Brightline Foods", time: "2h ago", type: "customer" },
  { id: 4, user: "Daniel Okafor", action: "approved", target: "Code Deployment v4.0", time: "4h ago", type: "approval" },
  { id: 5, user: "Priya Anand", action: "uploaded", target: "Design Review Protocol", time: "1d ago", type: "upload" },
  { id: 6, user: "Liam Sørensen", action: "scheduled call with", target: "Atlas Realty", time: "1d ago", type: "call" },
];

export const notifications = [
  { id: 1, title: "New deal in Negotiation", body: "Mercury Bank — $320,000", time: "5m", unread: true },
  { id: 2, title: "SOP needs your approval", body: "Quarterly Sales Review v3.3", time: "1h", unread: true },
  { id: 3, title: "Team meeting at 3:00 PM", body: "Weekly sync — Conference Room A", time: "3h", unread: false },
  { id: 4, title: "Sofia is on leave today", body: "Marketing handoff to Naomi", time: "1d", unread: false },
];
