import { semAcentos } from '../words/normalize';

export interface Alvejavel {
  id: number;
  letras: readonly string[];
  digitadas: number;
  y: number;
  ativa: boolean;
}

export type ResultadoTecla =
  | { tipo: 'acerto'; palavraId: number; indice: number; completou: boolean; travou: boolean }
  | { tipo: 'erro'; palavraId: number | null; esperado: string | null };

export interface OpcoesMira {
  ignorarAcentos: boolean;
}

/** Extrai a letra digitada de um evento de teclado, ou `null` se não for uma letra jogável. */
export function letraDoEvento(e: Pick<KeyboardEvent, 'key' | 'ctrlKey' | 'metaKey' | 'altKey'>): string | null {
  if (e.metaKey || (e.ctrlKey && !e.altKey)) return null;
  const tecla = e.key.normalize('NFC');
  if ([...tecla].length !== 1 || !/\p{L}/u.test(tecla)) return null;
  return tecla.toLocaleLowerCase('pt-BR');
}

export function letrasIguais(esperada: string, digitada: string, ignorarAcentos: boolean): boolean {
  return esperada === digitada || (ignorarAcentos && semAcentos(esperada) === semAcentos(digitada));
}

/**
 * Decide o que uma letra digitada faz: avança o alvo atual, trava num novo alvo
 * (a palavra mais baixa cuja próxima letra bate) ou conta como erro.
 */
export function processarTecla(
  letra: string,
  palavras: readonly Alvejavel[],
  alvoId: number | null,
  opcoes: OpcoesMira,
): ResultadoTecla {
  const alvo = alvoId === null ? undefined : palavras.find((p) => p.id === alvoId && p.ativa);
  if (alvo) {
    const esperada = alvo.letras[alvo.digitadas];
    if (letrasIguais(esperada, letra, opcoes.ignorarAcentos)) {
      return acerto(alvo, false);
    }
    return { tipo: 'erro', palavraId: alvo.id, esperado: esperada };
  }

  let escolhida: Alvejavel | undefined;
  for (const p of palavras) {
    if (!p.ativa || p.digitadas >= p.letras.length) continue;
    if (!letrasIguais(p.letras[p.digitadas], letra, opcoes.ignorarAcentos)) continue;
    if (!escolhida || p.y > escolhida.y) escolhida = p;
  }
  if (escolhida) return acerto(escolhida, true);
  return { tipo: 'erro', palavraId: null, esperado: null };
}

function acerto(p: Alvejavel, travou: boolean): ResultadoTecla {
  return {
    tipo: 'acerto',
    palavraId: p.id,
    indice: p.digitadas,
    completou: p.digitadas + 1 === p.letras.length,
    travou,
  };
}
