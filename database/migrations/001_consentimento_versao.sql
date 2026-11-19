BEGIN ISOLATION LEVEL READ COMMITTED;

SELECT pg_advisory_xact_lock(hashtext('entrenoites:schema'), hashtext(current_schema()::text));

ALTER TABLE usuarios
  ADD COLUMN IF NOT EXISTS consentimento_versao INTEGER NOT NULL DEFAULT 0
  CHECK (consentimento_versao >= 0);

COMMIT;
