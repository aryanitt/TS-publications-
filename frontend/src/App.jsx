import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import AppLayout from "./layouts/AppLayout.jsx";
import EmployeeLayout from "./employee/layouts/EmployeeLayout.jsx";
import PageLoader from "./components/PageLoader.jsx";

const Dashboard = lazy(() => import("./pages/Dashboard.jsx"));
const SOP = lazy(() => import("./pages/SOP.jsx"));
const Sales = lazy(() => import("./pages/Sales.jsx"));
const Team = lazy(() => import("./pages/Team.jsx"));
const Reports = lazy(() => import("./pages/Reports.jsx"));
const Incentives = lazy(() => import("./pages/Incentives.jsx"));
const Settings = lazy(() => import("./pages/Settings.jsx"));
const Admin = lazy(() => import("./pages/Admin.jsx"));
const Leads = lazy(() => import("./pages/Leads.jsx"));
const Forms = lazy(() => import("./pages/Forms.jsx"));
const Services = lazy(() => import("./pages/Services.jsx"));
const Pipeline = lazy(() => import("./pages/Pipeline.jsx"));

const EmployeeDashboard = lazy(() => import("./employee/pages/EmployeeDashboard.jsx"));
const EmployeeTasks = lazy(() => import("./employee/pages/EmployeeTasks.jsx"));
const EmployeeFollowUps = lazy(() => import("./employee/pages/EmployeeFollowUps.jsx"));
const EmployeeCalls = lazy(() => import("./employee/pages/EmployeeCalls.jsx"));
const EmployeeCallDetail = lazy(() => import("./employee/pages/EmployeeCallDetail.jsx"));
const EmployeeLeads = lazy(() => import("./employee/pages/EmployeeLeads.jsx"));
const EmployeeSalesProcess = lazy(() => import("./employee/pages/EmployeeSalesProcess.jsx"));
const EmployeeSopDetail = lazy(() => import("./employee/pages/EmployeeSopDetail.jsx"));
const EmployeeCallAssistant = lazy(() => import("./employee/pages/EmployeeCallAssistant.jsx"));
const EmployeeAssets = lazy(() => import("./employee/pages/EmployeeAssets.jsx"));
const EmployeeMeetings = lazy(() => import("./employee/pages/EmployeeMeetings.jsx"));
const EmployeeProfile = lazy(() => import("./employee/pages/EmployeeProfile.jsx"));
const EmployeePipeline = lazy(() => import("./employee/pages/EmployeePipeline.jsx"));

export default function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route element={<AppLayout />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/sop" element={<SOP />} />
            <Route path="/sales" element={<Sales />} />
            <Route path="/team" element={<Team />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/incentives" element={<Incentives />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="/leads" element={<Leads />} />
            <Route path="/pipeline" element={<Pipeline />} />
            <Route path="/forms/*" element={<Forms />} />
            <Route path="/services/*" element={<Services />} />
          </Route>

          <Route path="/employee" element={<EmployeeLayout />}>
            <Route index element={<EmployeeDashboard />} />
            <Route path="tasks" element={<EmployeeTasks />} />
            <Route path="follow-ups" element={<EmployeeFollowUps />} />
            <Route path="calls" element={<EmployeeCalls />} />
            <Route path="call-detail" element={<EmployeeCallDetail />} />
            <Route path="leads" element={<EmployeeLeads />} />
            <Route path="pipeline" element={<EmployeePipeline />} />
            <Route path="sales-process" element={<EmployeeSalesProcess />} />
            <Route path="sales-process/:sopId" element={<EmployeeSopDetail />} />
            <Route path="call-assistant" element={<EmployeeCallAssistant />} />
            <Route path="assets" element={<EmployeeAssets />} />
            <Route path="meetings" element={<EmployeeMeetings />} />
            <Route path="profile" element={<EmployeeProfile />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
