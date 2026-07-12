export const kpis = [
  { label: "Revenue", value: "₹1.24Cr", change: "+18.4%", trend: "up", icon: "DollarSign" },
  { label: "Active Leads", value: "342", change: "+12.1%", trend: "up", icon: "Users" },
  { label: "Team Productivity", value: "92%", change: "+4.2%", trend: "up", icon: "Activity" },
  { label: "Total SOPs", value: "186", change: "+8", trend: "up", icon: "FileText" },
];

export const recentLeads = [
  { id: 1, company: "Acme Corp", contact: "Sarah Mitchell", email: "sarah@acme.io", phone: "+1 415 555 0142", revenue: 84000, stage: "Qualified", priority: "High", assignee: "Alex Chen", notes: "Interested in enterprise tier. Demo scheduled.", followUp: "2026-06-02" },
  { id: 2, company: "Nimbus Labs", contact: "David Park", email: "david@nimbus.dev", phone: "+1 408 555 0199", revenue: 142000, stage: "Negotiation", priority: "High", assignee: "Maya Singh", notes: "Negotiating annual contract terms.", followUp: "2026-05-30" },
  { id: 3, company: "Helix AI", contact: "Priya Raman", email: "priya@helix.ai", phone: "+1 650 555 0177", revenue: 56000, stage: "Proposal Sent", priority: "Medium", assignee: "Jordan Lee", notes: "Awaiting CFO sign-off.", followUp: "2026-06-04" },
  { id: 4, company: "Vector Studios", contact: "Tom Becker", email: "tom@vector.studio", phone: "+1 212 555 0188", revenue: 38000, stage: "Contacted", priority: "Medium", assignee: "Maya Singh", notes: "Initial discovery call complete.", followUp: "2026-06-01" },
  { id: 5, company: "Quanta", contact: "Lena Wu", email: "lena@quanta.co", phone: "+1 312 555 0123", revenue: 210000, stage: "Qualified", priority: "Critical", assignee: "Alex Chen", notes: "Big-ticket; multi-region rollout.", followUp: "2026-05-29" },
  { id: 6, company: "Orbit Health", contact: "Marcus Bell", email: "marcus@orbit.health", phone: "+1 503 555 0150", revenue: 67000, stage: "New", priority: "Low", assignee: "Jordan Lee", notes: "Referred via partner network.", followUp: "2026-06-06" },
];

export const aiInsights = [
  { type: "prediction", title: "Quanta likely to close", body: "94% conversion probability based on engagement.", tone: "success" },
  { type: "risk", title: "3 risky leads detected", body: "No activity in 14+ days. Recommend re-engagement.", tone: "warning" },
  { type: "missing", title: "8 missing follow-ups", body: "Promised callbacks past due date.", tone: "danger" },
  { type: "rec", title: "Reassign 2 deals", body: "Maya is overloaded; redistribute to Jordan.", tone: "info" },
];

export const performers = [
  { id: 1, name: "Alex Chen", role: "Senior AE", deals: 24, revenue: 412000, productivity: 96, status: "active", avatar: "AC", department: "Sales" },
  { id: 2, name: "Maya Singh", role: "Account Executive", deals: 19, revenue: 318000, productivity: 91, status: "remote", avatar: "MS", department: "Sales" },
  { id: 3, name: "Jordan Lee", role: "SDR", deals: 31, revenue: 184000, productivity: 88, status: "active", avatar: "JL", department: "Sales" },
  { id: 4, name: "Priya Raman", role: "Solutions Eng", deals: 12, revenue: 240000, productivity: 84, status: "remote", avatar: "PR", department: "Engineering" },
  { id: 5, name: "Tom Becker", role: "Designer", deals: 0, revenue: 0, productivity: 78, status: "on-leave", avatar: "TB", department: "Design" },
  { id: 6, name: "Lena Wu", role: "Product Manager", deals: 0, revenue: 0, productivity: 93, status: "active", avatar: "LW", department: "Product" },
  { id: 7, name: "Marcus Bell", role: "Support Lead", deals: 0, revenue: 0, productivity: 87, status: "active", avatar: "MB", department: "Support" },
  { id: 8, name: "Sarah Mitchell", role: "Marketing Lead", deals: 0, revenue: 0, productivity: 90, status: "remote", avatar: "SM", department: "Marketing" },
];

