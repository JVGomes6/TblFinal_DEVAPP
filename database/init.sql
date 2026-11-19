BEGIN ISOLATION LEVEL READ COMMITTED;

-- Inicializações e migrações concorrentes aguardam pelo mesmo esquema.
SELECT pg_advisory_xact_lock(hashtext('entrenoites:schema'), hashtext(current_schema()::text));

CREATE TABLE IF NOT EXISTS usuarios (
  id UUID PRIMARY KEY,
  email TEXT NOT NULL,
  senha_hash TEXT NOT NULL,
  criado_em BIGINT NOT NULL DEFAULT (floor(extract(epoch FROM CURRENT_TIMESTAMP))::BIGINT),
  termo_versao TEXT,
  aceite_em BIGINT,
  revogado_em BIGINT,
  consentimento_versao INTEGER NOT NULL DEFAULT 0 CHECK (consentimento_versao >= 0),
  sessao_versao INTEGER NOT NULL DEFAULT 1 CHECK (sessao_versao >= 1),
  destaque TEXT NOT NULL DEFAULT 'duracao' CHECK (destaque IN ('duracao', 'humor')),
  meta_min INTEGER CHECK (meta_min BETWEEN 0 AND 1439),
  alto_contraste BOOLEAN NOT NULL DEFAULT FALSE,
  CHECK ((termo_versao IS NULL) = (aceite_em IS NULL)),
  CHECK (revogado_em IS NULL OR (aceite_em IS NOT NULL AND revogado_em >= aceite_em))
);

CREATE UNIQUE INDEX IF NOT EXISTS usuarios_email_lower_uidx ON usuarios (lower(email));

CREATE TABLE IF NOT EXISTS registros_sono (
  id UUID PRIMARY KEY,
  usuario_id UUID NOT NULL REFERENCES usuarios (id) ON DELETE CASCADE,
  data_local DATE NOT NULL CHECK (data_local BETWEEN DATE '0001-01-01' AND DATE '9999-12-31'),
  fuso TEXT NOT NULL,
  deitou BIGINT NOT NULL,
  dormiu BIGINT NOT NULL,
  acordou BIGINT NOT NULL,
  minutos_acordado INTEGER CHECK (minutos_acordado >= 0),
  despertares INTEGER CHECK (despertares >= 0),
  qualidade INTEGER NOT NULL CHECK (qualidade BETWEEN 1 AND 5),
  humor INTEGER CHECK (humor BETWEEN 1 AND 5),
  cansaco INTEGER CHECK (cansaco BETWEEN 1 AND 5),
  cafeina BOOLEAN,
  telas BOOLEAN,
  ansiedade BOOLEAN,
  sonho TEXT CHECK (char_length(sonho) <= 1000),
  duracao_estimada_min INTEGER GENERATED ALWAYS AS (
    (acordou - dormiu) / 60 - coalesce(minutos_acordado, 0)
  ) STORED,
  versao INTEGER NOT NULL DEFAULT 1 CHECK (versao > 0),
  criado_em BIGINT NOT NULL DEFAULT (floor(extract(epoch FROM CURRENT_TIMESTAMP))::BIGINT),
  CHECK (deitou <= dormiu AND dormiu < acordou AND acordou - deitou <= 86400),
  CHECK (deitou % 60 = 0 AND dormiu % 60 = 0 AND acordou % 60 = 0),
  CHECK (duracao_estimada_min >= 0),
  CHECK (despertares IS NULL OR despertares > 0 OR coalesce(minutos_acordado, 0) = 0),
  UNIQUE (usuario_id, data_local)
);

-- O Pool usa a role proprietária das tabelas. Sem políticas, roles da Data API
-- que estão sujeitas a RLS ficam impedidas de ler ou gravar estas linhas.
ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE registros_sono ENABLE ROW LEVEL SECURITY;

COMMIT;
