/** Remove acentos e cedilha: "Ação" → "Acao". */
export function semAcentos(texto: string): string {
  return texto.normalize('NFD').replace(/[̀-ͯ]/g, '');
}

/** Letras permitidas nas palavras do jogo (pt-BR minúsculo). */
export const PALAVRA_VALIDA = /^[a-zçáàâãéêíóôõú]+$/;
