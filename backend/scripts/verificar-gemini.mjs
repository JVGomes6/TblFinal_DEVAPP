import { randomBytes } from 'node:crypto';

if (!process.env.GEMINI_API_KEY?.trim()) {
  console.error('Configure GEMINI_API_KEY no ambiente do servidor ou no arquivo backend/.env.');
  process.exitCode = 1;
} else {
  // O ensaio usa o adaptador e o catálogo do backend com um contexto fictício, sem acessar o diário.
  process.env.DATABASE_URL = 'postgresql://localhost/ensaio_gemini';
  process.env.JWT_SECRET_BASE64 = randomBytes(32).toString('base64');
  process.env.GEMINI_ENABLED = 'true';

  try {
    const { config } = await import('../dist/config.js');
    const { gerarIdsNoGemini } = await import('../dist/ai/gemini.js');
    const { comporCartao, prepararComposicao, versaoCatalogo } = await import('../dist/ai/compose.js');
    const contexto = { foco: 'rotina', cobertura: 'zero' };
    const { instrucaoSistema, esquema, opcoes } = prepararComposicao(contexto);
    const ids = await gerarIdsNoGemini(contexto, instrucaoSistema, esquema, AbortSignal.timeout(config.geminiTimeoutMs));
    const cartao = comporCartao(ids, opcoes);
    console.log(JSON.stringify({ modelo: config.geminiModel, versaoCatalogo, ids: JSON.parse(ids), cartao }, null, 2));
  } catch (erro) {
    if (erro?.code === 'ERR_MODULE_NOT_FOUND') console.error('Compile o backend com npm run build antes do ensaio.');
    else console.error('O ensaio não obteve um cartão validado de gemini-2.5-flash. Verifique a configuração e o acesso do projeto ao modelo.');
    process.exitCode = 1;
  }
}
