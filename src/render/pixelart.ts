/** Tamanho de um "pixel de arte" em unidades lógicas. */
export const PIXEL = 2;

export type Paleta = Record<string, string>;

/** Converte um desenho em texto (1 caractere = 1 pixel de arte) num canvas. */
export function criarSprite(linhas: readonly string[], paleta: Paleta): HTMLCanvasElement {
  const largura = Math.max(...linhas.map((l) => l.length));
  const canvas = document.createElement('canvas');
  canvas.width = largura;
  canvas.height = linhas.length;
  const ctx = canvas.getContext('2d')!;
  linhas.forEach((linha, y) => {
    [...linha].forEach((ch, x) => {
      const cor = paleta[ch];
      if (!cor) return;
      ctx.fillStyle = cor;
      ctx.fillRect(x, y, 1, 1);
    });
  });
  return canvas;
}

export function espelhar(sprite: HTMLCanvasElement): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = sprite.width;
  canvas.height = sprite.height;
  const ctx = canvas.getContext('2d')!;
  ctx.translate(sprite.width, 0);
  ctx.scale(-1, 1);
  ctx.drawImage(sprite, 0, 0);
  return canvas;
}

/** Desenha o sprite com o canto superior esquerdo em (x, y) lógicos. */
export function desenharSprite(
  ctx: CanvasRenderingContext2D,
  sprite: CanvasImageSource & { width: number; height: number },
  x: number, y: number,
  pixel = PIXEL,
): void {
  ctx.drawImage(sprite, Math.round(x), Math.round(y), sprite.width * pixel, sprite.height * pixel);
}

/** Linha de pixels de arte (Bresenham), com espessura em pixels de arte. */
export function linhaDePixels(
  ctx: CanvasRenderingContext2D,
  x0: number, y0: number, x1: number, y1: number,
  cor: string, espessura = 1, pixel = PIXEL,
): void {
  let ax = Math.round(x0 / pixel), ay = Math.round(y0 / pixel);
  const bx = Math.round(x1 / pixel), by = Math.round(y1 / pixel);
  const dx = Math.abs(bx - ax), dy = -Math.abs(by - ay);
  const sx = ax < bx ? 1 : -1, sy = ay < by ? 1 : -1;
  let erro = dx + dy;
  ctx.fillStyle = cor;
  const meio = Math.floor((espessura - 1) / 2);
  for (;;) {
    ctx.fillRect((ax - meio) * pixel, (ay - meio) * pixel, espessura * pixel, espessura * pixel);
    if (ax === bx && ay === by) break;
    const e2 = 2 * erro;
    if (e2 >= dy) { erro += dy; ax += sx; }
    if (e2 <= dx) { erro += dx; ay += sy; }
  }
}

/** Gerador pseudoaleatório com semente (o cenário sai igual a cada carga). */
export function aleatorioComSemente(semente: number): () => number {
  let s = semente >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
