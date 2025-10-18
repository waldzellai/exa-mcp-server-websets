/**
 * Hiring Orchestration: Recruiter and Job Seeker Workflows
 * Helps recruiters source candidates and job seekers find opportunities
 */

export async function hiringOrchestration(
  mode: "recruiter" | "job_seeker",
  role: string,
  location?: string,
  seniority?: string,
  keywords?: string
): Promise<string> {
  const geo = location || "remote/global";
  const level = seniority || "mid-level to senior";
  const tags = keywords || "leadership, technical mentoring, innovation";

  if (mode === "recruiter") {
    return recruiterWorkflow(role, geo, level, tags);
  } else {
    return jobSeekerWorkflow(role, geo, level, tags);
  }
}

function recruiterWorkflow(role: string, location: string, seniority: string, keywords: string): string {
  return `# 🎯 Hiring Orchestration: Recruiter - Passive Candidate Sourcing

## What This Solves

Find passive candidates who fit your role requirements by analyzing their online presence, technical skills, and career trajectory. This orchestration helps recruiters:
- **Passive Candidate Sourcing**: Discover engineers, PMs, sales professionals in your target market
- **Skill Verification**: Confirm technical expertise through projects, open-source contributions, publications
- **Career Trajectory**: Identify who's ready for the next level
- **Cultural Fit Assessment**: Find candidates with values alignment
- **Contact Discovery**: Extract email patterns and LinkedIn profiles
- **Outreach Personalization**: Build targeted messaging based on their interests

## When to Use

✅ Recruiting for hard-to-fill technical roles
✅ Building talent pipelines for upcoming openings
✅ Competitive poaching and counterintelligence
✅ Referral program sourcing
✅ Senior leadership recruitment

## 🎯 TL;DR Quick Steps

1. 🔍 **Search**: Find passive candidates with your target skills/background
2. 🧰 **Create Webset**: Organize candidate profiles and mentions
3. ✨ **Enrich**: Extract skills, experience, and contact info
4. 📊 **Score**: Rank by fit and seniority
5. 📧 **Outreach**: Build personalized recruiting sequences

---

## 📋 Step-by-Step Workflow

### Step 1: Search for Passive Candidates

Search for people with your target role expertise, skills, and career signals.

**Tool**: \`web_search_exa\`

**Parameters**:
\`\`\`json
{
  "query": "${role} engineer (${keywords}) location:${location} site:github.com OR site:linkedin.com OR site:twitter.com OR site:medium.com",
  "numResults": 75,
  "timeRange": "365d",
  "waitForResults": true
}
\`\`\`

**Expected Output**: 
30-75 results with GitHub profiles, LinkedIn updates, blog posts, and social mentions of candidates matching your criteria.

---

### Step 2: Create a Candidate Webset

Organize candidate profiles into a persistent collection for tracking and enrichment.

**Tool**: \`websets_manager\`

**Parameters**:
\`\`\`json
{
  "operation": "create_webset_from_search",
  "name": "${role} Candidates - Sourcing Pool (${seniority})",
  "description": "Passive candidates for ${role} role. Seniority: ${seniority}. Location: ${location}. Key skills: ${keywords}. Profiles from GitHub, LinkedIn, blogs, and technical communities.",
  "searchQuery": "${role} engineer (${keywords}) location:${location} site:github.com OR site:linkedin.com OR site:twitter.com OR site:medium.com",
  "timeRange": "365d",
  "maxResults": 200
}
\`\`\`

**Expected Output**:
\`\`\`json
{
  "websetId": "ws_candidates_789",
  "status": "processing",
  "createdAt": "2024-01-10T09:00:00Z",
  "estimatedCompletion": "2024-01-10T09:40:00Z"
}
\`\`\`

---

### Step 3: Check Webset Status

Monitor until processing completes (usually 20-40 minutes).

**Tool**: \`websets_manager\`

**Parameters**:
\`\`\`json
{
  "operation": "get_webset_status",
  "websetId": "ws_candidates_789"
}
\`\`\`

**Expected Output**:
\`\`\`json
{
  "websetId": "ws_candidates_789",
  "status": "completed",
  "itemCount": 156,
  "completedAt": "2024-01-10T09:38:00Z"
}
\`\`\`

---

### Step 4: Extract Skills and Experience Data

Retrieve candidate profiles and extract skills, experience, and seniority indicators.

**Tool**: \`websets_manager\`

**Parameters** (Get items):
\`\`\`json
{
  "operation": "list_items",
  "websetId": "ws_candidates_789",
  "limit": 150,
  "offset": 0
}
\`\`\`

**Expected Output**: 
Array of 150 candidate items with \`url\`, \`title\`, \`text\`, \`source\` (GitHub/LinkedIn/blog).

**Tool**: \`websets_manager\`

**Parameters** (Enrich with skill extraction):
\`\`\`json
{
  "operation": "enhance_content",
  "websetId": "ws_candidates_789",
  "enhancements": [
    "extract_entities",
    "extract_skills",
    "summarize",
    "classify_experience_level"
  ],
  "waitForResults": true,
  "advanced": {
    "outputFormat": "json",
    "entityTypes": ["person", "skill", "company", "project"]
  }
}
\`\`\`

**Expected Output**:
Each candidate enriched with:
- \`entities.person\`: ["John Smith", ...]
- \`entities.skills\`: ["Python", "Kubernetes", "System Design", ...]
- \`entities.company\`: ["Google", "Meta", ...]
- \`entities.projects\`: ["Open-source ML library", ...]
- \`experience_level\`: "junior" | "mid" | "senior" | "staff"
- \`summary\`: Career highlight and current focus

---

### Step 5: Score and Tag Candidates

Use knowledge_graph to score candidates and prepare outreach messaging.

**Tool**: \`knowledge_graph\`

**Parameters** (Create candidate entities):
\`\`\`json
{
  "operation": "create_entities",
  "entities": [
    {
      "name": "John Smith",
      "entityType": "person",
      "observations": [
        "Experience Level: Senior",
        "Top Skills: Go, Distributed Systems, Kubernetes",
        "Current/Recent Company: Google",
        "GitHub Activity: High (50+ contributions last 3 months)",
        "Recent Blog Posts: 'Scaling to 1M QPS', 'Kubernetes Best Practices'",
        "Contact: john.smith@email.com, github.com/johnsmith",
        "Fit Score: 9/10 (expertise matches 90% of JD)",
        "Outreach Angle: Mention leadership opportunity in your recent blog post on distributed systems"
      ]
    }
  ]
\`\`\`

---

### Step 6: Export and Prepare Outreach List

Generate a prioritized list for recruiting outreach.

**Tool**: \`websets_manager\`

**Parameters**:
\`\`\`json
{
  "operation": "export_webset",
  "websetId": "ws_candidates_789",
  "format": "csv",
  "fields": ["name", "experience_level", "top_skills", "current_company", "github_profile", "blog_url", "contact_email", "fit_score"]
}
\`\`\`

**Expected Output**: CSV with:
- name, experience_level, top_skills, current_company, github_profile, blog_url, contact_email, fit_score

Then import into your ATS/recruiting platform or set up outreach sequences.

---

## 💡 Real-World Examples

### Example 1: Senior Backend Engineers at Scale-ups

**Goal**: Find 50+ senior engineers with distributed systems experience at growing tech companies.

**Search Query**:
\`\`\`
"backend engineer" OR "systems engineer" (golang OR rust OR distributed systems OR "high scale") location:Bay Area OR remote site:github.com OR site:linkedin.com seniority:senior
\`\`\`

**Enrichment Focus**: Extract tech stack, company, GitHub activity, recent projects

**Expected Result**: 40-80 candidates with verified skills, companies, and contact patterns

---

### Example 2: Product Managers Transitioning to Leadership

**Goal**: Find PMs ready to become Directors/VPs.

**Search Query**:
\`\`\`
"product manager" OR "senior PM" ("leading team" OR "mentoring" OR "strategic" OR "director" OR "VP product") location:${location} site:linkedin.com OR site:medium.com
\`\`\`

**Enrichment Focus**: Classify experience level, extract leadership signals, summarize impact

**Expected Result**: 20-40 PM candidates showing leadership readiness with mentoring/team-building experience

---

### Example 3: Startup Founders as Technical Co-Founders

**Goal**: Identify successful startup founders who might partner on a new venture.

**Search Query**:
\`\`\`
founder OR "co-founder" (exit OR acquisition OR "Series B" OR "Series C") (technical OR engineering OR CTO) site:github.com OR site:techcrunch.com OR site:producthunt.com
\`\`\`

**Enrichment Focus**: Extract exit details, technical skills, co-founder network

**Expected Result**: 15-30 technical founders with successful exit history

---

## 🎓 Best Practices

### Candidate Search & Sourcing
- Use platform-specific searches: GitHub for engineers, LinkedIn for all roles, Medium/blogs for thought leaders
- Include intent signals: "hiring", "open to", "looking", "available"
- Add seniority filters: "senior", "staff", "principal", "director"
- Combine hard skills (languages, frameworks) with soft skills (leadership, mentoring)

### Enrichment Strategy
- Prioritize \`extract_skills\` and \`extract_entities\` to build candidate profiles
- Use \`classify_experience_level\` to identify senior vs. junior candidates
- Run \`summarize\` to create talking points for outreach
- Use knowledge_graph to store custom scoring and outreach angles

### Candidate Scoring & Filtering
- Technical fit (skills match JD): 0-50 points
- Seniority fit (role matches level): 0-30 points
- Cultural fit (company background, values): 0-20 points
- Recency (active in last 3 months): +10 points if yes
- Total target: 80+ for outreach, 60-79 for nurture list

### Outreach Personalization
- Mention specific projects from GitHub (shows you researched them)
- Reference their blog posts or talks (high credibility signal)
- Lead with mission fit before role description
- Avoid generic recruiter messages; be specific about why they're a fit

### Passive Candidate Nurturing
- For candidates below 80 score, nurture with your company's technical blog posts
- Share articles on their interests (if they blog about Kubernetes, send relevant Kubernetes content)
- Engage on GitHub/social media first (stars, thoughtful comments) before direct outreach
- Build relationships over 2-3 months before pitching open role

---

## ⚠️ Troubleshooting

### Issue: Too many low-quality candidates

**Cause**: Search too broad or not filtering by seniority/skills correctly.

**Solution**:
- Add specific technology stacks: \`(golang AND kubernetes AND "distributed systems")\`
- Filter by company prestige: \`site:github.com/google OR site:github.com/meta\`
- Increase activity requirements: \`"100+ contributions last 90 days"\`

### Issue: Can't find email addresses

**Cause**: Most candidates don't publish email directly on GitHub/LinkedIn.

**Solution**:
- Use \`extract_entities\` with \`includeEmails: true\` to find patterns
- Check their personal website or blog (usually in GitHub bio)
- Build email pattern from company domain (firstname@company.com)
- Use email finder tool (Hunter, RocketReach) as secondary lookup

### Issue: Enrichment times out

**Cause**: Webset too large (200+ items) or API rate limiting.

**Solution**:
- Split into smaller websets (100 items max per enrichment)
- Run enrichment at off-peak hours
- Prioritize top-scored candidates first
- Use \`waitForResults: false\` and check status later

### Issue: API rate limit or service error

**Cause**: Technical error on Exa API side.

**Solution**:
- Check API key is set: \`echo $EXA_API_KEY\`
- Verify network connectivity
- Wait 5-10 minutes and retry
- Contact support with webset ID and timestamp

### Issue: Candidates don't match role after enrichment

**Cause**: Search query was too loose or matched adjacent titles.

**Solution**:
- Refine search with specific negative filters: \`-"hiring for" -"currently hiring"\`
- Add required skills explicitly: \`(golang AND kubernetes)\` not just \`(golang OR kubernetes)\`
- Increase minimum GitHub activity threshold
- Manually review 10-20 results to refine query further

---

## ❓ FAQ

**Q: How often should I run candidate sourcing websets?**
A: Monthly for ongoing talent pipeline building. Weekly during active hiring push. Quarterly for evergreen "bench" candidates.

**Q: Can I combine multiple role searches in one webset?**
A: Yes! Use OR logic: \`("backend engineer" OR "systems engineer") AND (golang OR rust)\`

**Q: What's the best way to approach a passive candidate?**
A: Research first (GitHub/blog), personalize second (mention specific project), lead with culture/mission/growth opportunity.

**Q: How accurate is the "experience level" classification?**
A: Pretty reliable for "senior" (8+ years, staff-level titles) and "junior" (0-2 years). "Mid-level" is broader. Manually verify.

**Q: How do I track which candidates I've already contacted?**
A: Tag in knowledge_graph: \`"outreach_sent: 2024-01-10", "status: waiting_response"\`

**Q: Can I find candidates by non-technical attributes (e.g., geographic location, university)?**
A: Yes! Add those to search: \`"Stanford graduate" OR "University of Washington"\`, \`location:Seattle\`

**Q: What if I want ex-employees or competitors' employees?**
A: Search for company mentions: \`site:linkedin.com "former Google engineer" OR "ex-Google"\`

---

## 🚀 Next Steps

1. Define your role requirements and must-have skills
2. Run your first candidate sourcing webset (aim for 100-200 candidates)
3. Enrich with skills extraction and experience level classification
4. Score candidates and export top 20-30 for immediate outreach
5. Set up weekly sourcing cadence for ongoing pipeline
6. Build outreach sequences with personalized messages

Ready to discover your next hire?`;
}

