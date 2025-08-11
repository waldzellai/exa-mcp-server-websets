# Deep Research Orchestration

This orchestration defines a rigorous, multi-stage research workflow that starts from a user request and ends with a fully fact-checked, revised report. It leverages Websets for exhaustive, asynchronous retrieval and coordinates subagents with non-overlapping responsibilities.

## Overview

1. User requests a research report on a subject
2. Retrieval orchestration gathers information (Websets with `websets_manager`)
3. Agent synthesizes a first-pass markdown report
4. Subagent fleet extracts all discrete, checkable claims
5. Subagent fleet searches for sources for each claim
6. Subagent fleet evaluates each claim (supported/refuted), adds confidence and corrections
7. Agent synthesizes a claims evaluation markdown
8. Agent applies corrections to the original report
9. Agent presents final product

Related orchestrations: [Horizontal Process](./horizontal-process-example.md), [Iterative Intelligence](./iterative-intelligence-example.md), [Webset Portal](./webset-portal-example.md)

## Prerequisites

- Websets enabled and configured via `websets_manager` (see `../src/tools/websetsManager.ts`)
- EXA_API_KEY available in the environment for Websets
- Storage path for reports, e.g., `./reports/<slug>/`

---

## Step 1 — Intake and Scoping

- Define the research objective, audience, and deliverable format (length, depth).
- Establish guardrails: time horizon, geography, scope boundaries, and definition of “acceptable sources.”
- Deliverables to initialize:
  - `./reports/<slug>/draft.md` — first-pass synthesis
  - `./reports/<slug>/claims.md` — claims extracted
  - `./reports/<slug>/claims-evaluation.md` — validation results
  - `./reports/<slug>/final.md` — corrected final report

---

## Step 2 — Retrieval Orchestration (Websets)

Use Websets to search exhaustively and asynchronously for the most appropriate result set. Coordinate retrieval using one or more of the following strategies, depending on topic complexity:

- Horizontal breadth: see [Horizontal Process](./horizontal-process-example.md)
- Iterative improvement: see [Iterative Intelligence](./iterative-intelligence-example.md)
- Deep portal dives: see [Webset Portal](./webset-portal-example.md)

Recommended `websets_manager` operations (see `../src/tools/websetsManager.ts`):

```json
{
  "operation": "create_webset",
  "webset": {
    "searchQuery": "<subject> comprehensive latest 2024 2025 analysis",
    "advanced": {
      "resultCount": 300,
      "tags": { "workflow": "deep_research", "topic": "<slug>" }
    }
  }
}
```

```json
{
  "operation": "search_webset",
  "resourceId": "<websetId>",
  "search": {
    "query": "key subtopics, entities, controversies, benchmarks",
    "advanced": { "waitForResults": true }
  }
}
```

```json
{
  "operation": "list_content_items",
  "resourceId": "<websetId>",
  "query": { "limit": 100 }
}
```

For long-running retrieval, register notifications to avoid polling:

```json
{
  "operation": "setup_notifications",
  "notification": {
    "webhookUrl": "https://your.webhook/ingest",
    "events": ["webset.search.completed", "webset.item.enriched"]
  }
}
```

Notes:
- Create multiple websets for distinct angles or time windows if needed (horizontal breadth).
- Run follow-on websets based on gaps discovered (iterative improvement).
- Trigger portal-style deep dives on the highest-signal URLs (portal deep dive).

---

## Step 3 — First-Pass Synthesis (draft.md)

Create a structured markdown synthesis from retrieved items. Suggested outline:

```markdown
# <Title>

- Purpose: <one paragraph>
- Scope & limits: <bullets>
- Methods: Websets retrieval (linked), inclusion/exclusion criteria

## Executive Summary
- Key findings (3–7 bullets)

## Background & Definitions

## Current Landscape

## Evidence & Analysis
- Thematic sections with inline citations [n]

## Risks, Gaps, and Unknowns

## Recommendations / Next Steps

## References
[n] Source links with titles and access dates
```

Store as `./reports/<slug>/draft.md`.

---

## Step 4 — Claim Extraction (claims.md)

Definition: a “claim” is a single assertion that can be evaluated on a binary supported/refuted basis.

Subagent assignment (non-overlapping review areas):
- Agent A: quantitative/statistical claims (numbers, dates, rates)
- Agent B: entity relationships (who did what, partnerships, acquisitions)
- Agent C: causal/attribution claims (X causes/leads to Y)
- Agent D: forecasts/predictions

