import { Router } from 'express';
import { z } from 'zod';
import { config } from '../config.js';
import { autenticacaoAtual, exigirAutenticacao } from '../middleware/auth.js';
import { ErroApi, semConsulta, semCorpo, validarCorpo } from '../middleware/errors.js';
import { limitarCadastro, limitarLogin } from '../middleware/limit.js';
import { perfilPublico } from '../users/consentService.js';
import { buscarCredenciaisPorEmail, criarUsuario, invalidarSessoes } from '../users/repository.js';
import { gerarHashSenha, senhaSchema, verificarSenha } from './passwords.js';
import { emitirToken } from './tokens.js';

const emailSchema = z.string().trim().toLowerCase().max(254).pipe(z.email());
const cadastroSchema = z.strictObject({ email: emailSchema, senha: senhaSchema });
const loginSchema = z.strictObject({ email: z.string(), senha: z.string() });

function credenciaisInvalidas(): ErroApi {
  return new ErroApi(401, 'CREDENCIAIS_INVALIDAS', 'E-mail ou senha inválidos.');
}

export const authRouter = Router();
authRouter.use(semConsulta);

authRouter.post('/register', limitarCadastro, async (req, res) => {
  const { email, senha } = validarCorpo(cadastroSchema, req.body);
  const usuario = await criarUsuario(email, await gerarHashSenha(senha));
  if (!usuario) throw new ErroApi(409, 'EMAIL_EM_USO', 'Este e-mail já está em uso.');

  res.status(201).json(perfilPublico(usuario));
});

authRouter.post('/login', limitarLogin, async (req, res) => {
  const dados = validarCorpo(loginSchema, req.body);
  const email = emailSchema.safeParse(dados.email);
  const senha = senhaSchema.safeParse(dados.senha);
  if (!email.success || !senha.success) throw credenciaisInvalidas();

  const usuario = await buscarCredenciaisPorEmail(email.data);
  const confere = await verificarSenha(senha.data, usuario?.senha_hash);
  if (!usuario || !confere) throw credenciaisInvalidas();

  res.json({
    token: emitirToken(usuario.id, usuario.sessao_versao),
    expiraEm: config.jwtTtlSeconds,
    usuario: perfilPublico(usuario),
  });
});

authRouter.post('/logout', exigirAutenticacao, semCorpo, async (_req, res) => {
  await invalidarSessoes(autenticacaoAtual(res).sessao);
  res.status(204).end();
});
