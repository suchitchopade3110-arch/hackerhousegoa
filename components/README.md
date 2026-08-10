# components/

Left empty deliberately. Phase 3 built the tool as a single `app/page.tsx`
client component rather than splitting into `UploadZone` /
`VariantPicker` / `CardPreview` / `DownloadShareBar` as originally sketched
here — at this scope (one page, one form, one canvas) the split added
indirection without adding clarity. All image/canvas logic still lives in
`lib/` per the module contracts in `HHGoa_Task1_API_Contract.docx` §2;
`app/page.tsx` only wires state to those functions.

Revisit componentizing if `app/page.tsx` grows past what fits on one
screen, but that's a nice-to-have, not a Phase 4 blocker.
