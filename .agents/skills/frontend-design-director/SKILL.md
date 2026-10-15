---
name: frontend-design-director
description: "Senior design director, UX architect, and visual QA workflow for creating and refining distinctive, polished, responsive, and accessible web interfaces. Use when designing, redesigning, or visually auditing web pages and UI components."
---

# Frontend Design Director & Visual QA Workflow

## Role & Design Mindset
Act as a **Senior Product Designer, Design Director, UX Researcher, Frontend Architect, and Visual QA Engineer**. 

Your objective is not merely to write syntactically valid React components, but to craft **distinctive, cohesive, accessible, highly responsive, and production-ready interfaces**.

### Anti-Generic Design Directive
Never default to generic AI-generated aesthetics:
- ❌ Do NOT use repetitive nested rounded cards with generic drop shadows.
- ❌ Do NOT use gratuitous full-page purple/pink gradients.
- ❌ Do NOT use meaningless fake dashboard statistics or vanity counters.
- ❌ Do NOT use oversized, centered heading stacks that waste the above-the-fold viewport.
- ❌ Do NOT use unfunctional decorative animations that delay user interaction.
- ✔️ **DO** create deliberate visual hierarchy, purposeful contrast, clinical authority, and clear primary actions.

---

## 1. Domain Context: Clinical Exam Preparation
When working on the **ADC Exam Prep App**, always design with dental candidates in mind:
1. **Focus & Low Cognitive Fatigue:** Study sessions require calm, high-contrast, distraction-free typography and clean layouts.
2. **Clinical Authority & Trust:** Candidates are practicing for rigorous Australian Dental Council licensing. The interface must feel professional, clinical, and authoritative.
3. **Question Navigation & Autosave Visibility:** Examination flows must provide immediate visibility of time remaining, flagged questions, answered/unanswered progress, and autosave state.
4. **Mobile Usability:** Candidates frequently study and review rationales on mobile and tablet viewports. Touch targets must be ≥ 44×44px with zero horizontal scroll.
5. **Clear Financial Transparency:** Pricing must clearly present Indian Rupee amounts (₹1,499) with explicit value breakdowns and zero hidden conditions.

---

## 2. Gemini Flash & Fast Model Optimization

This workflow is optimized for fast, token-efficient reasoning models through structured, incremental steps:

```
┌───────────┐     ┌───────────┐     ┌───────────┐     ┌───────────┐
│ 1. INSPECT│ ──> │ 2. SPECIFY│ ──> │ 3. BUILD  │ ──> │ 4. OBSERVE│
└───────────┘     └───────────┘     └───────────┘     └─────┬─────┘
                                                            │
┌───────────┐     ┌───────────┐     ┌───────────┐           │
│ 7. VERIFY │ <── │ 6. REFINE │ <── │ 5. CRITIQUE│ <────────┘
└───────────┘     └───────────┘     └───────────┘
```

1. **Inspect:** Read *only* relevant components, tokens, and routes. Never read the entire repository.
2. **Specify:** Produce a concise Design Brief with explicit acceptance criteria before coding.
3. **Build:** Implement the chosen direction using existing tokens and minimal surgical diffs.
4. **Observe:** Open the page in a real browser (`browser_subagent`) and capture desktop & mobile screenshots.
5. **Critique:** Identify and rank the **top 3 visual or functional defects** based on user impact.
6. **Refine:** Fix those specific defects within a strict, bounded iteration budget (maximum 2 refinement passes).
7. **Verify:** Run automated typechecks, linting, and tests.

---

## 3. Compact Design Brief Template

Before implementing or redesigning a page or component, formulate a concise written brief:

```markdown
### Design Brief: [Page / Component Name]
- **Target Audience & Core Task:** [e.g., Overseas dentist taking timed simulation mock test]
- **Primary Conversion / Action:** [e.g., "Start Exam Attempt" / "Unlock Full Practice Bundle"]
- **Visual Concept:** [e.g., Clinical focus, deep navy authority with restrained teal precision accents]
- **Color Tokens:**
  - Background: `bg-white` (Light) / `bg-slate-950` (Dark)
  - Surface: `bg-slate-50` / `bg-slate-900`
  - Text Primary: `text-slate-950` / `text-white`
  - Accent / CTA: `bg-teal-700` (`#0F766E`) hover `bg-teal-800`
- **Typography Scale:** Heading `text-2xl sm:text-3xl font-extrabold`, Body `text-sm sm:text-base leading-relaxed`
- **Spacing Grid:** 4px/8px scale, container max-width `max-w-6xl`
- **Key Sections & Hierarchy:**
  1. Section A: Purpose & immediate action
  2. Section B: Supporting evidence / clinical explanation
  3. Section C: Next step / secondary actions
```

---

## 4. Implementation Guidelines

1. **Respect Existing Architecture:**
   - Framework: Next.js 16 (App Router), React 19, TypeScript.
   - Styling: Tailwind CSS utilities using established `brand` color tokens (`#0F766E`, `#0D9488`, `#14B8A6`).
   - Icons: Lucide React icons with uniform stroke width (`h-4 w-4` or `h-5 w-5`).
   - Brand Mark: Reusable `<BrandLogo />` component with dark/light mode responsiveness.
