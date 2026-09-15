-- PandaDoc e-signature support for employee documents
create table if not exists pandadoc_documents (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid references employees(id) on delete cascade not null,
  pandadoc_document_id text unique not null,
  name text not null,
  status text not null default 'document.draft',
  sent_at timestamptz,
  completed_at timestamptz,
  pdf_path text,
  created_at timestamptz not null default now()
);

alter table pandadoc_documents enable row level security;

create policy "Admins manage pandadoc documents" on pandadoc_documents for all using (is_admin());
create policy "Employees view own pandadoc documents" on pandadoc_documents for select using (employee_id = my_employee_id());
