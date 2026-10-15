# Visual QA & Defect Triage Checklist

## 1. Inspection Protocol Across Viewports

When verifying modified or newly created pages, evaluate across three standard viewports:

| Viewport | Dimensions | Key Testing Focus |
| :--- | :--- | :--- |
| **Desktop** | 1440 × 900 | Information density, grid balance, multi-column alignment, hover micro-interactions. |
| **Tablet** | 768 × 1024 | Breakpoint transition, sidebar collapse, touch padding, table wrapping. |
| **Mobile** | 390 × 844 (or 375 × 667) | Single-column flow, zero horizontal overflow, touch target sizes (≥ 44px), sticky bottom CTAs. |

---

## 2. Comprehensive Visual QA Checklist

### A. Layout & Geometry
- [ ] **Zero Horizontal Overflow:** Page body does not trigger horizontal scroll bars on mobile (`overflow-x-hidden` or clean flex wraps).
- [ ] **Optical Alignment:** Icons are vertically centered with adjacent text labels.
- [ ] **Consistent Padding Rhythm:** Symmetrical padding across cards (`p-4 sm:p-6`).

### B. Typography & Contrast
- [ ] **Single H1 Tag:** Page contains exactly one `<h1>` defining the primary subject.
- [ ] **WCAG AA Contrast:** Body text achieves ≥ 4.5:1 contrast against its background in both light and dark themes.
- [ ] **No Text Truncation / Collision:** Headings and badges wrap gracefully without clipping or overlapping adjacent controls.
- [ ] **Tabular Digits:** Timers, scores, and currency values use `font-mono` or `tabular-nums` to prevent vibrating layouts.

### C. Component States
- [ ] **Hover & Focus-Visible:** Interactive controls exhibit clear visual feedback on mouse hover and keyboard Tab focus.
- [ ] **Active State:** Buttons provide tactile feedback (`active:scale-[0.98]` or background darken).
- [ ] **Disabled State:** Non-interactive controls show reduced opacity (`opacity-50`) and `cursor-not-allowed`.
- [ ] **Loading & Empty States:** Data tables and question panels display skeleton placeholders or clear empty-state messages.

### D. Dark Theme Coherence
- [ ] **No Harsh Inversions:** Light cards in dark mode use subtle navy/slate surfaces (`bg-slate-900`), not unstyled white blocks.
- [ ] **Readable Borders:** Borders remain visible in dark mode with `dark:border-slate-800`.
- [ ] **Logo & Icon Visibility:** Brand mark and SVG icons adapt properly using theme classes (`fill-slate-950 dark:fill-white`).

---

## 3. Real Browser Verification with `browser_subagent`

To verify visually, use the following structured prompt format for `browser_subagent`:

```json
{
  "TaskName": "Visual QA on Study Interface",
  "TaskSummary": "Verifying question layout and navigation across desktop and mobile screens.",
  "RecordingName": "qa_exam_flow",
  "Task": "1. Navigate to http://127.0.0.1:3040/exam/test-attempt-id in 1440x900 viewport.\n2. Verify question stem, options, and timer bar.\n3. Take screenshot named 'desktop_exam_workspace'.\n4. Resize browser window to 390x844.\n5. Verify that options stack vertically and the submit button is reachable.\n6. Take screenshot named 'mobile_exam_workspace'.\n7. Report any layout clipping, overflow, or contrast issues."
}
```

---

## 4. Top 3 Defect Ranking & Triage Protocol

Never attempt to fix 20 subjective micro-details simultaneously. Identify and resolve the **top 3 defects ranked by user and business impact**:

### Defect Severity Matrix
1. **Rank 1 — Critical Blocker:**
   - Elements overlapping or unreadable.
   - Broken primary action (e.g. "Start Practice" or "Pay ₹1,499" button inaccessible on mobile).
   - Horizontal viewport blowout.
2. **Rank 2 — High Usability Defect:**
   - Dark mode contrast failure (dark text on dark background).
   - Misaligned form controls or confusing touch targets.
   - Missing loading state causing double-clicks.
3. **Rank 3 — Visual Polish Defect:**
   - Inconsistent border radius between adjacent components.
   - Sub-optimal whitespace spacing.
   - Missing subtle hover transition.

### Bounded Refinement Rule
- Apply targeted fixes for the top 3 defects.
- Retake screenshots to verify remediation.
- **Budget Limit:** Maximum of **two** refinement iterations. Stop and document any non-blocking minor polish items.
