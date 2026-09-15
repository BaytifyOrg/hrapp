-- Separate encrypted field for a device's lock-screen passcode, distinct from its account password
-- (e.g. a phone's iCloud password vs. its numeric unlock passcode).
alter table company_assets add column if not exists passcode_encrypted text;
