import toast from "react-hot-toast";
import { Link } from "react-router-dom";
import { ArrowLeftRight } from "lucide-react";
import useIsMobile from "../../lib/useIsMobile.js";
import { GlassCard } from "../../components/Primitives.jsx";
import { useEmployee } from "../../context/EmployeeContext.jsx";
import { BtnPrimary, BtnSecondary, FormLabel, FormInput, FormSelect, FormGroup, EmployeeDoodleAvatar } from "../components/EmpUI.jsx";

export default function EmployeeProfile() {
  const { employee } = useEmployee();
  const isMobile = useIsMobile();

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4 md:gap-5 page-shell min-w-0 animate-fade-in">
      <GlassCard className="p-3 sm:p-4 md:p-5">
        <div className="flex items-center gap-3 sm:gap-4 mb-4 sm:mb-6">
          <EmployeeDoodleAvatar size={isMobile ? 48 : 64} />
          <div className="min-w-0">
            <h2 className="font-display text-base sm:text-xl font-bold text-slate-900 truncate">{employee.name}</h2>
            <p className="text-xs sm:text-sm text-slate-500">{employee.role}</p>
            <p className="text-[10px] sm:text-xs font-bold text-rose-600 mt-1">{employee.department}</p>
          </div>
        </div>
        {[
          { l: "Email", v: employee.email },
          { l: "Phone", v: employee.phone },
          { l: "Joining Date", v: new Date(employee.joiningDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) },
        ].map((row) => (
          <div key={row.l} className="flex flex-col sm:flex-row sm:justify-between gap-0.5 sm:gap-2 py-2.5 sm:py-3 border-b border-rose-50 text-xs sm:text-sm">
            <span className="text-slate-500 font-semibold">{row.l}</span>
            <span className="font-bold text-slate-900 break-all sm:text-right">{row.v}</span>
          </div>
        ))}
      </GlassCard>

      <GlassCard className="p-3 sm:p-4 md:p-5">
        <h3 className="font-display font-bold text-slate-900 mb-3 sm:mb-4 text-sm sm:text-base">Preferences</h3>
        <FormGroup><FormLabel>Display Name</FormLabel><FormInput defaultValue={employee.name} /></FormGroup>
        <FormGroup><FormLabel>Notification Reminder (hrs)</FormLabel><FormInput type="number" defaultValue={24} /></FormGroup>
        <FormGroup>
          <FormLabel>Default Meeting Platform</FormLabel>
          <FormSelect><option>Zoom</option><option>Google Meet</option><option>Teams</option></FormSelect>
        </FormGroup>
        <BtnPrimary className="w-full justify-center mb-3" onClick={() => toast.success("Profile saved")}>Save Profile</BtnPrimary>
        <Link to="/" className="block">
          <BtnSecondary className="w-full justify-center">
            <ArrowLeftRight className="w-4 h-4" /> Switch to Admin Panel
          </BtnSecondary>
        </Link>
      </GlassCard>
    </div>
  );
}
