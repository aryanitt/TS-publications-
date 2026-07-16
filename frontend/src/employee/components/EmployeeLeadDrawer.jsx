import { useMemo } from "react";
import { Drawer } from "../../components/Primitives.jsx";
import { useEmployee } from "../../context/EmployeeContext.jsx";
import LeadDetailPanel from "../../components/leads/LeadDetailPanel.jsx";

export default function EmployeeLeadDrawer({ lead, onClose }) {
  const {
    calls = [],
    activities = {},
    leads = [],
    employee,
    reassignLead,
    teamEmployees,
    refreshTeamEmployees,
    updateLeadTemperature,
    addActivityRecord,
    startCallyzerCall,
    editLeadDetails,
  } = useEmployee();

  const liveLead = useMemo(
    () => leads.find((l) => l.id === lead?.id) || lead,
    [leads, lead],
  );

  if (!lead) return null;

  return (
    <Drawer open={!!lead} onClose={onClose} title={liveLead.name}>
      <LeadDetailPanel
        liveLead={liveLead}
        variant="employee"
        showReassignment
        onClose={onClose}
        onSave={(updates) => editLeadDetails(liveLead.id, updates)}
        calls={calls}
        activities={activities}
        employee={employee}
        reassignLead={reassignLead}
        teamEmployees={teamEmployees}
        refreshTeamEmployees={refreshTeamEmployees}
        updateLeadTemperature={updateLeadTemperature}
        addActivityRecord={addActivityRecord}
        startCallyzerCall={startCallyzerCall}
      />
    </Drawer>
  );
}
