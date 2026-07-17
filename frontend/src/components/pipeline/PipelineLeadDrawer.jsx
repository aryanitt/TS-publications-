import { useEffect, useMemo, useState } from "react";
import { Drawer } from "../Primitives.jsx";
import LeadDetailPanel from "../leads/LeadDetailPanel.jsx";
import {
  apiLeadToPipeline,
  fetchLeadForPipelineCard,
  normalizeLeadForDetailPanel,
  resolvePipelineCardLeadLocal,
} from "../../lib/leadSync.js";
import { getAdminCrmHeaders } from "../../lib/crmContext.js";

export default function PipelineLeadDrawer({ open, onClose, lead, calls = [] }) {
  const [resolvedLead, setResolvedLead] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  useEffect(() => {
    if (!lead) {
      setResolvedLead(null);
      setLoadingDetail(false);
      return undefined;
    }

    const local = resolvePipelineCardLeadLocal(lead, { leads: [], periodCalls: calls });
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
          periodCalls: calls,
          headers: getAdminCrmHeaders(),
          mapLead: apiLeadToPipeline,
        });
        if (!cancelled) setResolvedLead(fetched);
      } finally {
        if (!cancelled) setLoadingDetail(false);
      }
    })();

    return () => { cancelled = true; };
  }, [lead, calls]);

  const liveLead = useMemo(
    () => normalizeLeadForDetailPanel(resolvedLead || lead),
    [resolvedLead, lead],
  );

  if (!lead) return null;

  const crmId = liveLead?._dbId ?? (/^\d+$/.test(String(liveLead?.id)) ? liveLead.id : null);
  const editLeadsHref = crmId ? `/leads?leadId=${crmId}` : null;

  return (
    <Drawer open={open} onClose={onClose} title={liveLead?.name || "Lead Details"}>
      {loadingDetail && !crmId ? (
        <p className="text-sm text-slate-400 text-center py-8">Loading lead details…</p>
      ) : liveLead ? (
        <LeadDetailPanel
          liveLead={liveLead}
          variant="admin"
          showReassignment={false}
          readOnly
          pipelineView
          editLeadsHref={editLeadsHref}
          onClose={onClose}
          calls={calls}
        />
      ) : (
        <p className="text-sm text-slate-400 text-center py-8">No CRM lead found for this number.</p>
      )}
    </Drawer>
  );
}
