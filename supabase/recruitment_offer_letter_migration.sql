-- Candidate offer letter + e-signature support
alter table candidates
  add column if not exists offer_token text,
  add column if not exists offer_status text,
  add column if not exists offer_content jsonb,
  add column if not exists offer_pdf_path text,
  add column if not exists offer_sent_at timestamptz,
  add column if not exists offer_signed_at timestamptz;

-- Small key/value store for settings that aren't tied to a specific record,
-- starting with the recruiter's saved signature image (reused on every offer letter).
create table if not exists app_settings (
  key text primary key,
  value text,
  updated_at timestamptz not null default now()
);

alter table app_settings enable row level security;
