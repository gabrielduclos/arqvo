-- Arqvo category classification (additive, no destructive changes).
-- category describes purchased items/services, NEVER the seller's industry.
-- NULL category means the purchase category has not been determined.
-- Separate manual-override flags keep user corrections safe on subsequent AI runs.
ALTER TABLE public.documents
  ADD COLUMN IF NOT EXISTS category text,
  ADD COLUMN IF NOT EXISTS subcategory text,
  ADD COLUMN IF NOT EXISTS merchant_manual boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS category_manual boolean NOT NULL DEFAULT false;
