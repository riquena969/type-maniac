import { teclasDaPalavra, type Tecla } from './keyboard-abnt2';

// Pesos do modelo. Ajustados olhando o relatório de decis do `npm run words`.
export const PESOS = {
  dedo: { indicador: 1.0, medio: 1.05, anelar: 1.25, minimo: 1.5 },
  fileira: { central: 1.0, superior: 1.2, inferior: 1.35 },
  esticada: 0.25,
  mesmaTecla: 0.1,
  mesmoDedo: 1.2,
  mesmoDedoSalto: 0.6,
  mesmaMao: 0.3,
  saltoFileira: 0.4,
  letraRara: { k: 1.0, w: 1.0, y: 1.0, x: 0.3, z: 0.3 } as Record<string, number>,
  familiaridade: 0.35,
} as const;

const ALTURA = { superior: 1, central: 0, inferior: -1 } as const;

function custoTecla(t: Tecla): number {
  return PESOS.dedo[t.dedo] * PESOS.fileira[t.fileira] + (t.esticada ? PESOS.esticada : 0);
}

function custoTransicao(a: Tecla, b: Tecla): number {
  if (a.id === b.id) return PESOS.mesmaTecla;
  if (a.mao !== b.mao) return 0;
  const salto = Math.abs(ALTURA[a.fileira] - ALTURA[b.fileira]) === 2;
  if (a.dedo === b.dedo) return PESOS.mesmoDedo + (salto ? PESOS.mesmoDedoSalto : 0);
  return PESOS.mesmaMao + (salto ? PESOS.saltoFileira : 0);
}

/** Esforço mecânico de digitar a palavra no ABNT2 (sem considerar familiaridade). */
export function esforcoDeDigitacao(palavra: string): number | null {
  const teclas = teclasDaPalavra(palavra);
  if (!teclas || teclas.length === 0) return null;
  let total = 0;
  teclas.forEach((t, i) => {
    total += custoTecla(t);
    if (i > 0) total += custoTransicao(teclas[i - 1], t);
  });
  for (const ch of palavra) total += PESOS.letraRara[ch] ?? 0;
  return total;
}

/**
 * Dificuldade bruta: esforço mecânico + quão rara a palavra é.
 * `posicaoFrequencia` é 1 para a palavra mais comum do corpus.
 */
export function dificuldadeBruta(palavra: string, posicaoFrequencia: number): number | null {
  const esforco = esforcoDeDigitacao(palavra);
  if (esforco === null) return null;
  return esforco + PESOS.familiaridade * Math.log(Math.max(1, posicaoFrequencia));
}
