# Arqvo UI Kit — camera, gallery and file picker snapshot

Frozen UI source at commit `fee8f3dfffa33b5913822533219a0a2f221bb3bd`, with the approved mobile-first upload flow and prior navigation decisions. **Reference-only:** active source remains `apps/web/src/`.

Current behavior:
- **Adicionar documento / Add a document** opens a custom Arqvo bottom sheet first.
- Choice 1: **Câmera / Camera** — invokes a native camera capture flow, preferably the back camera on mobile.
- Choice 2: **Galeria / Photo library** — invokes the mobile's image picker (JPG/PNG/WebP).
- Choice 3: **Arquivo / Files** — invokes the native file picker for PDFs or supported images.
- A native capture/file chooser still handles the actual device media; the Arqvo modal handles the **first source choice**.
- Mobile safe-area bottom padding, tap targets, escape/close/backdrop dismissal and motion preserved.
- R2, Neon, Workers AI extraction, server validation and the 8 MB upload limit are unchanged.
- Profile/Password screen is available via the third bottom-nav tab. No sidebar. No large purple overview hero, no AI search tab or private badges.

See `docs/ui-kit.pt-BR.md` and `docs/ui-kit.md` for the latest rules, and `design/reference/2026-11-19-minimal-ui` for the previous snapshot.
