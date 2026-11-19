# Arqvo UI Kit — permanent visual reference

**Historical reference:** Original Arqvo prototype commit [6a9b6d54fcacef2fb96ab79cf83fd3aa96f2dcc7](https://github.com/gabrielduclos/arqvo/tree/6a9b6d54fcacef2fb96ab79cf83fd3aa96f2dcc7). The exact original prototype source is frozen in [App.tsx](../design/reference/2026-11-19-original-prototype/App.tsx) and [style.css](../design/reference/2026-11-19-original-prototype/style.css). **These files are reference only; never import demo data into production.**

## Style tokens (exact)
- Primary purple `#5146e5` (`brand`); hover purple / indigo-700.
- Active purple wash `#f0efff` (`brand-soft`).
- Canvas `#f7f8fc`; main ink `#191b2a`; secondary text `#74798b`.
- Historical dark-violet Overview hero `#201d42` remains archived for reference but **must not be restored** into the current Overview.
- White surfaces, thin slate-200 borders, indigo-50 icon backgrounds, `rounded-xl` controls and `rounded-2xl` cards.
- Fonts: Inter, system sans fallback; compact labels, tight tracked headings. Wordmark lowercase **arqvo.** with purple trailing dot.

## Layout, spacing and navigation (reference)
- Sticky white translucent app bar: **64px on mobile, 72px on desktop**. Brand, language and sign-out remain accessible.
- **Approved current navigation:** no sidebar. On mobile (<768px), a fixed bottom footer bar with **Overview** and **Documents**, icon + label, active lavender pill, 44px+ touch targets and Android/iOS safe-area inset.
- On desktop (>=768px), navigation is horizontal in the header; no lateral menu.
- The original 252px sidebar and hamburger drawer are **historical prototype artifacts**, explicitly superseded by the owner's mobile-first request.
- Mobile-first content with 16px horizontal padding and extra bottom spacing so the fixed footer never obscures content. Desktop uses a centered max-width container.
- Current Overview: simple title **without a large purple hero**; three clickable real-data KPI cards **side by side even on mobile**. Total opens all Documents, This month applies the current upload-month filter, and Data identified applies the completed-analysis filter.
- Documents: full-width upload CTA on mobile, separate keyword/AI modes in a compact segmented switch, horizontal filter pills, touch-friendly document cards, and a mobile bottom-sheet preview.
- **Upload guidance:** the tall permanent information card was replaced with a compact circular **ⓘ** next to Documents. Tapping opens an accessible modal/bottom sheet with file format, size and automatic AI processing details.
- Both screens use **real Neon account data only**, with an actual upload control. Preserve the visual structure without restoring static document arrays.

## Motion (do not regress)
- `motion/react` with `AnimatePresence mode="wait"`.
- Logo splash on initial load: full canvas background, centered icon and **animated horizontal indigo progress bar**, fades out to app.
- Fade main app in; reduced-motion preference respected via `useReducedMotion()`.
- Navigating between Overview and Documents: use subtle fade/translate and retain navigational continuity.
- Document preview modal: backdrop fade and 30px upward motion; closing fades/moves down.
- Toast: enters from bottom with fade/translate.
- Avoid jarring snap/cut transitions. The bottom footer is now the intentional approved mobile navigation pattern.

## Functionality always wins over demo data
**Visão geral / Overview** reads authenticated-user document statistics and recent entries. **Documentos / Documents** reads real uploads from R2/Neon, supports search, upload, automatic AI extraction, preview and delete. Initial view is login; no fictional document names or fake values.

## Change control
If future instructions change data flows, API, components or AI behavior, keep the visual pattern and animations intact. **Do not reintroduce the sidebar** without a new explicit design decision. A visual redesign is a separate product decision that requires explicit request. Before significant UI changes, compare with the frozen original prototype.

[Português](ui-kit.pt-BR.md)

## Mobile-first update — November 19, 2026
- Fixed two-tab bottom nav on mobile, top nav on desktop; no sidebar.
- 64px mobile header, 72px desktop header, safe area footer and tap-friendly controls.
- Compact mobile real-data overview, split search modes, scrollable filter pills, document action rows and bottom sheet.
- Inputs use 16px font size on small phones to prevent iOS focus zoom.


## Advanced document filters
- **Filters** button and active-filter count are displayed **inside the search area**, next to the keyword/AI search controls, not beside the document-list heading.
- Mobile panel with merchant, PDF/image, extraction status, date range (document or upload), min/max BRL amount and sorting.
- Combined filters execute against owner-scoped Neon queries; AI search honors explicit constraints.

## Current Overview/Search interaction (November 19, 2026)
- Remove the large Overview banner; no substitute hero card.
- Keep Total, This month and Identified side by side, including phones, and make each open an appropriately filtered Documents view.
- Keep Filters / Clear controls adjacent to the keyword/AI search area; the results section only shows its heading and result count.
