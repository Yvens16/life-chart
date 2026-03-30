# Brainstorm: Goal Yearly Versioning

**Date:** 2026-03-30  
**Status:** Ready for planning  
**Topic:** Year-scoped goals so users can set and track different goals each year

---

## What We're Building

A yearly versioning system for goals that lets users maintain distinct, year-scoped goal instances while preserving cross-year continuity for goals they want to carry forward. Each year stands alone — its own targets, its own entries — but goals can be linked across years to enable comparison.

The primary experience: a year picker in the top navigation bar lets users switch between years. The current year is the default active context. Past years are read-only; goals can be copied forward into the current (or future) year. When a new year arrives, the app prompts the user to review which goals to carry over.

---

## Why This Approach

**Approach chosen: `year` field + `linkedGoalId` on `Goal`**

This is the minimal, backward-compatible change that delivers the full desired experience:

- Adding `year: number` to `Goal` scopes each goal to a calendar year
- An optional `linkedGoalId: string` creates a loose ancestry chain between yearly goal instances (e.g., "Read 20 books 2025" → "Read 25 books 2026")
- The existing `AppData` structure stays intact — no data migration needed beyond populating `year` on existing goals
- `activeYear` state (defaulting to `new Date().getFullYear()`) lives in the app context and drives all goal queries

Alternatives considered:
- **Year-bucketed AppData** — cleaner structure but breaks existing schema and complicates cross-year queries
- **GoalTemplate + GoalInstance** — most expressive but YAGNI for the current use case

---

## Key Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Data model change | Add `year` + optional `linkedGoalId` to `Goal` | Minimal change, backward-compatible |
| Year switcher location | Top navigation bar | Always visible, matches conventional pattern |
| Past year mutability | Read-only | Prevents accidental edits to historical data |
| Copy-forward behavior | User-prompted at new year start | User stays in control, no surprise resets |
| Goal linkage | Optional `linkedGoalId` chain | Enables comparison without enforcing it |
| Default year | Current calendar year | Natural default, no config needed |
| Existing data migration | Backfill `year` from `goal.createdAt` | Seamless, no manual user action required |

---

## User Flows

### Switching Years
1. User sees current year in the top bar (e.g. "2026")
2. User clicks the year picker — sees a list of years that have goals, plus the current year
3. Dashboard updates to show only goals for the selected year
4. Past years display a "read-only" indicator; create/edit/delete actions are hidden

### New Year Prompt
1. On first app load in a new calendar year, a modal appears: "It's a new year! Which goals would you like to carry into [year]?"
2. User sees a checklist of last year's goals (with their final progress shown)
3. User selects which to carry over; each selected goal is copied with a new `year`, `id`, reset `entries`, and `linkedGoalId` pointing to the source
4. User can adjust targets before confirming
5. Dismissed prompt is remembered (localStorage flag `newYearPromptShown_[year]`)

### Cross-Year Comparison
1. On the Goal Detail page, if a goal has a `linkedGoalId` chain, a "History" section shows a summary table or mini chart of progress for the same goal across past years
2. This is a read-only view, no interaction needed beyond display

### Copy Goal Forward
1. When viewing a past year, each GoalCard has a "Copy to [current year]" action
2. Creates a new goal for the current year linked to the source goal
3. User is taken to an edit modal pre-filled with past goal's name/category/unit, where they can adjust the target

---

## Scope

**In scope:**
- `year` field on `Goal` type
- `linkedGoalId` field on `Goal` type
- `activeYear` in app context, defaulting to current year
- Year picker in top navigation bar
- Read-only mode for past years
- New year carry-over prompt modal
- "Copy to current year" action on GoalCards in past-year view
- Cross-year history on Goal Detail page
- Backfill migration: populate `year` from `createdAt` for existing goals

**Out of scope (for now):**
- Future year planning (goals for 2027 before 2027 starts)
- Goal "template" library separate from instances
- Bulk year management (delete all goals for a year)
- Year-level analytics (summary stats across years)

---

## Open Questions

*All resolved — see below.*

---

## Resolved Questions

| Question | Resolution |
|----------|------------|
| Should past years be editable? | No — read-only. Prevents historical data corruption. |
| Should goals carry over automatically? | No — user is prompted and chooses which to carry forward. |
| Should goals be linked or independent across years? | Linked via optional `linkedGoalId` to enable cross-year comparison. |
| Where does the year picker live? | Top navigation bar — always visible. |
