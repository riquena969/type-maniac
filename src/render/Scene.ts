// Cenário noturno gerado por código, em pixels de arte (320×180), ampliado na hora de desenhar.
import { ALTURA, CHAO_Y, LARGURA } from '../game/constantes';
import { PIXEL, aleatorioComSemente } from './pixelart';

const W = LARGURA / PIXEL;
const H = ALTURA / PIXEL;
const CHAO = CHAO_Y / PIXEL;

export interface Estrela {
  x: number;
  y: number;
  brilho: number;
  fase: number;
  velocidade: number;
}

function novoCanvas(): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  return [canvas, canvas.getContext('2d')!];
}

function px(ctx: CanvasRenderingContext2D, x: number, y: number, cor: string, w = 1, h = 1) {
  ctx.fillStyle = cor;
  ctx.fillRect(x, y, w, h);
}

/** Céu em faixas com pontilhado (dither) entre elas. */
export function gerarCeu(): HTMLCanvasElement {
  const [canvas, ctx] = novoCanvas();
  const faixas = ['#090616', '#0d0a24', '#130e33', '#1b1342', '#251852', '#311d5e', '#3e2467'];
  const altura = Math.ceil(CHAO / faixas.length);
  faixas.forEach((cor, i) => {
    const y0 = i * altura;
    px(ctx, 0, y0, cor, W, altura);
    const proxima = faixas[i + 1];
    if (!proxima) return;
    for (let x = 0; x < W; x++) {
      if (x % 2 === 0) px(ctx, x, y0 + altura - 1, proxima);
      if (x % 4 === 1) px(ctx, x, y0 + altura - 2, proxima);
    }
  });
  return canvas;
}

export function gerarEstrelas(quantidade = 90): Estrela[] {
  const rnd = aleatorioComSemente(7);
  return Array.from({ length: quantidade }, () => ({
    x: Math.floor(rnd() * W),
    y: Math.floor(rnd() * (CHAO - 50)),
    brilho: 0.4 + rnd() * 0.6,
    fase: rnd() * Math.PI * 2,
    velocidade: 0.6 + rnd() * 2,
  }));
}

function relevo(rnd: () => number, base: number, amplitude: number): (x: number) => number {
  const ondas = Array.from({ length: 3 }, (_, i) => ({
    freq: (0.012 + rnd() * 0.02) * (i + 1),
    fase: rnd() * Math.PI * 2,
    amp: amplitude / (i + 1),
  }));
  return (x) => Math.round(base - ondas.reduce((s, o) => s + Math.sin(x * o.freq + o.fase) * o.amp, 0));
}

function lua(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number) {
  for (let y = -r - 3; y <= r + 3; y++) {
    for (let x = -r - 3; x <= r + 3; x++) {
      const d = Math.hypot(x, y);
      if (d <= r) px(ctx, cx + x, cy + y, '#f5efd2');
      else if (d <= r + 1.5 && (x + y) % 2 === 0) px(ctx, cx + x, cy + y, '#5b4a86');
    }
  }
  for (const [x, y, rc] of [[-4, -3, 3], [5, 2, 2], [-2, 6, 2], [3, -7, 1]] as const) {
    for (let yy = -rc; yy <= rc; yy++) {
      for (let xx = -rc; xx <= rc; xx++) {
        if (Math.hypot(xx, yy) <= rc) px(ctx, cx + x + xx, cy + y + yy, '#ddd3b0');
      }
    }
  }
}

function castelo(ctx: CanvasRenderingContext2D, base: number, x0: number) {
  const cor = '#0f0a22';
  const janela = '#ffd166';
  const torres = [
    { x: 0, w: 8, h: 34 },
    { x: 8, w: 22, h: 22 },
    { x: 14, w: 9, h: 42 },
    { x: 30, w: 8, h: 30 },
  ];
  for (const t of torres) {
    const topo = base - t.h;
    px(ctx, x0 + t.x, topo, cor, t.w, t.h + 6);
    for (let x = 0; x < t.w; x += 2) px(ctx, x0 + t.x + x, topo - 2, cor, 1, 2);
  }
  // Telhado cônico da torre central.
  for (let i = 0; i < 7; i++) px(ctx, x0 + 14 + i, base - 42 - (7 - Math.abs(3 - i) * 2), cor, 1, 7 - Math.abs(3 - i) * 2);
  px(ctx, x0 + 18, base - 52, '#e8384f', 2, 1);
  for (const [x, y] of [[3, 24], [17, 30], [19, 30], [18, 20], [33, 20], [11, 14], [24, 14]]) {
    px(ctx, x0 + x, base - y, janela, 1, 2);
  }
}

function pinheiro(ctx: CanvasRenderingContext2D, x: number, base: number, altura: number, cor: string) {
  for (let i = 0; i < altura; i++) {
    const meia = Math.floor((i / altura) * (altura / 3)) ;
    px(ctx, x - meia, base - altura + i, cor, meia * 2 + 1, 1);
  }
  px(ctx, x, base, cor, 1, 2);
}

/** Lua, morros, castelo e chão (transparente onde é céu). */
export function gerarCenario(): HTMLCanvasElement {
  const [canvas, ctx] = novoCanvas();
  const rnd = aleatorioComSemente(42);

  lua(ctx, 262, 34, 13);

  const longe = relevo(rnd, CHAO - 22, 10);
  for (let x = 0; x < W; x++) px(ctx, x, longe(x), '#21173f', 1, CHAO - longe(x));
  castelo(ctx, longe(60) + 2, 44);

  const perto = relevo(rnd, CHAO - 8, 6);
  for (let x = 0; x < W; x++) px(ctx, x, perto(x), '#171030', 1, CHAO - perto(x));
  for (let x = 8; x < W; x += 14 + Math.floor(rnd() * 22)) {
    pinheiro(ctx, x, perto(x) + 2, 8 + Math.floor(rnd() * 8), '#120c26');
  }

  // Chão: grama no topo, terra com pedrinhas embaixo.
  px(ctx, 0, CHAO, '#3f7d3a', W, 2);
  px(ctx, 0, CHAO + 2, '#2d5a2c', W, 1);
  px(ctx, 0, CHAO + 3, '#3a2a22', W, H - CHAO - 3);
  for (let x = 0; x < W; x++) {
    if (rnd() < 0.35) px(ctx, x, CHAO - 1, '#5fa84f');
    if (rnd() < 0.08) px(ctx, x, CHAO - 2, '#5fa84f');
  }
  for (let i = 0; i < 70; i++) {
    const x = Math.floor(rnd() * W);
    const y = CHAO + 5 + Math.floor(rnd() * (H - CHAO - 6));
    px(ctx, x, y, rnd() < 0.5 ? '#5a4636' : '#2a1d17', 1 + Math.floor(rnd() * 2), 1);
  }
  return canvas;
}