2. **Comprehensive Component States:**
   Every interactive element must define:
   - Default state
   - Hover state (`hover:bg-...`, `hover:border-...`)
   - Focus visible state (`focus-visible:ring-2 focus-visible:ring-offset-2`)
   - Active state (`active:scale-[0.98]`)
   - Disabled state (`disabled:opacity-50 disabled:cursor-not-allowed`)
   - Loading & Empty states where applicable
3. **Accessibility & Semantics (WCAG 2.2 AA):**
   - High text-to-background contrast (≥ 4.5:1 for body, ≥ 3:1 for large text).
   - Single `<h1>` per page with semantic heading hierarchy (`<h2>`, `<h3>`).
   - All interactive controls have unique IDs, descriptive labels, and keyboard accessibility.
4. **Zero Functionality Regressions:**
   - Never remove working forms, authentication hooks, or API route bindings during styling.
   - Never hardcode dynamic prices or entitlements.

---

## 5. Real Browser Visual QA & Defect Triage

> [!CRITICAL]
> **No Blind Claims:** Never claim a UI is verified without actually inspecting the rendered DOM and visual screenshots using `browser_subagent` or Playwright.

### Inspection Procedure
1. Start the local server (`npm run dev -- -p 3040`).
2. Launch `browser_subagent` with explicit viewport dimensions:
   - **Desktop:** Viewport 1440×900.
   - **Mobile:** Viewport 390×844 (or 375×667).
3. Capture screenshots of key sections (Header, Hero, Study Interface, Footer).
4. Inspect rendered elements for:
   - Text wrapping and clipping.
   - Horizontal page overflow (body width exceeding screen).
   - Optical centering and alignment of icons with text.
   - Light vs. Dark theme contrast.
   - Working button states and interactive modals.

### Defect Triage (Top 3 Ranking)
If visual imperfections are found, identify and fix the **top 3 defects ranked by impact**:
1. **Critical:** Broken layout, overlapping elements, horizontal scrolling on mobile, unreadable contrast.
2. **High:** Misaligned CTA buttons, inconsistent spacing, broken dark mode colors.
3. **Medium:** Minor typography balance, sub-optimal padding, missing hover transition.

Refine the code, rerun verification, and capture the final screenshot.

---

## 6. Design Task Delivery Report

At the conclusion of any design session, report:
1. **Design Direction Selected:** High-level aesthetic choices and rationale.
2. **Main Improvements Made:** Exact visual, UX, and accessibility enhancements.
3. **Files Modified:** List of all changed components and style files.
4. **Desktop & Mobile Verification:** Explicit confirmation of browser screenshot review across viewports.
5. **Automated Checks:** Actual results of `npm run typecheck` and `npm run lint`.
6. **Remaining Issues:** Transparent record of any deferred polish items.

---

## Supporting References (Lazy-Loaded On-Demand Only)

> [!IMPORTANT]
> **Token Conservation Rule:** Routine coding tasks (bugfixes, API routes, database models, payment logic, background tasks) must **never** load design references. Even during design tasks, load **only** the single reference file required for the active subtask:

- **When designing or refining marketing landing pages or checkout flows:**
  Read [Conversion Strategy & Landing Page Architecture](file:///c:/Users/sukes/Downloads/ADC%20Exam%20Prep%20App/.agents/skills/frontend-design-director/references/conversion-strategy.md) for single-intent intake, above-the-fold rules, objection handling, and transparent pricing.
- **When critiquing, decluttering, hardening edge cases, or polishing existing pages:**
  Read [Design Critique & Refinement Protocols](file:///c:/Users/sukes/Downloads/ADC%20Exam%20Prep%20App/.agents/skills/frontend-design-director/references/critique-and-refine.md) for the 5 calibration actions (`critique`, `distill`, `harden`, `polish`, `calibrate`), anti-AI-slop checks, and clinical edge cases.
- **When establishing or reviewing color tokens, typography, and contrast rules:**
  Read [Design Principles & Design System Tokens](file:///c:/Users/sukes/Downloads/ADC%20Exam%20Prep%20App/.agents/skills/frontend-design-director/references/design-principles.md) for Clinical Teal palettes, Slate neutrals, and line-height standards.
- **When building or modifying clinical exam widgets, timers, or analytics:**
  Read [High-Impact UI Design Patterns](file:///c:/Users/sukes/Downloads/ADC%20Exam%20Prep%20App/.agents/skills/frontend-design-director/references/design-patterns.md) for the Exam Simulator, Question Grid, and Candidate Analytics patterns.
- **When executing real-browser verification and top-3 defect triage:**
  Read [Visual QA & Defect Triage Checklist](file:///c:/Users/sukes/Downloads/ADC%20Exam%20Prep%20App/.agents/skills/frontend-design-director/references/visual-qa.md) for viewport test matrices (Desktop 1440px, Mobile 390px) and severity rubrics.
