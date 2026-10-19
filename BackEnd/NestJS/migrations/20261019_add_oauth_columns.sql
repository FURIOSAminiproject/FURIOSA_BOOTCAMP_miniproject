-- Run once against the existing application database before starting the updated backend.
-- Existing local accounts are preserved and marked as provider='local'.
BEGIN;

ALTER TABLE users ALTER COLUMN email DROP NOT NULL;
ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL;

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS auth_provider varchar(20) NOT NULL DEFAULT 'local',
  ADD COLUMN IF NOT EXISTS provider_subject varchar(255);

CREATE UNIQUE INDEX IF NOT EXISTS uq_users_provider_subject
  ON users (auth_provider, provider_subject);

COMMIT;
