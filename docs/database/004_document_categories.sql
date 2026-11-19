-- Arqvo category classification (additive migration; no destructive changes).
-- category describes purchased items/services, NEVER the seller's industry.
-- NULL means the purchase category has not been determined.
ALTER TABLE public.documents
  ADD COLUMN IF NOT EXISTS category text,
  ADD COLUMN IF NOT EXISTS subcategory text;
