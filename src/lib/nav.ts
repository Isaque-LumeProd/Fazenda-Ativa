import { router } from 'expo-router';

/** Volta para a tela anterior; se não houver (ex.: página aberta direto no navegador), vai para o Início */
export function voltar() {
  if (router.canGoBack()) router.back();
  else router.replace('/');
}
