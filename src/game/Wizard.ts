import { CHAO_Y, LARGURA } from './constantes';
import { ALTURA_MAGO, LARGURA_MAGO, OMBRO_MAGO, PIXEL_MAGO, type QuadroMago } from '../render/sprites';

const LIMITE_ESQ = 36;
const LIMITE_DIR = LARGURA - 36;
const VEL_PATRULHA = 32;
const VEL_PERSEGUICAO = 95;
const DISTANCIA_DO_ALVO = 56;
const BRACO = 12;
const VARINHA = 24;
const CICLO_PASSOS: QuadroMago[] = ['passoA', 'parado', 'passoB', 'parado'];

export interface Ponto {
  x: number;
  y: number;
}

function diferencaAngular(de: number, para: number): number {
  return Math.atan2(Math.sin(para - de), Math.cos(para - de));
}

export class Mago {
  x = LARGURA / 2;
  virado: 1 | -1 = 1;
  /** Ângulo do braço em radianos (0 = direita, negativo = para cima). */
  angulo = -Math.PI / 4;
  andando = false;
  /** Timers de animação (s) para o brilho de conjurar e a "falha" da varinha. */
  conjurando = 0;
  falhando = 0;
  private direcaoPatrulha: 1 | -1 = 1;
  private tempo = 0;

  /**
   * `foco` é para onde o mago olha (a letra a acertar ou a palavra mais perigosa).
   * Com `perseguir`, ele anda até ficar perto do alvo; sem, patrulha de borda a borda.
   */
  atualizar(dt: number, foco: Ponto | null, perseguir: boolean): void {
    this.tempo += dt;
    this.conjurando = Math.max(0, this.conjurando - dt);
    this.falhando = Math.max(0, this.falhando - dt);

    let vx = 0;
    if (foco && perseguir) {
      const lado = this.x <= foco.x ? -1 : 1;
      const destino = Math.min(LIMITE_DIR, Math.max(LIMITE_ESQ, foco.x + lado * DISTANCIA_DO_ALVO));
      const dx = destino - this.x;
      if (Math.abs(dx) > 3) vx = Math.sign(dx) * Math.min(VEL_PERSEGUICAO, Math.abs(dx) * 4);
    } else {
      if (this.x <= LIMITE_ESQ) this.direcaoPatrulha = 1;
      if (this.x >= LIMITE_DIR) this.direcaoPatrulha = -1;
      vx = this.direcaoPatrulha * VEL_PATRULHA;
    }
    this.x = Math.min(LIMITE_DIR, Math.max(LIMITE_ESQ, this.x + vx * dt));
    this.andando = Math.abs(vx) > 1;

    if (foco) {
      if (foco.x > this.x + 4) this.virado = 1;
      else if (foco.x < this.x - 4) this.virado = -1;
    } else if (vx !== 0) {
      this.virado = vx > 0 ? 1 : -1;
    }

    const ombro = this.ombro();
    let desejado: number;
    if (foco) {
      desejado = Math.atan2(foco.y - ombro.y, foco.x - ombro.x);
      // Nunca aponta para o chão.
      if (desejado > 0.25 && desejado < Math.PI - 0.25) desejado = this.virado === 1 ? 0.25 : Math.PI - 0.25;
    } else {
      desejado = (this.virado === 1 ? -Math.PI / 4 : (-3 * Math.PI) / 4) + Math.sin(this.tempo * 2) * 0.08;
    }
    this.angulo += diferencaAngular(this.angulo, desejado) * Math.min(1, dt * 14);
  }

  conjurar(): void {
    this.conjurando = 0.12;
  }

  falhar(): void {
    this.falhando = 0.25;
  }

  quadro(): { nome: QuadroMago; indice: number } {
    if (!this.andando) return { nome: 'parado', indice: 0 };
    const nome = CICLO_PASSOS[Math.floor(this.tempo / 0.14) % CICLO_PASSOS.length];
    return { nome, indice: nome === 'parado' ? 0 : nome === 'passoA' ? 1 : 2 };
  }

  /** Canto superior esquerdo do sprite, em coordenadas lógicas. */
  posicaoSprite(): Ponto {
    const quadro = this.quadro().nome;
    const balanco = this.andando
      ? (quadro === 'parado' ? 0 : -PIXEL_MAGO)
      : Math.sin(this.tempo * 2.4) > 0.6 ? -PIXEL_MAGO : 0;
    return {
      x: Math.round(this.x - (LARGURA_MAGO * PIXEL_MAGO) / 2),
      y: CHAO_Y - ALTURA_MAGO * PIXEL_MAGO + balanco + PIXEL_MAGO,
    };
  }

  ombro(): Ponto {
    const s = this.posicaoSprite();
    const colunaOmbro = this.virado === 1 ? OMBRO_MAGO.x : LARGURA_MAGO - 1 - OMBRO_MAGO.x;
    return { x: s.x + colunaOmbro * PIXEL_MAGO, y: s.y + OMBRO_MAGO.y * PIXEL_MAGO };
  }

  mao(): Ponto {
    const o = this.ombro();
    const recuo = this.conjurando > 0 ? 3 : 0;
    return { x: o.x + Math.cos(this.angulo) * (BRACO - recuo), y: o.y + Math.sin(this.angulo) * (BRACO - recuo) };
  }

  pontaDaVarinha(): Ponto {
    const m = this.mao();
    return { x: m.x + Math.cos(this.angulo) * VARINHA, y: m.y + Math.sin(this.angulo) * VARINHA };
  }
}
