/**
 * Orchestration Resources Registry
 * Provides unified resource resolution for marketing, CRM, and hiring orchestrations
 */

import { resolveMarketingResource, MARKETING_URI } from "./marketingResource.js";
import { resolveCRMResource, CRM_URI } from "./crmResource.js";
import { resolveHiringResource, HIRING_URI } from "./hiringResource.js";

export const ORCHESTRATION_URIS = [MARKETING_URI, CRM_URI, HIRING_URI];

/**
 * Resolve an orchestration resource by URI
 */
export async function resolveOrchestrationResource(
  uri: string
): Promise<{
  uri: string;
  name: string;
  mimeType: string;
  text: string;
} | null> {
  try {
    const parsedUri = new URL(uri);
    const pathname = parsedUri.pathname;

    if (pathname === "/orchestrations/marketing") {
      return await resolveMarketingResource(parsedUri);
    } else if (pathname === "/orchestrations/crm") {
      return await resolveCRMResource(parsedUri);
    } else if (pathname === "/orchestrations/hiring") {
      return await resolveHiringResource(parsedUri);
    }

    return null;
  } catch (error) {
    console.error(`Failed to resolve orchestration resource: ${uri}`, error);
    return null;
  }
}

/**
 * Get all available orchestration resource URIs
 */
export function listOrchestrationResources(): Array<{
  uri: string;
  name: string;
  description: string;
}> {
  return [
    {
      uri: MARKETING_URI,
      name: "Marketing Orchestration",
      description: "Competitor monitoring, brand health tracking, share of voice analysis. Query params: companyName, targetAudience, timeframe"
    },
    {
      uri: CRM_URI,
      name: "CRM Orchestration",
      description: "Lead discovery, account-based marketing, intent scoring. Query params: idealCustomerProfile, region, intentSignals"
    },
    {
      uri: HIRING_URI,
      name: "Hiring Orchestration",
      description: "Recruiter and job seeker workflows. Query params: mode (recruiter|job_seeker), role, location, seniority, keywords"
    }
  ];
}
