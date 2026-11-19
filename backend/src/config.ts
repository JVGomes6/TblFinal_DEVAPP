import { Buffer } from 'node:buffer';
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  HOST: z.string().trim().min(1).default('127.0.0.1'),
  PORT: z.coerce.number().int().min(1).max(65535).default(3333),
  DATABASE_URL: z.string().trim().pipe(z.url({
    protocol: /^postgres(?:ql)?$/,
    hostname: /.+/,
    error: 'Informe uma URL de conexão PostgreSQL com host.',
  })),
  JWT_SECRET_BASE64: z.string().trim()
    .pipe(z.base64({ error: 'Informe um segredo em Base64.' }))
    .transform((secret) => Buffer.from(secret, 'base64'))
    .refine((secret) => secret.length >= 32, {
      error: 'O segredo deve ter pelo menos 32 bytes após decodificação.',
    }),
  JWT_ISSUER: z.string().trim().min(1).default('entrenoites-api'),
  JWT_AUDIENCE: z.string().trim().min(1).default('entrenoites-mobile'),
  JWT_TTL_SECONDS: z.coerce.number().int().positive().default(3600),
  CONSENT_VERSION: z.string().trim().min(1).default('sono-1'),
  GEMINI_ENABLED: z.stringbool().default(false),
  GEMINI_API_KEY: z.string().trim().transform((key) => key || undefined).optional(),
  GEMINI_MODEL: z.string().trim().pipe(z.literal('gemini-2.5-flash')).default('gemini-2.5-flash'),
  GEMINI_TIMEOUT_MS: z.coerce.number().int().positive().default(45000),
});

const result = envSchema.safeParse(process.env);

if (!result.success) {
  const issues = result.error.issues.map((issue) => `- ${issue.path.join('.')} — ${issue.message}`);
  throw new Error(['Configuração do backend inválida.', ...issues].join('\n'));
}

const env = result.data;

export const config = {
  nodeEnv: env.NODE_ENV,
  host: env.HOST,
  port: env.PORT,
  databaseUrl: env.DATABASE_URL,
  jwtSecret: env.JWT_SECRET_BASE64,
  jwtIssuer: env.JWT_ISSUER,
  jwtAudience: env.JWT_AUDIENCE,
  jwtTtlSeconds: env.JWT_TTL_SECONDS,
  consentVersion: env.CONSENT_VERSION,
  geminiEnabled: env.GEMINI_ENABLED,
  geminiApiKey: env.GEMINI_API_KEY,
  geminiModel: env.GEMINI_MODEL,
  geminiTimeoutMs: env.GEMINI_TIMEOUT_MS,
};
