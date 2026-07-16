import { useMemo, useCallback } from "react";
import { Drawer } from "../Primitives.jsx";
import LeadDetailPanel from "./LeadDetailPanel.jsx";
import {
  normalizeLeadForDetailPanel,
  apiLeadToAdmin,
  employeeStagePatch,
  temperatureToApi,
} from "../../lib/leadSync.js";
import { apiGet, apiPut, apiPatch, invalidateCache } from "../../lib/api.js";
import { getAdminCrmHeaders } from "../../lib/crmContext.js";
import { formatEmpPipelineValue } from "../../data/employeeMock.js";

export default function LeadDetailDrawer({
  open,
  onClose,
  lead,
  onLeadUpdated,
}) {
  const liveLead = useMemo(() => normalizeLeadForDetailPanel(lead), [lead]);

  const handleSave = useCallback(async (updates) => {
    if (!liveLead?.id) return;

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

    if (Object.keys(payload).length) {
      await apiPut(`/api/v1/leads/${liveLead.id}`, payload, { headers });
    }

    if (updates.stage || updates.pipelineStage) {
      const stageLabel = updates.stage || updates.pipelineStage;
      const stagePatch = employeeStagePatch(stageLabel, liveLead.status);
      await apiPatch(`/api/v1/leads/${liveLead.id}/stage`, {
        stage: stageLabel,
        status: stagePatch.employeeStatus || stageLabel,
      }, { headers });
    }

    invalidateCache("/api/v1");
    invalidateCache("/api/sales");

    const res = await apiGet(`/api/v1/leads/${liveLead.id}`, { headers, skipCache: true, cacheTtl: 0 });
    const updatedAdmin = apiLeadToAdmin(res?.data || res);
    const revenue = Number(updatedAdmin.expected_revenue) || 0;

    onLeadUpdated?.({
      ...updatedAdmin,
      budget: revenue > 0 ? formatEmpPipelineValue(revenue) : "—",
    });
  }, [liveLead?.id, liveLead?.status, onLeadUpdated]);

  const handleTemperatureChange = useCallback(async (nextStatus) => {
    if (!liveLead?.id || nextStatus === liveLead.status) return;
    const headers = getAdminCrmHeaders();
    await apiPut(`/api/v1/leads/${liveLead.id}`, {
      temperature: temperatureToApi(nextStatus),
    }, { headers });
    invalidateCache("/api/v1");
    onLeadUpdated?.({
      ...lead,
      temperature: temperatureToApi(nextStatus),
      status: nextStatus,
    });
  }, [liveLead?.id, liveLead?.status, lead, onLeadUpdated]);

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
