import { useMemo } from "react";
import { Drawer } from "../Primitives.jsx";
import LeadDetailPanel from "../leads/LeadDetailPanel.jsx";
import { normalizeLeadForDetailPanel } from "../../lib/leadSync.js";

export default function PipelineLeadDrawer({ open, onClose, lead, calls = [] }) {
  const liveLead = useMemo(() => normalizeLeadForDetailPanel(lead), [lead]);

  if (!lead) return null;

  return (
    <Drawer open={open} onClose={onClose} title={liveLead?.name || "Lead Details"}>
      <LeadDetailPanel
        liveLead={liveLead}
        variant="admin"
        showReassignment={false}
        readOnly
        onClose={onClose}
        calls={calls}
      />
    </Drawer>
  );
}