export const sops = [
  { id: 1, title: "Enterprise Lead Qualification", category: "Sales", status: "Active", priority: "High", version: "v3.2", creator: "Alex Chen", created: "2026-03-12", tags: ["BANT", "Enterprise"], description: "Comprehensive playbook for qualifying enterprise inbound leads.", steps: ["Receive lead in CRM", "Assign within 2 minutes", "Research company background", "Outbound call within 4 hours", "Confirm budget & authority", "Identify pain points", "Schedule discovery call", "Send recap email", "Log in CRM with notes", "Move to next stage or disqualify"] },
  { id: 2, title: "Customer Onboarding", category: "Support", status: "Active", priority: "Critical", version: "v2.1", creator: "Marcus Bell", created: "2026-02-20", tags: ["Onboarding"], description: "Day-0 through day-30 onboarding workflow.", steps: ["Send welcome email", "Schedule kickoff", "Provision workspace", "Walk through admin setup", "Configure integrations", "Train end users", "Set first success milestone", "Weekly check-in calls", "Capture NPS at day 14", "Handover to CSM at day 30"] },
  { id: 3, title: "Design Review Protocol", category: "Design", status: "Draft", priority: "Medium", version: "v1.0", creator: "Tom Becker", created: "2026-05-01", tags: ["Design", "Review"], description: "Standardized critique flow for design proposals.", steps: ["Submit Figma link", "Auto-notify reviewers", "Async comments 48h", "Sync review meeting", "Categorize feedback", "Owner consolidates", "Revisions and rationale", "Final approval", "Archive in DAM", "Post-mortem"] },
  { id: 4, title: "Production Incident Response", category: "Engineering", status: "Active", priority: "Critical", version: "v4.0", creator: "Priya Raman", created: "2026-01-10", tags: ["SRE", "On-call"], description: "Five-nines incident triage and recovery.", steps: ["Page on-call", "Open war room", "Identify blast radius", "Mitigate immediately", "Communicate status", "Root cause analysis", "Customer comms", "Postmortem doc", "Action items in tracker", "Drill again in 30 days"] },
  { id: 5, title: "Campaign Launch", category: "Marketing", status: "Review", priority: "Medium", version: "v2.0", creator: "Sarah Mitchell", created: "2026-04-22", tags: ["Campaign"], description: "Cross-channel marketing campaign rollout.", steps: ["Define objective & KPIs", "Audience segmentation", "Creative production", "Legal approval", "QA preview", "Schedule across channels", "Launch", "Real-time monitoring", "Mid-campaign optimization", "Post-campaign report"] },
  { id: 6, title: "Product Discovery Sprint", category: "Product", status: "Active", priority: "High", version: "v1.4", creator: "Lena Wu", created: "2026-03-30", tags: ["Discovery"], description: "Two-week opportunity assessment framework.", steps: ["Define problem space", "Stakeholder interviews", "Competitive landscape", "Customer interviews x10", "Synthesize insights", "Prioritize opportunities", "Prototype concepts", "Usability tests", "Go/no-go decision", "Roadmap entry"] },
];

export const sopCategories = [
  { name: "All SOPs",       count: 186, color: "primary" },
  { name: "Sales Call",     count: 38,  color: "primary" },
  { name: "After Call",     count: 29,  color: "info" },
  { name: "During Meeting", count: 21,  color: "chart-5" },
  { name: "After Meeting",  count: 44,  color: "success" },
  { name: "After Closing",  count: 27,  color: "warning" },
];

export const pipelineStages = ["New", "Contacted", "Qualified", "Proposal Sent", "Negotiation", "Closed Won", "Closed Lost"];

export const pipelineLeads = [
  { id: 1, company: "Acme Corp", contact: "Sarah Mitchell", revenue: 84000, stage: "Qualified", priority: "High", assignee: "AC", probability: 65 },
  { id: 2, company: "Nimbus Labs", contact: "David Park", revenue: 142000, stage: "Negotiation", priority: "High", assignee: "MS", probability: 80 },
  { id: 3, company: "Helix AI", contact: "Priya Raman", revenue: 56000, stage: "Proposal Sent", priority: "Medium", assignee: "JL", probability: 55 },
  { id: 4, company: "Vector Studios", contact: "Tom Becker", revenue: 38000, stage: "Contacted", priority: "Medium", assignee: "MS", probability: 30 },
  { id: 5, company: "Quanta", contact: "Lena Wu", revenue: 210000, stage: "Qualified", priority: "Critical", assignee: "AC", probability: 70 },
  { id: 6, company: "Orbit Health", contact: "Marcus Bell", revenue: 67000, stage: "New", priority: "Low", assignee: "JL", probability: 20 },
  { id: 7, company: "Beacon Logistics", contact: "Karen Yu", revenue: 96000, stage: "Closed Won", priority: "High", assignee: "AC", probability: 100 },
  { id: 8, company: "Sable Finance", contact: "Ravi Kapoor", revenue: 124000, stage: "Negotiation", priority: "High", assignee: "MS", probability: 75 },
  { id: 9, company: "Pylon", contact: "Aria Reyes", revenue: 47000, stage: "Closed Lost", priority: "Low", assignee: "JL", probability: 0 },
  { id: 10, company: "Pebble HR", contact: "Mike Tran", revenue: 33000, stage: "New", priority: "Medium", assignee: "MS", probability: 15 },
  { id: 11, company: "Lumen Energy", contact: "Eva Holm", revenue: 188000, stage: "Proposal Sent", priority: "High", assignee: "AC", probability: 60 },
  { id: 12, company: "Crate Studio", contact: "Owen Park", revenue: 22000, stage: "Contacted", priority: "Low", assignee: "JL", probability: 25 },
];

