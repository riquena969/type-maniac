import type { Jogo } from '../game/Game';
import { ALTURA, CHAO_Y, DURACAO_INTRO, FONTE_HUD, FONTE_PALAVRA, FONTE_TITULO, LARGURA, VIDAS_MAX } from '../game/constantes';
import type { Mago } from '../game/Wizard';
import type { MedidaTexto, Palavra } from '../game/Word';
import type { Efeitos } from './Effects';
import { PIXEL, desenharSprite, linhaDePixels } from './pixelart';
import { gerarCenario, gerarCeu, gerarEstrelas, type Estrela } from './Scene';
import { CORES_BRACO, PIXEL_MAGO, criarCoracoes, criarQuadrosMago, type QuadrosMago } from './sprites';

const COR = {
  tinta: '#f2efe8',
  apagada: '#a99fd0',
  ouro: '#ffd166',
  ciano: '#7fdcff',
  sombra: '#140c24',
  perigo: '#ff5d5d',
};

export class Renderer {
  private readonly ctx: CanvasRenderingContext2D;
  private escala = 1;
  private readonly ceu = gerarCeu();
  private readonly cenario = gerarCenario();
  private readonly estrelas: Estrela[] = gerarEstrelas();
  private readonly quadrosMago: QuadrosMago = criarQuadrosMago();
  private readonly coracoes = criarCoracoes();

  constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly palco: HTMLElement,
  ) {
    this.ctx = canvas.getContext('2d')!;
    this.ajustar();
    window.addEventListener('resize', () => this.ajustar());
  }

  /** Ocupa o máximo da janela mantendo 16:9; o canvas usa a resolução real da tela. */
  ajustar(): void {
    const dpr = window.devicePixelRatio || 1;
    const css = Math.min(window.innerWidth / LARGURA, window.innerHeight / ALTURA);
    this.escala = css * dpr;
    this.canvas.width = Math.round(LARGURA * this.escala);
    this.canvas.height = Math.round(ALTURA * this.escala);
    this.palco.style.width = `${LARGURA * css}px`;
    this.palco.style.height = `${ALTURA * css}px`;
    this.palco.style.setProperty('--u', `${css}px`);
  }

  medir(texto: string): MedidaTexto {
    const ctx = this.ctx;
    ctx.font = FONTE_PALAVRA;
    const letras = [...texto];
    const deslocamentos: number[] = [];
    const larguras: number[] = [];
    let acumulado = '';
    for (const letra of letras) {
      deslocamentos.push(ctx.measureText(acumulado).width);
      larguras.push(ctx.measureText(letra).width);
      acumulado += letra;
    }
    return { deslocamentos, larguras, largura: ctx.measureText(texto).width };
  }

  desenhar(jogo: Jogo, tempo: number): void {
    const ctx = this.ctx;
    ctx.setTransform(this.escala, 0, 0, this.escala, 0, 0);
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = COR.sombra;
    ctx.fillRect(0, 0, LARGURA, ALTURA);

    const tremor = jogo.efeitos.deslocamentoDoTremor();
    ctx.save();
    ctx.translate(tremor.x, tremor.y);
    ctx.drawImage(this.ceu, 0, 0, LARGURA, ALTURA);
    this.desenharEstrelas(tempo);
    ctx.drawImage(this.cenario, 0, 0, LARGURA, ALTURA);
    for (const p of jogo.palavras) this.desenharPalavra(p, p.id === jogo.alvoId);
    this.desenharProjeteis(jogo);
    this.desenharMago(jogo.mago);
    this.desenharEfeitos(jogo.efeitos);
    ctx.restore();

    if (jogo.efeitos.flash > 0) {
      ctx.fillStyle = `rgba(255, 60, 60, ${jogo.efeitos.flash * 0.22})`;
      ctx.fillRect(0, 0, LARGURA, ALTURA);
    }
    if (jogo.estado !== 'menu' && jogo.estado !== 'carregando') this.desenharHud(jogo);
    if (jogo.estado === 'intro') this.desenharLetreiroDaOnda(jogo);
  }

  // ── Cena ───────────────────────────────────────────────────────────

  private desenharEstrelas(tempo: number): void {
    const ctx = this.ctx;
    for (const e of this.estrelas) {
      const alfa = e.brilho * (0.55 + 0.45 * Math.sin(tempo * e.velocidade + e.fase));
      ctx.fillStyle = `rgba(255, 250, 225, ${alfa.toFixed(2)})`;
      ctx.fillRect(e.x * PIXEL, e.y * PIXEL, PIXEL, PIXEL);
    }
  }

  private desenharPalavra(p: Palavra, alvo: boolean): void {
    const ctx = this.ctx;
    const esquerda = Math.round(p.x - p.largura / 2);
    const y = Math.round(p.y);
    const perigo = p.estado === 'caindo' ? Math.min(1, Math.max(0, (p.y - CHAO_Y * 0.55) / (CHAO_Y * 0.4))) : 0;

    ctx.fillStyle = alvo ? 'rgba(20, 12, 36, 0.88)' : 'rgba(20, 12, 36, 0.6)';
    ctx.fillRect(esquerda - 4, y - 14, Math.ceil(p.largura) + 8, 19);
    if (alvo) {
      this.moldura(esquerda - 4, y - 14, Math.ceil(p.largura) + 8, 19, COR.ouro);
    } else if (perigo > 0) {
      this.moldura(esquerda - 4, y - 14, Math.ceil(p.largura) + 8, 19, `rgba(255, 93, 93, ${perigo.toFixed(2)})`);
    }

    ctx.font = FONTE_PALAVRA;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    p.letras.forEach((letra, i) => {
      const x = Math.round(esquerda + p.deslocamentos[i]);
      ctx.fillStyle = COR.sombra;
      ctx.fillText(letra, x + 1, y + 1);
      ctx.fillStyle =
        i < p.atingidas ? COR.ouro
        : i < p.digitadas ? COR.ciano
        : alvo ? '#ffffff'
        : COR.tinta;
      ctx.fillText(letra, x, y);
    });
  }

  private moldura(x: number, y: number, w: number, h: number, cor: string): void {
    const ctx = this.ctx;
    ctx.fillStyle = cor;
    ctx.fillRect(x, y, w, 1);
    ctx.fillRect(x, y + h - 1, w, 1);
    ctx.fillRect(x, y, 1, h);
    ctx.fillRect(x + w - 1, y, 1, h);
    // Cantos em "runa".
    ctx.fillRect(x - 1, y - 1, 3, 3);
    ctx.fillRect(x + w - 2, y - 1, 3, 3);
    ctx.fillRect(x - 1, y + h - 2, 3, 3);
    ctx.fillRect(x + w - 2, y + h - 2, 3, 3);
  }

  private desenharProjeteis(jogo: Jogo): void {
    const ctx = this.ctx;
    ctx.font = FONTE_PALAVRA;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (const pr of jogo.projeteis) {
      pr.rastro.forEach((r, i) => {
        const alfa = (i + 1) / (pr.rastro.length + 1);
        ctx.fillStyle = i % 2 ? `rgba(178, 141, 255, ${alfa})` : `rgba(127, 220, 255, ${alfa})`;
        ctx.fillRect(Math.round(r.x) - 1, Math.round(r.y) - 1, PIXEL, PIXEL);
      });
      ctx.save();
      ctx.shadowColor = COR.ciano;
      ctx.shadowBlur = 8;
      ctx.fillStyle = '#e8fbff';
      ctx.fillText(pr.letra, Math.round(pr.x), Math.round(pr.y));
      ctx.restore();
    }
  }

  private desenharMago(mago: Mago): void {
    const ctx = this.ctx;
    const { indice } = mago.quadro();
    const sprite = (mago.virado === 1 ? this.quadrosMago.direita : this.quadrosMago.esquerda)[indice];
    const pos = mago.posicaoSprite();

    // Sombra no chão.
    const P = PIXEL_MAGO;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
    ctx.fillRect(Math.round(mago.x) - 20, CHAO_Y, 40, PIXEL);

    desenharSprite(ctx, sprite, pos.x, pos.y, P);

    const ombro = mago.ombro();
    const mao = mago.mao();
    const ponta = mago.pontaDaVarinha();
    linhaDePixels(ctx, ombro.x, ombro.y, mao.x, mao.y, '#140c24', 3, P);
    linhaDePixels(ctx, ombro.x, ombro.y, mao.x, mao.y, CORES_BRACO.mangaSombra, 2, P);
    linhaDePixels(ctx, mao.x, mao.y, ponta.x, ponta.y, CORES_BRACO.varinha, 1, P);
    ctx.fillStyle = CORES_BRACO.mao;
    ctx.fillRect(Math.round(mao.x / P) * P - 1, Math.round(mao.y / P) * P - 1, P + 2, P + 2);

    const falhando = mago.falhando > 0;
    const raio = 7 + mago.conjurando * 80;
    const brilho = ctx.createRadialGradient(ponta.x, ponta.y, 0, ponta.x, ponta.y, raio);
    brilho.addColorStop(0, falhando ? 'rgba(170, 160, 190, 0.7)' : 'rgba(255, 243, 176, 0.95)');
    brilho.addColorStop(1, 'rgba(255, 243, 176, 0)');
    ctx.fillStyle = brilho;
    ctx.fillRect(ponta.x - raio, ponta.y - raio, raio * 2, raio * 2);
    ctx.fillStyle = falhando ? '#a9a1bd' : CORES_BRACO.ponta;
    ctx.fillRect(Math.round(ponta.x / P) * P - 1, Math.round(ponta.y / P) * P - 1, P + 1, P + 1);
  }

  private desenharEfeitos(efeitos: Efeitos): void {
    const ctx = this.ctx;
    for (const p of efeitos.particulas) {
      ctx.globalAlpha = Math.max(0, p.vida / p.vidaMax);
      ctx.fillStyle = p.cor;
      ctx.fillRect(Math.round(p.x), Math.round(p.y), p.tamanho, p.tamanho);
    }
    ctx.font = FONTE_PALAVRA;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (const l of efeitos.letras) {
      ctx.globalAlpha = Math.max(0, Math.min(1, l.vida / 0.6));
      ctx.save();
      ctx.translate(l.x, l.y);
      ctx.rotate(l.angulo);
      ctx.fillStyle = l.cor;
      ctx.fillText(l.letra, 0, 0);
      ctx.restore();
    }
    for (const t of efeitos.textos) {
      ctx.globalAlpha = Math.max(0, Math.min(1, (t.vida / t.vidaMax) * 1.6));
      ctx.font = t.grande ? FONTE_TITULO : FONTE_HUD;
      ctx.fillStyle = COR.sombra;
      ctx.fillText(t.texto, Math.round(t.x) + 1, Math.round(t.y) + 1);
      ctx.fillStyle = t.cor;
      ctx.fillText(t.texto, Math.round(t.x), Math.round(t.y));
    }
    ctx.globalAlpha = 1;
  }

  // ── Interface sobre o jogo ─────────────────────────────────────────

  private texto(texto: string, x: number, y: number, fonte: string, cor: string, alinhamento: CanvasTextAlign = 'left'): void {
    const ctx = this.ctx;
    ctx.font = fonte;
    ctx.textAlign = alinhamento;
    ctx.textBaseline = 'top';
    ctx.fillStyle = COR.sombra;
    ctx.fillText(texto, x + 1, y + 1);
    ctx.fillStyle = cor;
    ctx.fillText(texto, x, y);
  }

  private desenharHud(jogo: Jogo): void {
    const placar = jogo.placar;
    this.texto(String(placar.pontos), 10, 10, FONTE_TITULO, COR.tinta);
    const mult = placar.multiplicador();
    if (placar.combo > 0) {
      this.texto(`COMBO ${placar.combo}`, 10, 32, FONTE_HUD, mult > 1 ? COR.ciano : COR.apagada);
      if (mult > 1) this.texto(`x${mult}`, 10 + (8 * (`COMBO ${placar.combo}`.length + 1)), 32, FONTE_HUD, COR.ouro);
    }

    this.texto(`ONDA ${jogo.onda}`, LARGURA / 2, 10, FONTE_HUD, COR.ouro, 'center');
    this.texto(`META ${Math.round(jogo.config.wpmAlvo)} PPM`, LARGURA / 2, 22, FONTE_HUD, COR.apagada, 'center');

    const passo = 18;
    for (let i = 0; i < VIDAS_MAX; i++) {
      const sprite = i < jogo.vidas ? this.coracoes.cheio : this.coracoes.vazio;
      desenharSprite(this.ctx, sprite, LARGURA - 10 - (VIDAS_MAX - i) * passo + 4, 10);
    }
    const precisao = Math.round(placar.precisao() * 100);
    this.texto(`${placar.wpm()} PPM  ${precisao}%`, LARGURA - 10, 30, FONTE_HUD, COR.apagada, 'right');
  }

  private desenharLetreiroDaOnda(jogo: Jogo): void {
    const ctx = this.ctx;
    const decorrido = DURACAO_INTRO - jogo.tempoIntro;
    const alfa = Math.min(1, decorrido * 4, jogo.tempoIntro * 3);
    ctx.globalAlpha = Math.max(0, alfa);
    ctx.fillStyle = 'rgba(13, 9, 32, 0.8)';
    ctx.fillRect(LARGURA / 2 - 150, 128, 300, 52);
    this.moldura(LARGURA / 2 - 150, 128, 300, 52, '#4b2f9e');
    this.texto(`ONDA ${jogo.onda}`, LARGURA / 2, 138, FONTE_TITULO, COR.ouro, 'center');
    const subtitulo = jogo.onda === 1
      ? 'DIGITE ANTES QUE TOQUEM O CHÃO'
      : `${jogo.config.totalPalavras} PALAVRAS · META ${Math.round(jogo.config.wpmAlvo)} PPM`;
    this.texto(subtitulo, LARGURA / 2, 162, FONTE_HUD, COR.tinta, 'center');
    ctx.globalAlpha = 1;
  }
}
