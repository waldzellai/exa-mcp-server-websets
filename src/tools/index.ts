// Export the tool registry and configuration
export { toolRegistry, ToolFactory, ToolCategory, ServiceType } from "./config.js";

// Import all EXA search tools to register them
import "./webSearch.js";
import "./researchPaperSearch.js";
import "./companyResearch.js";
import "./crawling.js";
import "./competitorFinder.js";
import "./linkedInSearch.js";
import "./wikipediaSearch.js";
import "./githubSearch.js";

// Import EXA-specific search tools
import "./exa-search/webSearch.js";

// Import unified websets manager (preferred over individual tools)
import "./websetsManager.js";
import "./websetsGuide.js";

// Import all Websets tools to register them (legacy - use websetsManager instead)
import "./websets/websetCreate.js";
import "./websets/websetGetStatus.js";
import "./websets/websetListItems.js";
import "./websets/websetUpdate.js";
import "./websets/websetDelete.js";
import "./websets/websetCancel.js";
import "./websets/searchCreate.js";
import "./websets/searchGet.js";
import "./websets/searchCancel.js";
import "./websets/enrichmentCreate.js";
import "./websets/enrichmentGet.js";
import "./websets/enrichmentDelete.js";
import "./websets/enrichmentCancel.js";
import "./websets/webhookCreate.js";
import "./websets/webhookGet.js";
import "./websets/webhookDelete.js";
import "./websets/webhookList.js";
import "./websets/eventList.js";
import "./websets/eventGet.js";

// When adding a new tool, import it here
// import "./newTool.js";