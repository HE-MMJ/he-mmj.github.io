# Cost Control Sidebar Design

## Intent
Move Cost Control into the main sidebar directly above Heavy Equipment without creating a new dashboard route.

## Goals
- Show Cost Control in the main menu.
- Keep position above Heavy Equipment.
- Preserve `#ex-cost` destination.
- Preserve `costcontrol` permission guard.

## Non-goals
- No new page or route.
- No data changes.
- No permission changes.

## Approach
Use existing sidebar navigation and existing Cost Control section. Move the Cost Control anchor from the authenticated extra-menu block into the main navigation before Heavy Equipment. Keep `data-mmj-auth="costcontrol"` so unauthorized users still do not see it. Remove duplicate old anchor.

## Acceptance
- Authorized user sees Cost Control above Heavy Equipment.
- Unauthorized user does not see Cost Control.
- Clicking Cost Control opens `#ex-cost`.
- Existing dashboard tabs and data remain unchanged.
- No git push without explicit command.
