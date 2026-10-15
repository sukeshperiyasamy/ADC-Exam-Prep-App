# Design Critique & Refinement Protocols

Adapted from professional design direction and refined for clinical web applications. Use this guide during **Step 5 (Critique)** and **Step 6 (Refine)** of the design loop.

---

## 1. The Five Design Calibration Actions

When evaluating an existing page or component, do not randomly tweak CSS. Select one or two deliberate calibration actions:

| Action | When to Use | Key Techniques |
| :--- | :--- | :--- |
| **`critique`** | First pass review of a completed section or page. | Ask: Does the viewport communicate the core task in 3 seconds? Is the primary action obvious? Is the reading rhythm effortless? |
| **`distill`** | Page feels cluttered, "AI-generated", or noisy. | Remove unnecessary outer cards. Eliminate redundant divider borders. Strip decorative gradient blobs. Let whitespace group elements rather than nested containers. |
| **`harden`** | Interface feels fragile or breaks on unexpected content. | Handle long multi-line dental clinical stems. Check zero-state / empty lists. Verify disabled button states during async submission. Test text overflow (`truncate` vs `line-clamp`). |
| **`polish`** | Layout is structurally sound but lacks senior visual craftsmanship. | Align icon baselines with text. Ensure optical vertical centering. Standardize border-radius to a single scale (e.g., `rounded-xl` for cards, `rounded-lg` for inputs). Check `focus-visible` rings. |
| **`calibrate`** (`bolder` / `quieter`) | Visual hierarchy is inverted or washed out. | **Bolder:** Strengthen primary CTA contrast, increase headline font-weight (`font-semibold` / `font-bold`), or add an authoritative accent badge.<br>**Quieter:** Dim secondary metadata text to `text-slate-500`, soften high-contrast borders to `border-slate-200/80`, or mute overly vibrant badges. |

---

## 2. Anti-AI-Slop Diagnostic Checklist

Review the page against these common artificial generation tells:

- [ ] **The Card Trap:** Are elements placed in individual rounded boxes simply because they exist? If so, remove the cards and use clean vertical typographic rhythm and whitespace instead.
- [ ] **Low-Contrast Gray Muddle:** Is secondary text too light to read against light gray or tinted backgrounds? Ensure text meets WCAG AA (≥ 4.5:1 ratio).
- [ ] **The Oversized Hero Stack:** Does an enormous headline push the actual application interface or key value proposition below the 900px fold? Tighten hero vertical padding.
- [ ] **Icon-Overload:** Does every single bullet or table row have a colored circular icon wrapper? Keep icons functional, not purely decorative.
- [ ] **Bouncy / Distracting Motion:** Are elements sliding and bouncing as the user scrolls? Remove non-essential entry animations; restrict transitions to subtle interactive feedback (`transition-colors duration-150`).

---

## 3. Clinical & Exam Edge-Case Hardening

Ensure the interface handles clinical study conditions gracefully:

1. **Long Clinical Case Scenarios:**
   - Multi-paragraph patient histories with dental charting must remain readable at comfortable reading widths (`max-w-prose` or `max-w-3xl`).
   - Line height must be set to `leading-relaxed` (1.625) to prevent eye fatigue during 2-hour mock exams.
2. **Timer & State Urgency:**
   - Exam countdown timers must have monospace numeric tabular styling (`font-mono tabular-nums`) so digits do not jump horizontally as seconds tick down.
   - When timer drops below 5 minutes, switch subtly to high-visibility amber/rose without triggering layout shifts.
3. **Question Grid Scalability:**
   - 80-question or 120-question navigation matrices must wrap smoothly on mobile screens without requiring horizontal viewport panning.
4. **Form & Option Selection Feedback:**
   - Radio options for clinical scenarios must have generous hitboxes (≥ 44px vertical height) and clear checked states (distinct border, tinted background, and high-contrast check indicator).

---

## 4. Bounded Refinement Loop

To maintain token efficiency and prevent endless design churn:

1. **Rank strictly:** Surface the **top 3 defects** ranked by user impact (Critical > High > Medium).
2. **Apply surgical fixes:** Touch only the affected CSS classes or component props.
3. **Maximum budget:** Limit iterative refinement to **at most 2 passes**. If a minor cosmetic quirk remains after pass 2, document it in `progress.md` under *Remaining Issues* rather than burning context tokens.
