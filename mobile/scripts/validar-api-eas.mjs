const perfil = process.env.EAS_BUILD_PROFILE;
if (!perfil || perfil === 'production-apk') {
  const valor = process.env.EXPO_PUBLIC_API_URL?.trim().replace(/\/+$/, '');
  const url = URL.parse(valor ?? '');
  const formato = /^https:\/\/(?:[a-z0-9.-]+|\[[a-f0-9:]+\])(?::\d+)?(?:\/[a-z0-9_-]+)*\/v1$/i;
  const host = url?.hostname.replace(/\.$/, '');
  const local = host && (['localhost', '[::1]', '10.0.2.2', '0.0.0.0'].includes(host) || /^127(?:\.\d+){3}$/.test(host));
  if (!url || !formato.test(valor ?? '') || local) {
    console.error('Defina EXPO_PUBLIC_API_URL com a URL HTTPS da API de avaliação terminada em /v1.');
    process.exitCode = 1;
  } else {
    console.log('Formato de EXPO_PUBLIC_API_URL aprovado para production-apk.');
  }
}
