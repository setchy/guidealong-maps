## Why

The `pnpm fetch:tours` CLI pipeline currently outputs plain, unstyled text across all three phases. Phase headers, progress counters, warnings, and the final summary all blend together, making it hard to scan output at a glance — especially when runs are long (enrichment can take 30+ minutes). Adding color differentiation and a consolidated summary improves operator experience.

## What Changes

- Add `picocolors` as a dependency for lightweight, zero-config terminal colors
- Colorize phase headers (inventory / details / geocode) with distinct bold colors
- Colorize progress counters, success lines, warnings, and errors
- Add a consolidated fetch summary at the end showing total tours, category breakdown, and per-phase stats

## Capabilities

### New Capabilities

_None — this is a cosmetic/tooling change with no behavior-level requirements changes._

### Modified Capabilities

_None._

## Impact

- **Files modified**: `lib/log.js`, `lib/index.js`, `lib/enrich.js`, `lib/geocode.js`, `lib/inventory.js`, `package.json`
- **New dependency**: `picocolors` (tiny, zero-dep terminal color library)
- **No breaking changes**: output is still plain text (colors are ANSI escape sequences that degrade gracefully)
