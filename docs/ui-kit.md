# Arqvo UI Kit — permanent visual reference

**Canonical reference:** Original Arqvo prototype commit [6a9b6d54fcacef2fb96ab79cf83fd3aa96f2dcc7](https://github.com/gabrielduclos/arqvo/tree/6a9b6d54fcacef2fb96ab79cf83fd3aa96f2dcc7). The exact original prototype source is frozen in [App.tsx](../design/reference/2026-11-19-original-prototype/App.tsx) and [style.css](../design/reference/2026-11-19-original-prototype/style.css). **These files are reference only; never import demo data into production.**

## Style tokens (exact)
- Primary purple `#5146e5` (`brand`); hover purple / indigo-700.
- Active purple wash `#f0efff` (`brand-soft`).
- Canvas `#f7f8fc`; main ink `#191b2a`; secondary text `#74798b`.
- Overview hero `#201d42` with subtle violet glows and white/indigo-100 typography.
- White surfaces, thin slate-200 borders, indigo-50 icon backgrounds, `rounded-xl` controls and `rounded-2xl` cards.
- Fonts: Inter, system sans fallback; compact labels, tight tracked headings. Wordmark lowercase **arqvo.** with purple trailing dot.

## Layout, spacing and navigation (reference)
- Top app bar sticky, white translucent, **72px height**, border-bottom, content `max-w-[1520px]`.
- Left vertical sidebar **252px** on desktop, right border, sticky below header; icon navigation and purple security info card.
- Mobile navigation via hamburger/drawer, *not* a row of tabs replacing the sidebar; closes after selection.
- Main content padding `px-5 sm:px-8 lg:px-12 lg:pt-12`.
- Overview: deep-purple hero **rounded-[28px]**, illustration glow, two buttons and white metric cards; recent documents and feature cards below.
- Documents: page title, primary upload CTA, one white search card with rounded input and category/filter pills; list rows with icons and status.
- Both screens use **real Neon account data only**, with an actual upload control. Preserve the visual structure without restoring static document arrays.

## Motion (do not regress)
- `motion/react` with `AnimatePresence mode="wait"`.
- Logo splash on initial load: full canvas background, centered icon and **animated horizontal indigo progress bar**, fades out to app.
- Fade main app in; reduced-motion preference respected via `useReducedMotion()`.
- Navigating between Overview and Documents: use subtle fade/translate and retain navigational continuity.
- Document preview modal: backdrop fade and 30px upward motion; closing fades/moves down.
- Toast: enters from bottom with fade/translate.
- Avoid jarring snap/cut transitions or new unrelated navigation patterns.

## Functionality always wins over demo data
**Visão geral / Overview** reads authenticated-user document statistics and recent entries. **Documentos / Documents** reads real uploads from R2/Neon, supports search, upload, automatic AI extraction, preview and delete. Initial view is login; no fictional document names or fake values.

## Change control
If future instructions change data flows, API, components or AI behavior, keep the visual pattern and animations intact. A visual redesign is a separate product decision that requires explicit request. Before significant UI changes, compare with the frozen original prototype.

[Português](ui-kit.pt-BR.md)