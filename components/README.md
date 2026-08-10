# components/

Empty on purpose until Phase 3. Planned breakdown (referenced as TODOs in
[`app/page.tsx`](../app/page.tsx)):

- `UploadZone.tsx` — file input / drag-drop, calls `convertIfHeic`
- `VariantPicker.tsx` — sunrise / midnight / sand / palm selector
- `TeamPhotoPicker.tsx` — 2–3 photo slots for team mode
- `CardPreview.tsx` — live canvas preview, calls `drawCard` on every change
- `DownloadShareBar.tsx` — download button + `shareCard` trigger

Keep these presentational; all image/canvas logic stays in `lib/` per the
module contracts in `HHGoa_Task1_API_Contract.docx` §2.
