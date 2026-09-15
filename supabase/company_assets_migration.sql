-- Company assets & passwords vault (phones, laptops, SIMs, shared logins, etc.)
create table if not exists company_assets (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  asset_type text not null default 'other',
  assigned_employee_id uuid references employees(id) on delete set null,
  assigned_to_note text,
  username text,
  secret_encrypted text,
  passcode_encrypted text,
  notes text,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table company_assets enable row level security;

create index if not exists company_assets_assigned_employee_id_idx on company_assets(assigned_employee_id);
