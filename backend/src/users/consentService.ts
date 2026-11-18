import type { Sessao } from '../auth/tokens.js';
import { config } from '../config.js';
import { emTransacao } from '../db/connection.js';
import { ErroApi } from '../middleware/errors.js';
import { buscarUsuarioAutenticado, limparDiarioERevogar, registrarAceite } from './repository.js';
import type { Usuario } from './repository.js';

export function temConsentimentoVigente(usuario: Usuario): boolean {
  return usuario.termo_versao === config.consentVersion && usuario.aceite_em !== null && usuario.revogado_em === null;
}

function estadoDoConsentimento(usuario: Usuario) {
  return {
    ativo: temConsentimentoVigente(usuario),
    versao: usuario.termo_versao,
    versaoAtual: config.consentVersion,
    aceiteEm: usuario.aceite_em === null ? null : Number(usuario.aceite_em),
    revogadoEm: usuario.revogado_em === null ? null : Number(usuario.revogado_em),
  };
}

export function perfilPublico(usuario: Usuario) {
  return {
    id: usuario.id,
    email: usuario.email,
    destaque: usuario.destaque,
    metaMin: usuario.meta_min,
    altoContraste: usuario.alto_contraste,
    consentimento: estadoDoConsentimento(usuario),
  };
}

export async function aceitarConsentimento(sessao: Sessao, versao: string) {
  if (versao !== config.consentVersion) {
    throw new ErroApi(422, 'VERSAO_TERMO_INVALIDA', 'Consulte e aceite a versão vigente do termo.', 'versao');
  }

  return emTransacao(async (client) => {
    const usuario = await buscarUsuarioAutenticado(sessao, client);
    const atualizado = temConsentimentoVigente(usuario) ? usuario : await registrarAceite(client, usuario.id, versao);
    return estadoDoConsentimento(atualizado);
  });
}

export async function revogarConsentimento(sessao: Sessao): Promise<void> {
  await emTransacao(async (client) => {
    const usuario = await buscarUsuarioAutenticado(sessao, client);
    await limparDiarioERevogar(client, usuario.id);
  });
}
