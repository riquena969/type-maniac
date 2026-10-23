export interface Projetil {
  letra: string;
  palavraId: number;
  indice: number;
  /** Progresso do voo, 0..1. */
  t: number;
  duracao: number;
  x0: number;
  y0: number;
  /** Desvio lateral do arco (lógico). */
  curva: number;
  x: number;
  y: number;
  rastro: Array<{ x: number; y: number }>;
}

const RASTRO = 7;

export function criarProjetil(letra: string, palavraId: number, indice: number, x0: number, y0: number): Projetil {
  return {
    letra, palavraId, indice,
    t: 0,
    duracao: 0.16 + Math.random() * 0.06,
    x0, y0,
    curva: (Math.random() < 0.5 ? -1 : 1) * (18 + Math.random() * 26),
    x: x0, y: y0,
    rastro: [],
  };
}

/** Avança o voo rumo à posição atual do alvo (que continua caindo). Devolve true ao chegar. */
export function avancarProjetil(p: Projetil, dt: number, alvoX: number, alvoY: number): boolean {
  p.t = Math.min(1, p.t + dt / p.duracao);
  const t = 1 - (1 - p.t) * (1 - p.t); // desacelera no fim
  const mx = (p.x0 + alvoX) / 2;
  const my = (p.y0 + alvoY) / 2;
  const dx = alvoX - p.x0;
  const dy = alvoY - p.y0;
  const comp = Math.hypot(dx, dy) || 1;
  const cx = mx + (-dy / comp) * p.curva;
  const cy = my + (dx / comp) * p.curva;
  const u = 1 - t;
  p.rastro.push({ x: p.x, y: p.y });
  if (p.rastro.length > RASTRO) p.rastro.shift();
  p.x = u * u * p.x0 + 2 * u * t * cx + t * t * alvoX;
  p.y = u * u * p.y0 + 2 * u * t * cy + t * t * alvoY;
  return p.t >= 1;
}
