# MergeExcels v3.5.1 — Menu 09 Responsive Layout Fix

## Fixed
- Preserved Activity / Section as a full-width group heading above each related project block.
- Repeats the activity heading at the start of every paginated page so the project context is never lost.
- Rebuilt Menu 09 review controls into three responsive sections.
- Prevented filter, confirmation and bulk assignment controls from overflowing the main card.
- Added `min-width: 0` and width constraints for grid children, inputs, selects and buttons.
- Kept the project review table inside its own horizontal scroll container.
- Improved layout at desktop, tablet and mobile widths without changing Menu 09 business logic.

## Verification
- Existing unit tests must pass.
- Cloudflare Wrangler dry-run must pass.
- Visual checks cover 1440px, 1024px, 768px and 390px viewport widths.
