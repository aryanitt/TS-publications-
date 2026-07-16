import { useMemo, useCallback } from "react";
import toast from "react-hot-toast";
import { Drawer } from "../Primitives.jsx";
import LeadDetailPanel from "../leads/LeadDetailPanel.jsx";
import {
  normalizeLeadForDetailPanel,
  employeeStagePatch,
  temperatureToApi,
} from "../../lib/leadSync.js";
import { mapStageToId } from "../../lib/pipelineStages.js";
import { apiPut, apiPatch, invalidateCache } from "../../lib/api.js";
import { getAdminCrmHeaders } from "../../lib/crmContext.js";
import { getStageMeta } from "../../data/pipelineMock.js";

export default function PipelineLeadDrawer({ open, onClose, lead, onUpdateLead, onStageChange }) {
  const liveLead = useMemo(() => normalizeLeadForDetailPanel(lead), [lead]);

  const handleSave = useCallback(async (updates) => {
    if (!lead?.id) return;

    const payload = {};
    if (updates.phone !== undefined) payload.phone = updates.phone;
    if (updates.email !== undefined) payload.email = updates.email;
    if (updates.company !== undefined) payload.companyName = updates.company;
    if (updates.city !== undefined) payload.city = updates.city;
    if (updates.source !== undefined) payload.source = updates.source;
    if (updates.service !== undefined || updates.requirements !== undefined) {
      payload.requirements = updates.service ?? updates.requirements;
    }
    if (updates.expectedRevenue !== undefined) {
      payload.expectedRevenue = Number(updates.expectedRevenue) || 0;
    }

    const headers = getAdminCrmHeaders();
    const dbId = lead._dbId || lead.id;

    if (Object.keys(payload).length) {
      await apiPut(`/api/v1/leads/${dbId}`, payload, { headers });
    }

    let nextStageId = lead.stage;
    if (updates.stage || updates.pipelineStage) {
      const stageLabel = updates.stage || updates.pipelineStage;
      const stagePatch = employeeStagePatch(stageLabel, lead.status);
      await apiPatch(`/api/v1/leads/${dbId}/stage`, {
        stage: stageLabel,
        status: stagePatch.employeeStatus || stageLabel,
      }, { headers });
      nextStageId = mapStageToId(stageLabel, lead.status);
    }

    invalidateCache("/api/v1");
    invalidateCache("/api/dashboard");

    const revenue = Number(updates.expectedRevenue ?? liveLead.expectedRevenue) || 0;
    const updated = {
      ...lead,
      phone: updates.phone ?? lead.phone,
      email: updates.email ?? lead.email,
      company: updates.company ?? lead.company,
      city: updates.city ?? lead.city,
      source: updates.source ?? lead.source,
      value: revenue,
      stage: nextStageId,
      updatedAt: new Date().toISOString(),
    };

    onUpdateLead?.(updated);
    if (nextStageId !== lead.stage) {
      onStageChange?.(nextStageId, lead.id);
      toast.success(`Moved to ${getStageMeta(nextStageId).label}`);
    }
  }, [lead, liveLead.expectedRevenue, liveLead?.id, liveLead?.status, onUpdateLead, onStageChange]);

  const handleTemperatureChange = useCallback(async (nextStatus) => {
    if (!lead?.id || nextStatus === liveLead.status) return;
    const headers = getAdminCrmHeaders();
    const dbId = lead._dbId || lead.id;
    await apiPut(`/api/v1/leads/${dbId}`, {
      temperature: temperatureToApi(nextStatus),
    }, { headers });
    invalidateCache("/api/v1");
    onUpdateLead?.({ ...lead, temperature: temperatureToApi(nextStatus), status: nextStatus });
  }, [lead, liveLead.status, onUpdateLead]);

  if (!lead) return null;

  return (
    <Drawer open={open} onClose={onClose} title={liveLead?.name || "Lead Details"}>
      <LeadDetailPanel
        liveLead={liveLead}
        variant="admin"
        showReassignment={false}
        onClose={onClose}
        onSave={handleSave}
        onTemperatureChange={handleTemperatureChange}
      />
    </Drawer>
  );
}
