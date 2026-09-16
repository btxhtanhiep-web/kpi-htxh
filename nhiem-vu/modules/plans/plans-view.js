import { renderKpiWorkflow } from "../kpi/kpi-workflow.js?v=20260916.V1_24_7_HTXH_1";
export async function renderPlansView(outlet) {
  await renderKpiWorkflow(outlet, { mode: "plans" });
}
