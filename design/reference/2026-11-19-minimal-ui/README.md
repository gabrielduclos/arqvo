# Arqvo minimal mobile-first UI — frozen reference

**Canonical layout after the user's November 19, 2026 adjustments.** These copied files are reference-only; active source stays in `apps/web/src/`.

- **Never** show decorative “Privado · somente sua conta” / “Private · only your account” notices or repeated security marketing. Better Auth protects authenticated routes; policy disclosures remain available.
- Overview has **no promotional purple hero and no AI promotion card**. Display real KPI totals in a single three-column row; KPI cards open real document filters.
- Documents has a single keyword search with adjacent **Filtros** button. No quick All/PDF/Images pills and no Ask AI search or search-mode toggle.
- Keep category, merchant, amount, upload/document dates, status and file type in the advanced filter bottom sheet.
- Automatic AI extraction and user-triggered reanalysis remain; the removed AI-powered **search** is unrelated to OCR.
- A single small information icon beside Documents opens upload and automatic AI-processing details, rather than a tall notice card.
- Preview opens as mobile bottom sheet; preserve mobile bottom navigation (Overview / Documents), iOS safe areas, brand colors and motion.
- Legal Privacy Policy access and factual AI-processing notice remain even though decorative "private" badges are removed.

This snapshot was taken from commit `603aa29a122df1f5c6fe7bdb13a0bdd3581f56d8`.
See `docs/ui-kit.pt-BR.md` and `docs/ui-kit.md` for current specifications.
