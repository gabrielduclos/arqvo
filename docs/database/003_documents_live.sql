-- Arqvo live documents (additive, no DROP/ALTER of existing Better Auth data)
-- Originals are stored in private R2, not in PostgreSQL.
-- All application queries must scope documents by authenticated owner_uid.
CREATE TABLE IF NOT EXISTS public.documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_uid text NOT NULL REFERENCES public."user"(id) ON DELETE CASCADE,
  original_filename text NOT NULL CHECK (char_length(original_filename) BETWEEN 1 AND 255),
  mime_type text NOT NULL CHECK (mime_type IN ('application/pdf','image/jpeg','image/png','image/webp')),
  size_bytes bigint NOT NULL CHECK (size_bytes BETWEEN 1 AND 8388608),
  object_key text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'uploaded'
    CHECK (status IN ('uploaded','ready','failed')),
  merchant text,
  document_date date,
  amount_cents bigint CHECK (amount_cents IS NULL OR amount_cents BETWEEN 0 AND 100000000000),
  currency char(3) NOT NULL DEFAULT 'BRL',
  extracted_text text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_arqvo_documents_owner_created ON public.documents (owner_uid, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_arqvo_documents_owner_date ON public.documents (owner_uid, document_date DESC);
CREATE INDEX IF NOT EXISTS idx_arqvo_documents_owner_amount ON public.documents (owner_uid, amount_cents);
CREATE TABLE IF NOT EXISTS public.ai_usage (
  owner_uid text NOT NULL,
  usage_day date NOT NULL DEFAULT (now() AT TIME ZONE 'UTC')::date,
  used integer NOT NULL DEFAULT 0 CHECK (used BETWEEN 0 AND 500),
  PRIMARY KEY(owner_uid, usage_day)
);
