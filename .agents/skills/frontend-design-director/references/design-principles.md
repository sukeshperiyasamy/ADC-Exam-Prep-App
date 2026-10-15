# Design Principles & Design System Tokens

## 1. Core Visual Philosophy
- **Purpose Over Decoration:** Every visual element must serve comprehension, reassurance, or clinical study efficiency.
- **Clinical Precision:** Use clean, architectural geometry, crisp borders (`border-slate-200 dark:border-slate-800`), and restrained accents.
- **Calm Information Density:** In an educational testing platform, overwhelming the user causes cognitive fatigue. Generous whitespace and clear grouping keep candidates focused.

---

## 2. Color Palette & Token Architecture

The ADC Exam Prep application uses a curated palette balancing deep clinical authority with vibrant precision accents:

### Foundation Neutrals
| Token | Light Mode HEX | Dark Mode HEX | Semantic Role |
| :--- | :--- | :--- | :--- |
| **Canvas Background** | `#FFFFFF` | `#0A0F1D` | Primary page backdrop |
| **Card / Surface** | `#F8FAFC` (`slate-50`) | `#0F172A` (`slate-900`) | Elevated containers, question panels |
| **Border / Divider** | `#E2E8F0` (`slate-200`) | `#1E293B` (`slate-800`) | Subtle separation lines, card edges |
| **Text Primary** | `#020617` (`slate-950`) | `#FFFFFF` | Main headlines, body copy, question stems |
| **Text Muted** | `#475569` (`slate-600`) | `#94A3B8` (`slate-400`) | Secondary metadata, explanations, footnotes |

### Brand Accents (Clinical Teal)
| Token | HEX | Role |
| :--- | :--- | :--- |
| **brand-50** | `#F0FDFA` | Subtle alert highlights, active option backgrounds (light mode) |
| **brand-500** | `#14B8A6` | High-visibility icon badges, dark mode accents |
| **brand-600** | `#0D9488` | Precision checkmarks, hover states |
| **brand-700** | `#0F766E` | Primary brand buttons, authoritative highlights |
| **brand-900** | `#134E4A` | Dark mode active badge fills |

### Semantic Feedback Tokens
- **Success / Passed:** Emerald (`#10B981` / `#059669`) — Correct answers, lifetime access badge, paid confirmation.
- **Warning / Flagged:** Amber (`#F59E0B` / `#D97706`) — Questions flagged for review, time warning.
- **Alert / Incorrect:** Rose (`#F43F5E` / `#E11D48`) — Incorrect response options, session expiry, payment failures.

---

## 3. Typography & Type Scale

The platform relies on modern, geometric sans-serif typography (`Inter`, `system-ui`, `-apple-system`, `sans-serif`):

```
Page Title (H1)     : 28px - 36px  (text-2xl sm:text-3xl)   font-extrabold  tracking-tight
Section Heading (H2): 20px - 24px  (text-xl sm:text-2xl)    font-bold       tracking-tight
Card Heading (H3)   : 16px - 18px  (text-base sm:text-lg)   font-semibold
Body Text           : 14px - 15px  (text-sm sm:text-base)   font-normal     leading-relaxed
Captions & Badges   : 11px - 12px  (text-xs)                font-semibold   tracking-wider uppercase
Timer & Counters    : 14px - 16px  font-mono / tabular-nums (prevents layout shift on tick)
```

### Optimal Reading Widths
- **Clinical Stems & Articles:** Limit line width to `max-w-prose` (60–75 characters) to reduce eye travel fatigue.
- **Option Buttons:** Multi-line text must maintain `leading-normal` with generous vertical padding (`py-3.5`).

---

## 4. Spacing, Rhythm & Touch Targets
- **Base Grid:** Strictly 4px / 8px scale (`gap-2`, `gap-4`, `p-4`, `p-6`).
- **Touch-First Accessibility:**
  - Interactive elements (buttons, radio options, checkboxes, modal closes) must have a touch target of **at least 44×44px** on mobile screens.
  - Generous spacing between radio options (`space-y-3`) prevents accidental tap errors on mobile devices.
- **Container Max-Widths:**
  - Full-width app pages: `max-w-7xl mx-auto px-4 sm:px-6 lg:px-8`
  - Exam study workspace: `max-w-5xl mx-auto`
  - Form / Auth cards: `max-w-md mx-auto`

---

## 5. Dark Mode Mastery
Dark mode in clinical applications must avoid harsh pure-black (`#000000`) and uncalibrated neon text:
1. **Layered Depth:**
   - Base canvas: `#0A0F1D` (Deep Navy)
   - Surface cards: `#0F172A` (Slate 900)
   - Interactive popovers: `#1E293B` (Slate 800)
2. **Text Softening:**
   - Use `#FFFFFF` for titles, but use `#CBD5E1` (`slate-300`) for paragraphs to minimize glare during late-night study sessions.
3. **Borders Over Shadows:**
   - In dark mode, drop shadows become invisible. Rely on crisp 1px borders (`border-slate-800`) to separate card surfaces.
