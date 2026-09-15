-- Let an employee sit in "onboarding" between signing their contract and
-- completing their personal-details form.
alter table employees drop constraint if exists employees_status_check;
alter table employees add constraint employees_status_check check (status in ('onboarding','active','inactive','terminated'));

-- Unguessable token used in the personalized onboarding link we email them —
-- kept separate from the employee id so it can be cleared/rotated independently.
alter table employees add column if not exists onboarding_token text unique;
alter table employees add column if not exists onboarding_sent_at timestamptz;
