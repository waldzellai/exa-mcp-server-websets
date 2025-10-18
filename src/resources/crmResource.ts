/**
 * CRM Orchestration Resource
 * Serves CRM/lead discovery orchestration content via websets:// URI with parameterization
 */

import { crmOrchestration } from "../prompts/crmOrchestration.js";

export const CRM_URI = "websets://orchestrations/crm";

export interface CRMResourceParams {
  idealCustomerProfile?: string;
  region?: string;
  intentSignals?: string;
}

/**
 * Resolve CRM orchestration resource with query parameters
 */
export async function resolveCRMResource(uri: URL): Promise<{
  uri: string;
  name: string;
  mimeType: string;
  text: string;
}> {
  const params = new URLSearchParams(uri.search);
  
  const idealCustomerProfile = params.get("idealCustomerProfile") || "Mid-market SaaS";
  const region = params.get("region") || undefined;
  const intentSignals = params.get("intentSignals") || undefined;

  const markdown = await crmOrchestration(idealCustomerProfile, region, intentSignals);

  return {
    uri: uri.toString(),
    name: `CRM Orchestration: ${idealCustomerProfile}`,
    mimeType: "text/markdown",
    text: markdown
  };
}
