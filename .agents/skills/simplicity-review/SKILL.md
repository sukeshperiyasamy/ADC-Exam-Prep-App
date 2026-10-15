---
name: simplicity-review
description: "Ponytail-inspired simplicity-first code review. Enforces minimal diffs, removes premature abstractions, and prevents over-engineering."
---

# Simplicity-First Code Review (Ponytail Principles)

## Purpose
Prevent over-engineering, bloated abstractions, and unnecessary complexity in the ADC Exam Prep codebase. Every change must be as simple as possible to fulfill the requirement, but no simpler.

## Core Rules
1. **No Speculative Abstractions (YAGNI):** Do not create generic wrapper classes, multi-level indirection, or helper factories for code used in only one place.
2. **Minimal Working Diffs:** Keep edits surgical and localized. Do not refactor unrelated files, variable names, or formatting in the same session.
3. **Reuse Existing Patterns:** Before writing a new helper, inspect `src/lib/` (`utils.ts`, `db.ts`, `settings.ts`, `fulfill.ts`).
4. **Concrete Over Generic:** Prefer explicit TypeScript functions with strict types over generic metaprogramming.
5. **Delete Dead Code:** If code is superseded by a new implementation, cleanly remove it rather than commenting it out.

## Review Checklist Before Completion
- [ ] Could this feature be implemented with 30% fewer lines of code?
- [ ] Are any new abstractions truly necessary for this single feature?
- [ ] Are existing utility functions (`formatPrice`, `nextNumber`, `db.$transaction`) being reused?
- [ ] Is there any unused dependency or mock left behind?
