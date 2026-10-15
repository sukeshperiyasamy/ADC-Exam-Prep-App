# High-Impact UI Design Patterns

This guide defines proven, production-grade layout patterns tailored for edtech, medical certification, and SaaS checkout interfaces.

---

## 1. Clinical Examination Simulator Pattern

The primary interface where candidates spend hours solving questions.

```
┌────────────────────────────────────────────────────────────────────────┐
│ [Logo] ADC Part 1 Simulation       [⏱️ 01:58:24] [🚩 Flag] [Save & Exit]│
├────────────────────────────────────────────────────────────────────────┤
│ QUESTION 14 OF 80                        [Periodontics & Oral Surgery] │
│                                                                        │
│ Clinical Scenario:                                                     │
│ A 42-year-old female presents with persistent bleeding on probing...   │
│                                                                        │
│   (A) Immediate subgingival scaling and root planing                   │
│   (B) Oral hygiene instruction and localized antimicrobials            │
│   (C) Full-mouth flap debridement under local anesthesia               │
│   (D) Prescription of systemic amoxicillin and clavulanate             │
│                                                                        │
│ ┌────────────────────────────────────────────────────────────────────┐ │
│ │ 💡 Clinical Explanation (Review / Practice Mode Only)              │ │
│ │ Plaque-induced gingivitis responds primarily to non-surgical...     │ │
│ └────────────────────────────────────────────────────────────────────┘ │
├────────────────────────────────────────────────────────────────────────┤
│ [◄ Previous]                  [Question Palette 1-80]           [Next ►]│
└────────────────────────────────────────────────────────────────────────┘
```

### Key Pattern Elements
1. **Sticky Top HUD:** Shows active timer (`tabular-nums`), question index, flag toggle, and progress bar.
2. **Distinct Option Cards:**
   - Unselected: `border-slate-200 hover:border-slate-300 bg-white dark:bg-slate-900`
   - Selected: `border-teal-600 bg-teal-50/50 ring-1 ring-teal-600 dark:bg-teal-950/30`
   - Correct (Review mode): `border-emerald-600 bg-emerald-50 dark:bg-emerald-950/30`
   - Incorrect (Review mode): `border-rose-500 bg-rose-50 dark:bg-rose-950/30`
3. **Collapsible Clinical Explanation:** Rich markdown drawer citing clinical rationale, guidelines, and reference links.

---

## 2. High-Trust Landing Page & Hero Pattern

Designed to turn browsing dentists into registered, practicing students.

```
┌────────────────────────────────────────────────────────────────────────┐
│                              [Navigation]                              │
├────────────────────────────────────────────────────────────────────────┤
│  [Badge: Independent ADC Preparation]                                  │
│  Practise clinical scenarios.                                          │
│  Prepare with purpose.                                                 │
│                                                                        │
│  Build your dental exam preparation routine with structured practice   │
│  questions, timed mock tests, and in-depth clinical explanations.      │
│                                                                        │
│  [Explore Mock Tests ->]   [How It Works]                              │
│                                                                        │
│  ✓ Clinical scenarios   ✓ Timed mock tests   ✓ Answer explanations     │
├────────────────────────────────────────────────────────────────────────┤
│               [Interactive Clinical Question Preview Card]             │
└────────────────────────────────────────────────────────────────────────┘
```

### Key Pattern Elements
1. **Clear Hero Statement:** Concise, authoritative headline without vague marketing buzzwords.
2. **Interactive Live Preview:** An interactive sample question right in the hero demonstrating the actual product interface before sign-up.
3. **Feature Pillars (3-Column Grid):**
   - Realistic exam simulations under timed ADC Part 1 conditions.
   - Comprehensive domain analytics (Prosthodontics, Endodontics, Oral Surgery, Ethics).
   - Instant answer rationales with clinical justification.

---

## 3. Frictionless Checkout & Order Summary Pattern

Designed to provide complete financial clarity and build payment trust.

```
┌───────────────────────────────────┬──────────────────────────────────┐
│ Left Column: Product Value        │ Right Column: Payment & Price    │
├───────────────────────────────────┼──────────────────────────────────┤
│ ADC Complete Preparation Bundle   │ Order Total                      │
│ - Lifetime practice question bank │ Subtotal:        ₹1,499.00       │
│ - Timed Part 1 mock examinations  │ Promo Discount:  - ₹0.00         │
│ - Domain performance tracking     ├──────────────────────────────────┤
│ - Legal tax invoice included      │ Total (INR):     ₹1,499.00       │
│                                   │                                  │
│ [🔒 256-bit Encrypted Checkout]   │ Select Payment Method:           │
│                                   │ (•) Card via Stripe              │
│                                   │ ( ) UPI / NetBanking             │
│                                   │                                  │
│                                   │ [Pay ₹1,499 Securely ->]         │
└───────────────────────────────────┴──────────────────────────────────┘
```

### Key Pattern Elements
1. **Authoritative Integer Pricing:** Displayed price always reads **₹1,499** (denominated in INR), matching the backend's integer paise (`149900`).
2. **Transparent Order Breakdown:** Subtotal, promo code input, and net total clearly separated.
3. **Security Badges:** Reassuring padlock icon and encrypted checkout indicators.
4. **Asynchronous Polling Modal:** For redirect-based checkouts, redirect to `/checkout/processing` with live status polling.

---

## 4. Candidate Dashboard & Performance Analytics Pattern

Helps candidates immediately identify weak domains before test day.

```
┌────────────────────────────────────────────────────────────────────────┐
│ Welcome back, Dr. Candidate                       [Resume Latest Test] │
├──────────────────────────────────┬─────────────────────────────────────┤
│ Recent Attempts                  │ Domain Accuracy Breakdown           │
│ ───────────────────────────────  │ ─────────────────────────────────── │
│ Mock Exam 1: 78% (Passed)        │ Restorative & Endo     [████████░] 82%│
│ Mock Exam 2: 64% (Review Needed) │ Periodontics & Surgery [██████░░░] 68%│
│                                  │ Ortho & Pedo           [█████████] 91%│
│ [View Detailed Attempt Review]   │ Ethics & Communication [█████░░░░] 55%│
└──────────────────────────────────┴─────────────────────────────────────┘
```

### Key Pattern Elements
1. **Visual Progress Indicators:** Progress bars color-coded by performance (Green ≥ 70%, Amber 50–69%, Red < 50%).
2. **Direct Action Triggers:** Quick access to resume an in-progress attempt or review incorrect questions from past attempts.
