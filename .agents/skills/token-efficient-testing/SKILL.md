---
name: token-efficient-testing
description: "Guidelines for lightweight, high-speed test execution and bounded browser verification to avoid token blowout."
---

# Token-Efficient Testing Guidelines

## Purpose
Achieve fast, definitive verification of changes with minimal execution time and zero token waste.

## Testing Hierarchy
1. **TypeScript Typecheck (`npm run typecheck`):** Run `tsc --noEmit` first. Catches 90% of type and contract breakages with minimal token output.
2. **Targeted CLI Test Scripts (`npx tsx scripts/<test-name>.ts`):** Run lightweight test runners (e.g. `scripts/test-inr-migration.ts`, `scripts/test-exam-engine.ts`). These execute in < 2 seconds and print concise `✓ [PASS]` or `✗ [FAIL]` reports.
3. **Production Build (`npm run build`):** Validates full webpack/Turbopack compilation and App Router route generation. Run before handoff.
4. **Bounded Browser Subagent Verification:**
   - When invoking `browser_subagent`, provide **narrow, specific instructions** (e.g., "Navigate to http://127.0.0.1:3040/, take screenshot of header at desktop width, resize to mobile 375px, take screenshot of mobile header, stop").
   - Do NOT give open-ended prompts like "Explore the entire site and test everything", which causes excessive tool loops, video frame accumulation, and token exhaustion.
