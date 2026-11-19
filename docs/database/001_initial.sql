-- Proposed database schema. NOT APPLIED. Authentication must be implemented first.
-- Every document query MUST be scoped by authenticated owner_uid.
BEGIN;

CREATE TABLE IF NOT EXISTS documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_uid text NOT NULL,
  original_filename text NOT NULL,
  mime_type text NOT NULL,
  size_bytes bigint NOT NULL CHECK (size_bytes >= 0),
  object_key text NOT NULL UNIQUE,
  sha256 text,
  status text NOT NULL DEFAULT 'uploaded'
    CHECK (status IN ('uploaded','processing','ready','failed')),
  merchant text,
  document_date date,
  amount_cents bigint CHECK (amount_cents IS NULL OR amount_cents >= 0),
  currency char(3) NOT NULL DEFAULT 'BRL',
  extracted_text text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_documents_owner_created
  ON documents (owner_uid, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_documents_owner_date
  ON documents (owner_uid, document_date DESC);
CREATE INDEX IF NOT EXISTS idx_documents_owner_amount
  ON documents (owner_uid, amount_cents);
CREATE INDEX IF NOT EXISTS idx_documents_text_search
  ON documents USING gin (
    to_tsvector('portuguese', coalesce(merchant, '') || ' ' || coalesce(extracted_text, ''))
  );

COMMIT;
