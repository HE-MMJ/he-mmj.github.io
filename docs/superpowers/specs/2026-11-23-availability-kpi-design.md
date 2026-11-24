# Availability KPI Design

## Intent
Combine separate MA and PA KPI cards into one compact Availability card while preserving both metrics, their thresholds, and vendor drill-down usefulness.

## Goals
- Show MA and PA as distinct values in one card.
- Keep MA warning threshold at `<85%` and PA threshold at `<80%`.
- Keep metric-specific coloring and blinking behavior.
- Clicking Availability opens vendor breakdown with MA and PA side by side; selecting a vendor shows each unit's MA and PA side by side.
- Keep calculations and current date-range behavior unchanged.

## Non-goals
- Combine MA and PA into one score.
- Change formulas, thresholds, data filtering, or other KPI cards.
- Commit or push changes.

## Approaches
1. One Availability card with two labeled values; one combined vendor drill-down. Selected. Preserves metric meaning while reducing card count.
2. One averaged MA/PA score. Rejected because it hides distinct measures and thresholds.
3. Keep two separate cards. Rejected because it does not meet requested combined-card layout.

## Constraints and design
- Existing KPI rendering lives in `js/app.js`; built/tab counterpart is `assets/js/tab/he.js`.
- Preserve existing MA and PA calculations and threshold semantics.
- Vendor drill-down should show MA and PA columns separately and retain per-metric red warning states.
- Update corresponding styles in `css/style.css` and `assets/css/he.css` only if needed for the two-value layout.
- Keep changes aligned between source and built HE files. Do not commit or push.

## Builder decisions
Use a single `availability` card kind for click handling. Render MA and PA values with explicit labels and independent warning states. Extend the existing vendor/unit drill-down to present both fields together; avoid a composite score or duplicated panels.