export const salesKpis = [
  { label: "Leads Assigned", value: "450", change: "+45" },
  { label: "Calls Done", value: "320", change: "+24" },
  { label: "Qualified Leads", value: "146", change: "+12" },
  { label: "Meetings Done", value: "45", change: "+5" },
  { label: "Proposal Sent", value: "62", change: "+8" },
  { label: "Revenue", value: "₹1.24Cr", change: "+18%" }
];

export const revenueSeries = [
  { month: "Jan", revenue: 82, forecast: 78 },
  { month: "Feb", revenue: 94, forecast: 90 },
  { month: "Mar", revenue: 110, forecast: 105 },
  { month: "Apr", revenue: 128, forecast: 120 },
  { month: "May", revenue: 142, forecast: 138 },
  { month: "Jun", revenue: 168, forecast: 155 },
  { month: "Jul", revenue: 184, forecast: 172 },
  { month: "Aug", revenue: 201, forecast: 190 },
  { month: "Sep", revenue: 218, forecast: 210 },
  { month: "Oct", revenue: 240, forecast: 228 },
  { month: "Nov", revenue: 262, forecast: 248 },
  { month: "Dec", revenue: 284, forecast: 270 },
];

export const conversionSeries = [
  { name: "New", value: 380 },
  { name: "Contacted", value: 240 },
  { name: "Qualified", value: 146 },
  { name: "Proposal", value: 86 },
  { name: "Negotiation", value: 52 },
  { name: "Won", value: 34 },
];

export const departmentDistribution = [
  { name: "Sales", value: 38 },
  { name: "Engineering", value: 44 },
  { name: "Marketing", value: 18 },
  { name: "Design", value: 14 },
  { name: "Support", value: 22 },
];

export const incentives = [
  { id: 1, employee: "Alex Chen", revenue: 412000, meetings: 38, conversion: 28, multiplier: 1.4, incentive: 18540, bonus: 4200, payout: 22740, status: "Paid" },
  { id: 2, employee: "Maya Singh", revenue: 318000, meetings: 32, conversion: 24, multiplier: 1.3, incentive: 13260, bonus: 3100, payout: 16360, status: "Approved" },
  { id: 3, employee: "Jordan Lee", revenue: 184000, meetings: 44, conversion: 18, multiplier: 1.1, incentive: 8120, bonus: 1800, payout: 9920, status: "Pending" },
  { id: 4, employee: "Priya Raman", revenue: 240000, meetings: 21, conversion: 30, multiplier: 1.25, incentive: 10800, bonus: 2400, payout: 13200, status: "Paid" },
];

export const incentiveSlabs = [
  { tier: "Bronze", min: 0, max: 100000, rate: "3%", color: "muted" },
  { tier: "Silver", min: 100000, max: 250000, rate: "4.5%", color: "info" },
  { tier: "Gold", min: 250000, max: 400000, rate: "6%", color: "warning" },
  { tier: "Platinum", min: 400000, max: Infinity, rate: "8%", color: "primary" },
];

export const incentiveTrend = [
  { month: "Jan", paid: 12000, projected: 14000 },
  { month: "Feb", paid: 18000, projected: 19000 },
  { month: "Mar", paid: 22000, projected: 24000 },
  { month: "Apr", paid: 28000, projected: 30000 },
  { month: "May", paid: 32000, projected: 35000 },
  { month: "Jun", paid: 38000, projected: 40000 },
  { month: "Jul", paid: 44000, projected: 47000 },
  { month: "Aug", paid: 48000, projected: 50000 },
  { month: "Sep", paid: 53000, projected: 56000 },
  { month: "Oct", paid: 61000, projected: 64000 },
  { month: "Nov", paid: 68000, projected: 72000 },
  { month: "Dec", paid: 74000, projected: 78000 },
];

export const notifications = [
  { id: 1, title: "New lead assigned", body: "Quanta has been assigned to you.", time: "2m", unread: true },
  { id: 2, title: "Proposal approved", body: "Nimbus Labs accepted the proposal.", time: "1h", unread: true },
  { id: 3, title: "SOP updated", body: "Customer Onboarding v2.1 published.", time: "3h", unread: false },
  { id: 4, title: "Meeting in 30 min", body: "Discovery call with Helix AI.", time: "5h", unread: false },
];

export const activities = [
  { id: 1, user: "Alex Chen", action: "closed", target: "Beacon Logistics", time: "12 minutes ago" },
  { id: 2, user: "Maya Singh", action: "added note to", target: "Nimbus Labs", time: "1 hour ago" },
  { id: 3, user: "Jordan Lee", action: "moved", target: "Vector Studios → Contacted", time: "2 hours ago" },
  { id: 4, user: "Priya Raman", action: "published SOP", target: "Production Incident Response", time: "4 hours ago" },
  { id: 5, user: "Lena Wu", action: "scheduled meeting with", target: "Quanta", time: "yesterday" },
];
