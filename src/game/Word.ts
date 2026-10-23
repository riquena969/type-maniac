import type { Alvejavel } from './Targeting';

export interface Palavra extends Alvejavel {
  texto: string;
  dificuldade: number;
  /** Centro horizontal e linha de base, em coordenadas lógicas. */
  x: number;
  y: number;
  velocidade: number;
  /** Posição x (relativa à borda esquerda) e largura de cada letra. */
  deslocamentos: number[];
  larguras: number[];
  largura: number;
  /** Letras cujo projétil já chegou. */
  atingidas: number;
  estado: 'caindo' | 'completa';
  pontos: number;
}

export interface MedidaTexto {
  deslocamentos: number[];
  larguras: number[];
  largura: number;
}

/** Centro da letra `indice` da palavra, em coordenadas lógicas. */
export function centroDaLetra(p: Palavra, indice: number): { x: number; y: number } {
  const i = Math.min(indice, p.letras.length - 1);
  return { x: p.x - p.largura / 2 + p.deslocamentos[i] + p.larguras[i] / 2, y: p.y - 6 };
}
