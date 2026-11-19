# Arqvo mobile-first UI Kit — frozen implementation

This folder freezes the production mobile-first UI at the explicit owner's request made November 19, 2026. It captures the first successful GitHub CI for the responsive implementation (commit `1d11520f57942c8751bc1945b5c0910b8daf8849`) and the subsequent updated UI Kit.

**These files are archival references only.** Do not import any component from this folder or deploy it. Use `apps/web/src/*` for active development.

## Canonical current rules
- No sidebar or mobile hamburger.
- Fixed bottom navigation on mobile: Overview / Documents; `env(safe-area-inset-bottom)`, comfortably sized targets.
- Horizontal navigation in desktop header.
- 64px mobile header and 72px desktop header.
- Real account data only, no fake document records or amounts.
- Responsive 2-column KPI cards, compact upload/search filters, mobile document cards and bottom-sheet preview.
- Splash and screen transitions remain via `motion/react`.
- Existing violet/canvas/ink color system preserved.

See [Portuguese UI Kit](../../../docs/ui-kit.pt-BR.md) and [English UI Kit](../../../docs/ui-kit.md). The earlier sidebar prototype is preserved separately in `design/reference/2026-11-19-original-prototype/`.