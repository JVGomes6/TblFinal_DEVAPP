BEGIN;

ALTER TABLE usuarios
  ADD COLUMN IF NOT EXISTS consentimento_versao INTEGER NOT NULL DEFAULT 0
  CHECK (consentimento_versao >= 0);

COMMIT;