function jobSeekerWorkflow(role: string, location: string, seniority: string, keywords: string): string {
  return `# 🚀 Hiring Orchestration: Job Seeker - Target Company and Role Tracking

## What This Solves

Discover companies that are hiring, track their growth and product momentum, and identify the right people to connect with. This orchestration helps job seekers:
- **Target Company Discovery**: Find companies in your target market with your ideal size/stage
- **Hiring Signal Tracking**: Identify when companies are actively hiring
- **Role Fit Analysis**: Understand what skills companies are currently seeking
- **Recruiter Mapping**: Find recruiters and hiring managers in your target companies
- **Opportunity Alerts**: Get notified when your target companies post relevant roles
- **Relationship Building**: Connect authentically with decision-makers before applying

## When to Use

✅ Active job search in specific vertical
✅ Career transition planning
✅ Building relationships with future employers
✅ Startup founder prospecting/angel investing discovery
✅ Consulting/contract work lead generation

## 🎯 TL;DR Quick Steps

1. 🔍 **Search**: Find target companies and their hiring activity
2. 🧰 **Create Webset**: Organize company/hiring signals
3. ✨ **Enrich**: Extract hiring needs, recruiter contacts, growth signals
4. 📊 **Analyze**: Rank by company fit and opportunity alignment
5. 🤝 **Outreach**: Build authentic connections with decision-makers

---

## 📋 Step-by-Step Workflow

### Step 1: Discover Target Companies

Search for companies hiring for your target role that match your career goals.

**Tool**: \`web_search_exa\`

**Parameters**:
\`\`\`json
{
  "query": "now hiring ${role} (${keywords}) location:${location} site:jobs.lever.co OR site:greenhouse.io OR site:linkedin.com/jobs",
  "numResults": 100,
  "timeRange": "30d",
  "waitForResults": true
}
\`\`\`

**Expected Output**: 
50-100 results with active job postings, hiring announcements, and company growth signals.

---

### Step 2: Create Target Companies Webset

Organize hiring companies and opportunities into a tracked collection.

**Tool**: \`websets_manager\`

**Parameters**:
\`\`\`json
{
  "operation": "create_webset_from_search",
  "name": "${role} Jobs & Target Companies (${location})",
  "description": "Target companies hiring for ${role}. Seniority: ${seniority}. Location: ${location}. Interests: ${keywords}. Tracks active postings, hiring volume, and growth signals.",
  "searchQuery": "now hiring ${role} (${keywords}) location:${location} site:jobs.lever.co OR site:greenhouse.io OR site:linkedin.com/jobs",
  "timeRange": "30d",
  "maxResults": 250
}
\`\`\`

**Expected Output**:
\`\`\`json
{
  "websetId": "ws_target_jobs_101",
  "status": "processing",
  "createdAt": "2024-01-10T11:00:00Z",
  "estimatedCompletion": "2024-01-10T11:45:00Z"
}
\`\`\`

---

### Step 3: Check Webset Status

Monitor until processing completes (20-45 minutes).

**Tool**: \`websets_manager\`

**Parameters**:
\`\`\`json
{
  "operation": "get_webset_status",
  "websetId": "ws_target_jobs_101"
}
\`\`\`

**Expected Output**:
\`\`\`json
{
  "websetId": "ws_target_jobs_101",
  "status": "completed",
  "itemCount": 234,
  "completedAt": "2024-01-10T11:42:00Z"
}
\`\`\`

---

### Step 4: Extract Hiring Signals and Company Data

Retrieve and enrich job postings to understand hiring needs and company growth.

**Tool**: \`websets_manager\`

**Parameters** (Get items):
\`\`\`json
{
  "operation": "list_items",
  "websetId": "ws_target_jobs_101",
  "limit": 200,
  "offset": 0
}
\`\`\`

**Expected Output**: 
Array of 200 job postings and company mentions with \`url\`, \`title\`, \`text\`, \`publishedDate\`.

**Tool**: \`websets_manager\`

**Parameters** (Enrich with hiring signal extraction):
\`\`\`json
{
  "operation": "enhance_content",
  "websetId": "ws_target_jobs_101",
  "enhancements": [
    "extract_entities",
    "extract_job_requirements",
    "summarize",
    "classify_company_stage"
  ],
  "waitForResults": true,
  "advanced": {
    "outputFormat": "json",
    "entityTypes": ["company", "person", "skill", "role"]
  }
}
\`\`\`

**Expected Output**:
Each job posting enriched with:
- \`entities.company\`: ["Acme Corp", ...]
- \`entities.role\`: ["Senior Engineer", ...]
- \`entities.skills\`: ["Python", "React", "AWS", ...]
- \`entities.recruiter\`: ["Jane Doe (Recruiter)", ...]
- \`job_requirements\`: ["5+ years experience", "Kubernetes knowledge", ...]
- \`company_stage\`: "startup" | "scale-up" | "enterprise"
- \`growth_signals\`: "high" | "medium" | "low"
- \`summary\`: 1-2 sentence job description

---

### Step 5: Identify Recruiters and Decision-Makers

Extract recruiter contacts and hiring manager information for relationship-building.

**Tool**: \`knowledge_graph\`

**Parameters** (Create company entities with recruiter/hiring info):
\`\`\`json
{
  "operation": "create_entities",
  "entities": [
    {
      "name": "Acme Corp",
      "entityType": "company",
      "observations": [
        "Company Stage: Scale-up (Series B, 100-250 employees)",
        "Growth Signals: 5 new job postings this month (expansion)",
        "Hiring for: Senior Engineer, Product Manager, Data Engineer",
        "Hiring Manager: Sarah Chen (VP Engineering, sarah@acme.com)",
        "Recruiter: Mike Johnson (Technical Recruiter, mike@acme.com)",
        "Website: acme.com | LinkedIn: /company/acme-corp",
        "Mission Fit: High (AI/ML company, matches your interests)",
        "Outreach Strategy: Connect with Sarah on LinkedIn about their ML infrastructure"
      ]
    }
  ]
}
\`\`\`

---

### Step 6: Score Companies and Create Outreach Plan

Prioritize companies and roles by fit, and plan authentic outreach.

**Tool**: \`knowledge_graph\`

**Parameters** (Add company-specific outreach guidance):
\`\`\`json
{
  "operation": "add_observations",
  "entityName": "Acme Corp",
  "contents": [
    "Overall Fit Score: 8.5/10",
    "Company Culture Score: 8/10 (based on website, reviews)",
    "Role Match Score: 9/10 (skills: 95% overlap)",
    "Stage Match: Perfect (you're seeking scale-up growth opportunity)",
    "Location: Remote OK, HQ in San Francisco",
    "Next Steps: ",
    "1. Follow Sarah Chen on LinkedIn",
    "2. Engage thoughtfully on 2-3 of her posts",
    "3. Send personalized DM referencing her recent tech post",
    "4. If connection accepted, ask for 15-min call about ML infrastructure",
    "5. After 1-2 weeks, mention you saw the open Senior Engineer role"
  ]
}
\`\`\`

---

### Step 7: Export and Execute Outreach Plan

Generate a prioritized list of target companies and apply strategy.

**Tool**: \`websets_manager\`

**Parameters**:
\`\`\`json
{
  "operation": "export_webset",
  "websetId": "ws_target_jobs_101",
  "format": "csv",
  "fields": ["company_name", "open_roles", "hiring_manager", "recruiter_contact", "company_stage", "fit_score", "job_posting_url"]
}
\`\`\`

**Expected Output**: CSV with:
- company_name, open_roles, hiring_manager, recruiter_contact, company_stage, fit_score, job_posting_url

Import into a spreadsheet and build 3-week relationship-building plan before formal application.

---

## 💡 Real-World Examples

### Example 1: Early-Stage AI Startups in SF Bay Area

**Goal**: Find 10-20 Series A/B AI startups hiring engineers in SF Bay Area.

**Search Query**:
\`\`\`
"Series A" OR "Series B" "now hiring" engineer (AI OR "machine learning" OR LLM) location:"Bay Area" site:jobs.lever.co OR site:linkedin.com/jobs
\`\`\`

**Enrichment Focus**: Extract company stage, hiring volume, technical requirements, recruiter contacts

**Expected Result**: 15-25 hot startups with founder names, funding details, and active hiring

---

### Example 2: Remote Product Manager Roles at Scale-ups

**Goal**: Find product manager opportunities at 50-500 person companies offering remote work.

**Search Query**:
\`\`\`
"product manager" OR "senior PM" hiring remote (scale-up OR "Series B" OR "Series C") site:jobs.lever.co OR site:greenhouse.io
\`\`\`

**Enrichment Focus**: Extract product focus area, company vision, hiring manager info

**Expected Result**: 20-40 PM roles with clear growth/mission fit

---

### Example 3: Technical Leadership Opportunities

**Goal**: Find companies seeking engineering managers or technical leads (career growth signal).

**Search Query**:
\`\`\`
"engineering manager" OR "technical lead" OR "staff engineer" hiring (leadership OR mentoring OR team-building) site:linkedin.com/jobs
\`\`\`

**Enrichment Focus**: Extract scope (team size, company size), leadership style signals, compensation signals

**Expected Result**: 15-30 leadership-track roles with growth potential

---

## 🎓 Best Practices

### Target Company Research
- Focus on 10-20 target companies you'd love to work for
- Track their hiring volume and frequency (growing = good signal)
- Study their engineering blog and product announcements
- Understand their mission and technical challenges
- Follow their engineers and executives on social media

### Hiring Signal Interpretation
- Multiple postings for same role = high urgency or high turnover
- New categories of hires (e.g., "first ML engineer") = expansion signal
- Rapid hiring growth = funding, product expansion, or potential churn
- Quiet hiring = bootstrap or selective growth

### Relationship Building Before Applying
- Don't apply cold; build relationship with hiring manager first
- Engage authentically with their content (1-2 thoughtful comments)
- Send brief, personalized message referencing their work
- Ask for informational 15-min call, not a job pitch
- After 1-2 conversations, express interest in open role

### Application Strategy
- After relationship built, apply with personal intro from connection
- Reference specific conversation or insight shared
- Tailor resume/cover letter to company's stated challenges
- Apply quickly after role posting (first week = 2x callback rate)
- Follow up after 1 week if no response

### Offer Negotiation Prep
- Research salary ranges in advance (Levels.fyi, Blind, Comparably)
- Understand equity/stock option standards for company stage
- Know your walk-away number before negotiating
- Get offer in writing before accepting
- Negotiate on: base salary, equity, signing bonus, start date, remote days

---

## ⚠️ Troubleshooting

### Issue: Too many irrelevant job postings

**Cause**: Search query includes adjacent roles or industries.

**Solution**:
- Add specific required skills: \`(python AND system design)\` not just \`engineer\`
- Exclude irrelevant titles: \`-sales -support -marketing\`
- Filter by company size/stage to match your target
- Increase location specificity (city/region not just country)

### Issue: Can't find recruiter contact information

**Cause**: Recruiters often don't publish direct emails in job postings.

**Solution**:
- Extract company domain from job URL
- Try recruiter@company.com or talent@company.com
- Check company LinkedIn careers page for recruiter profile
- Find recruiter name from Greenhouse/Lever posting URL sometimes shows it
- Message hiring manager on LinkedIn if recruiter contact fails

### Issue: Enrichment times out

**Cause**: Webset too large (250+ items).

**Solution**:
- Run on off-peak hours (early morning, late evening)
- Split into smaller websets if needed
- Focus on top 100 companies first
- Use \`waitForResults: false\` and check status later

### Issue: API rate limit or service error

**Cause**: Technical error on Exa API side.

**Solution**:
- Verify API key is set: \`echo $EXA_API_KEY\`
- Check network connectivity
- Wait 5-10 minutes and retry
- Contact support with webset ID

### Issue: Companies don't match my career goals after enrichment

**Cause**: Search was too broad or didn't filter correctly.

**Solution**:
- Refine stage filter: only \`"Series B" OR "Series C"\` if you want scale-ups
- Add mission/industry filters: \`(fintech OR healthtech OR climate)\`
- Increase technical skill requirements to match
- Manually review top 20 results and refine further

---

## ❓ FAQ

**Q: How often should I update my target company list?**
A: Monthly is good. Weekly if actively job hunting. Update whenever you find new companies or when hiring signals change.

**Q: Should I apply to multiple roles at the same company?**
A: 1-2 roles max. Multiple applications can look unfocused. Pick the best fit and nail it.

**Q: How long should I build relationships before applying?**
A: 2-4 weeks of genuine engagement. Too fast = looks opportunistic. Too slow = they hire someone else.

**Q: What if I see the same company multiple times in my search?**
A: That's a strong signal—they're actively hiring and growing. Prioritize them.

**Q: How do I know if a company is financially stable?**
A: Check Crunchbase, PitchBook for funding history. Look for recent funding rounds. Check Glassdoor for "company health" signals.

**Q: Can I use this to find startup cofounders?**
A: Yes! Search for \`founder OR "co-founder" (technical OR engineering)\` in your industry of interest.

---

## 🚀 Next Steps

1. List 10-20 target companies where you'd love to work
2. Create a webset around hiring signals from those companies
3. Enrich to identify key recruiters and hiring managers
4. Build 3-week relationship plan for top 5 companies
5. Execute outreach: engage → connect → learn → apply
6. Track outcomes and refine strategy monthly

Ready to land your dream role?`;
}