Extraction protocol:
- Segment sentences, classify as claim or non-claim.
- Normalize references (expand acronyms, standardize units/dates).
- Deduplicate and map to report sections.

Claim record schema:

```json
{
  "id": "c-001",
  "text": "<verifiable assertion>",
  "section": "<draft section heading>",
  "type": "quantitative | entity | causal | forecast | other",
  "importance": 1,
  "evidenceHint": ["keywords", "entities", "metrics"],
  "draftCitations": [1, 2]
}
```

Output to `./reports/<slug>/claims.md` as a numbered list and export the same list to JSON if needed.

---

## Step 5 — Source Finding for Each Claim

For each claim, launch a focused retrieval using Websets and targeted refinements:

- Use existing `websets_manager` websets; if coverage is thin, spin up a new webset tuned to the claim.
- Query expansions: add synonyms, controlled vocab, entity aliases, and time constraints.
- Source diversity: prioritize primary sources, reputable journalism, official filings, academic articles.

Example per-claim retrieval:

```json
{
  "operation": "search_webset",
  "resourceId": "<websetId>",
  "search": {
    "query": "<claim keywords> site:reuters.com OR site:bloomberg.com OR site:sec.gov",
    "advanced": { "waitForResults": true, "tags": { "claimId": "c-001" } }
  }
}
```

Also list consolidated items:

```json
{
  "operation": "get_search_results",
  "resourceId": "<searchId>"
}
```

---

## Step 6 — Claim Evaluation (claims-evaluation.md)

Subagents independently evaluate claims within their assigned area to avoid overlap. For each claim:

- Verdict: supported | refuted
- Confidence: 0.0–1.0 (calibrated)
- Rationale: concise justification
- Corrected claim: only if refuted (precise, minimally edited)
- Citations: list of URLs with titles and access dates

Evaluation schema:

```json
{
  "claimId": "c-001",
  "verdict": "supported",
  "confidence": 0.82,
  "rationale": "Matches two primary sources; numbers consistent within margin.",
  "correctedClaim": null,
  "sources": [
    { "url": "https://www.sec.gov/...", "title": "Form 10-K 2024", "accessed": "2025-03-18" },
    { "url": "https://www.reuters.com/...", "title": "Company X posts Q4 results", "accessed": "2025-03-18" }
  ]
}
```

Rubric notes:
- Prefer contemporaneous primary sources; weigh recency, authority, and independence.
- Penalize circular citations; check for data lineage.
- For numbers, verify definitions and denominators.

Write `./reports/<slug>/claims-evaluation.md` including per-claim blocks and a summary table.

---

## Step 7 — Synthesize Findings (.md)

Produce a consolidated `claims-evaluation.md` with:
- Summary metrics: total claims, supported, refuted, uncertain
- Heatmap by claim type and section
- Detailed per-claim evaluations with citations as markdown links

---

## Step 8 — Apply Corrections to Original Report

- For each refuted or low-confidence claim, update `draft.md`:
  - Replace with the corrected claim (when available) or soften language and add caveats
  - Add or fix citations adjacent to the claim
- Ensure consistency across the executive summary, figures, and conclusions.
- Track changes in a short changelog at the bottom of `final.md`.

Output the revised report to `./reports/<slug>/final.md`.

---

## Step 9 — Present Final Product

Deliver to the user:
- `final.md` (primary deliverable)
- `claims-evaluation.md` (audit trail)
- `draft.md` and `claims.md` (optional, for transparency)

---

## Orchestration Notes and Cross-Links

- Retrieval breadth: [Horizontal Process](./horizontal-process-example.md)
- Iterative gap filling: [Iterative Intelligence](./iterative-intelligence-example.md)
- Deep portal dives: [Webset Portal](./webset-portal-example.md)
- Websets manager reference: `../src/tools/websetsManager.ts` (operations: `create_webset`, `search_webset`, `get_search_results`, `list_content_items`, `enhance_content`, `setup_notifications`)

This process is designed to be modular: you can run the retrieval stage with either horizontal breadth, iterative refinement, or portal deep dives—or combine all three—before claim extraction and validation. Websets’ asynchronous pipeline ensures comprehensive coverage while subagent parallelism keeps the end-to-end runtime efficient.