---
status: pending
priority: p2
issue_id: "010"
tags: [code-review, ui, recharts, visualization]
dependencies: []
---

# GoalCard Sparkline Missing YAxis — ReferenceLine for targetValue May Render Outside Visible Area

## Problem Statement

`GoalCard.tsx` renders a sparkline `<LineChart>` with a `<ReferenceLine y={goal.targetValue}>` but no `<YAxis>`. Without an explicit `YAxis`, Recharts auto-scales the domain to fit the rendered data points. If `targetValue` falls outside the auto-scaled domain (e.g., a weight loss goal where current value is 85 but target is 70), the `ReferenceLine` is clipped or rendered outside the chart area entirely — giving no visual indication of how far from the goal the user is.

**Why it matters:** The target line is the core visual affordance that shows progress toward the goal. If it's invisible, the sparkline conveys no meaningful information about goal proximity.

## Findings

**Location:** `src/components/GoalCard.tsx`

```tsx
// CURRENT — no YAxis, domain auto-scaled to entry values only
<LineChart data={chartData} width={200} height={60}>
  <Line type="monotone" dataKey="value" dot={false} />
  <ReferenceLine y={goal.targetValue} stroke="#10b981" strokeDasharray="3 3" />
</LineChart>

// FIX — explicit YAxis with domain covering both entries AND target
const allValues = [
  ...goal.entries.map(e => e.value),
  goal.startValue,
  goal.targetValue,
]
const minVal = Math.min(...allValues)
const maxVal = Math.max(...allValues)
const padding = (maxVal - minVal) * 0.1 || 1  // 10% padding, at least 1 unit

// In JSX:
<YAxis domain={[minVal - padding, maxVal + padding]} hide />
```

The `hide` prop hides the axis labels while still controlling the domain, preserving the compact sparkline appearance.

**Reported by:** kieran-typescript-reviewer, performance-oracle

## Proposed Solutions

### Option A: Add hidden YAxis with computed domain (Recommended)
Compute min/max across entries + startValue + targetValue, add `<YAxis domain={[min, max]} hide />`.
- **Pros:** Target line always visible, compact sparkline appearance preserved
- **Cons:** Slightly more code in GoalCard
- **Effort:** Small
- **Risk:** Low

### Option B: Clamp ReferenceLine to visible domain
Let Recharts auto-scale and just accept that target may be off-screen.
- **Pros:** No code change
- **Cons:** Target line invisible when meaningful — defeats the purpose
- **Effort:** None
- **Risk:** High (UX regression)

### Option C: Show target as separate indicator (badge/text) instead of ReferenceLine
Remove ReferenceLine, show target value as text overlay.
- **Pros:** Always visible regardless of scale
- **Cons:** Less visual, doesn't show relative distance
- **Effort:** Medium
- **Risk:** Low

## Recommended Action

_To be filled during triage_

## Technical Details

- **Affected files:** `src/components/GoalCard.tsx`
- **Recharts behavior:** Without explicit domain, YAxis scales to min/max of data points only
- **Edge case:** `allValues` empty (no entries yet) — use `[goal.startValue * 0.9, goal.targetValue * 1.1]` as fallback

## Acceptance Criteria

- [ ] `ReferenceLine` for `targetValue` is visible in the sparkline chart
- [ ] Chart domain encompasses both all entry values AND `targetValue`
- [ ] Sparkline remains compact (no visible Y-axis labels)
- [ ] Works correctly for both "increase to target" and "decrease to target" goals
- [ ] Empty entries (no data yet) doesn't throw

## Work Log

- **2026-03-15** — Identified during third /ce:review pass. Agents: kieran-typescript-reviewer, performance-oracle.

## Resources

- PR: current branch (life-chart)
- Recharts YAxis docs: https://recharts.org/en-US/api/YAxis
- Recharts ReferenceLine docs: https://recharts.org/en-US/api/ReferenceLine
