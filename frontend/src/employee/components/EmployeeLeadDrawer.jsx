import { useEffect, useMemo, useState } from "react";
import { Drawer } from "../../components/Primitives.jsx";
import { useEmployee } from "../../context/EmployeeContext.jsx";
import LeadDetailPanel from "../../components/leads/LeadDetailPanel.jsx";
import {
  fetchLeadForPipelineCard,
  normalizeLeadForDetailPanel,
  resolvePipelineCardLeadLocal,
} from "../../lib/leadSync.js";
import { getCrmHeaders } from "../../lib/crmContext.js";

export default function EmployeeLeadDrawer({ lead, periodCalls = [], onClose }) {
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

  const [resolvedLead, setResolvedLead] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  useEffect(() => {
    if (!lead) {
      setResolvedLead(null);
      setLoadingDetail(false);
      return undefined;
    }

    const local = resolvePipelineCardLeadLocal(lead, { leads, periodCalls });
    setResolvedLead(local);

    const crmId = local?._dbId ?? local?.id;
    const hasLocalCrm = /^\d+$/.test(String(crmId));
    const needsFetch = Boolean(lead._fromCall) && !hasLocalCrm;

    if (!needsFetch) {
      setLoadingDetail(false);
      return undefined;
    }

    let cancelled = false;
    (async () => {
      setLoadingDetail(true);
      try {
        const fetched = await fetchLeadForPipelineCard(lead, {
          leads,
          periodCalls,
          headers: getCrmHeaders("employee"),
        });
        if (!cancelled) setResolvedLead(fetched);
      } finally {
        if (!cancelled) setLoadingDetail(false);
      }
    })();

    return () => { cancelled = true; };
  }, [lead, leads, periodCalls]);

  const liveLead = useMemo(() => {
    const base = resolvedLead || lead;
    if (!base) return null;
    const fromList = /^\d+$/.test(String(base.id))
      ? leads.find((l) => String(l.id) === String(base.id))
      : null;
    return normalizeLeadForDetailPanel(fromList || base);
  }, [leads, resolvedLead, lead]);

  if (!lead) return null;

  const detailReady = liveLead && /^\d+$/.test(String(liveLead._dbId ?? liveLead.id));
  const pipelineView = Boolean(lead._fromCall);
  const canEdit = detailReady && !pipelineView;
  const crmId = liveLead?._dbId ?? (detailReady ? liveLead.id : null);

  return (
    <Drawer open={!!lead} onClose={onClose} title={liveLead?.name || lead.name || "Lead Details"}>
      {loadingDetail && !detailReady ? (
        <p className="text-sm text-slate-400 text-center py-8">Loading lead details…</p>
      ) : liveLead ? (
        <LeadDetailPanel
          liveLead={liveLead}
          variant="employee"
          showReassignment={canEdit}
          pipelineView={pipelineView}
          onClose={onClose}
          readOnly={!canEdit}
          onSave={canEdit ? (updates) => editLeadDetails(liveLead._dbId ?? liveLead.id, updates) : undefined}
          calls={periodCalls.length ? periodCalls : calls}
          activities={activities}
          employee={employee}
          reassignLead={reassignLead}
          teamEmployees={teamEmployees}
          refreshTeamEmployees={refreshTeamEmployees}
          updateLeadTemperature={updateLeadTemperature}
          addActivityRecord={addActivityRecord}
          startCallyzerCall={startCallyzerCall}
        />
      ) : (
        <p className="text-sm text-slate-400 text-center py-8">No CRM lead found for this number.</p>
      )}
    </Drawer>
  );
}
