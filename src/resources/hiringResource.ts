/**
 * Hiring Orchestration Resource
 * Serves hiring orchestration content via websets:// URI with parameterization
 * Supports both recruiter and job_seeker modes
 */

import { hiringOrchestration } from "../prompts/hiringOrchestration.js";

export const HIRING_URI = "websets://orchestrations/hiring";

export interface HiringResourceParams {
  mode?: "recruiter" | "job_seeker";
  role?: string;
  location?: string;
  seniority?: string;
  keywords?: string;
}

/**
 * Resolve hiring orchestration resource with query parameters
 */
export async function resolveHiringResource(uri: URL): Promise<{
  uri: string;
  name: string;
  mimeType: string;
  text: string;
}> {
  const params = new URLSearchParams(uri.search);
  
  const mode = (params.get("mode") as "recruiter" | "job_seeker") || "recruiter";
  const role = params.get("role") || "Software Engineer";
  const location = params.get("location") || undefined;
  const seniority = params.get("seniority") || undefined;
  const keywords = params.get("keywords") || undefined;

  const markdown = await hiringOrchestration(mode, role, location, seniority, keywords);

  const modeLabel = mode === "recruiter" ? "Recruiting" : "Job Seeking";
  return {
    uri: uri.toString(),
    name: `Hiring Orchestration: ${modeLabel} - ${role}`,
    mimeType: "text/markdown",
    text: markdown
  };
}
