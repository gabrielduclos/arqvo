-- Arqvo: preserve the user's explicitly corrected amount across future OCR/AI runs.
-- Additive migration; existing amounts and documents are unchanged.
ALTER TABLE public.documents
  ADD COLUMN IF NOT EXISTS amount_manual boolean NOT NULL DEFAULT false;
