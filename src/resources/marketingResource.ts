/**
 * Marketing Orchestration Resource
 * Serves marketing orchestration content via websets:// URI with parameterization
 */

import { marketingOrchestration } from "../prompts/marketingOrchestration.js";

export const MARKETING_URI = "websets://orchestrations/marketing";

export interface MarketingResourceParams {
  companyName?: string;
  targetAudience?: string;
  timeframe?: string;
}

/**
 * Resolve marketing orchestration resource with query parameters
 */
export async function resolveMarketingResource(uri: URL): Promise<{
  uri: string;
  name: string;
  mimeType: string;
  text: string;
}> {
  const params = new URLSearchParams(uri.search);
  
  const companyName = params.get("companyName") || "Your Company";
  const targetAudience = params.get("targetAudience") || undefined;
  const timeframe = params.get("timeframe") || undefined;

  const markdown = await marketingOrchestration(companyName, targetAudience, timeframe);

  return {
    uri: uri.toString(),
    name: `Marketing Orchestration: ${companyName}`,
    mimeType: "text/markdown",
    text: markdown
  };
}
