import type { Sons } from '../audio/sfx';
import { CORES, Efeitos } from '../render/Effects';
import type { Configuracoes } from '../ui/storage';
import { WordBank, inicial } from '../words/WordBank';
import { CHAO_Y, DURACAO_INTRO, LARGURA, ONDAS_POR_VIDA_EXTRA, TOPO_SPAWN, VIDAS_MAX } from './constantes';
import { avancarProjetil, criarProjetil, type Projetil } from './Projectile';
import { Placar } from './Scoring';
import { letraDoEvento, processarTecla } from './Targeting';
import { configDaOnda, intervaloEntreGrupos, tempoDeQueda, type ConfigOnda } from './WaveDirector';
import { Mago, type Ponto } from './Wizard';
import { centroDaLetra, type MedidaTexto, type Palavra } from './Word';

export type EstadoJogo = 'carregando' | 'menu' | 'intro' | 'jogando' | 'pausado' | 'fim';

export interface ResumoPartida {
  pontos: number;
  onda: number;
  wpm: number;
  precisao: number;
  maiorCombo: number;
  palavras: number;
  letrasMaisErradas: Array<{ letra: string; erros: number }>;
}

export interface EventosJogo {
  aoMudarEstado(estado: EstadoJogo): void;
  aoFimDeJogo(resumo: ResumoPartida): void;
}

const MARGEM = 12;
const MAX_PALAVRAS_NA_TELA = 12;
const ESPERA_FIM = 1.4;

export class Jogo {
  estado: EstadoJogo = 'carregando';
  palavras: Palavra[] = [];
  projeteis: Projetil[] = [];
  readonly mago = new Mago();
  readonly efeitos = new Efeitos();
  placar = new Placar();
  vidas = VIDAS_MAX;
  onda = 0;
  config: ConfigOnda = configDaOnda(1);
  alvoId: number | null = null;
  tempoIntro = 0;

  private restantes = 0;
  private proximoGrupo = 0;
  private danoNaOnda = false;
  private proximoId = 1;
  private estadoAntesDaPausa: EstadoJogo = 'jogando';
  private esperaFim = 0;
  private demoTecla = 0;
  private demoSoltar = 0;

  constructor(
    private readonly banco: WordBank,
    private readonly medir: (texto: string) => MedidaTexto,
    private readonly sons: Sons,
    public opcoes: Configuracoes,
    private readonly eventos: EventosJogo,
  ) {}

  // ── Fluxo ──────────────────────────────────────────────────────────

  irParaMenu(): void {
    this.limparTela();
    this.mudarEstado('menu');
  }

  novaPartida(): void {
    this.sons.desbloquear();
    this.limparTela();
    this.placar = new Placar();
    this.vidas = VIDAS_MAX;
    this.iniciarOnda(Math.max(1, this.opcoes.ondaInicial));
  }

  pausar(): void {
    if (this.estado !== 'jogando' && this.estado !== 'intro') return;
    this.estadoAntesDaPausa = this.estado;
    this.mudarEstado('pausado');
  }

  continuar(): void {
    if (this.estado !== 'pausado') return;
    this.mudarEstado(this.estadoAntesDaPausa);
  }

  /** Trata uma tecla; devolve true se ela foi consumida pelo jogo. */
  teclado(e: KeyboardEvent): boolean {
    if (this.estado === 'pausado') {
      if (e.key === 'Escape') {
        this.continuar();
        return true;
      }
      return false;
    }
    if (this.estado !== 'jogando' && this.estado !== 'intro') return false;

    if (e.key === 'Escape') {
      this.pausar();
      return true;
    }
    if (e.key === 'Backspace') {
      this.alvoId = null;
      return true;
    }
    if (e.key === ' ' || e.key === 'Enter') return true;
    const letra = letraDoEvento(e);
    if (!letra) return false;
    if (this.estado === 'jogando') this.processarLetra(letra, false);
    return true;
  }

  resumo(): ResumoPartida {
    return {
      pontos: this.placar.pontos,
      onda: this.onda,
      wpm: this.placar.wpm(),
      precisao: this.placar.precisao(),
      maiorCombo: this.placar.maiorCombo,
      palavras: this.placar.palavras,
      letrasMaisErradas: this.placar.letrasMaisErradas(5),
    };
  }

  // ── Atualização ────────────────────────────────────────────────────

  atualizar(dt: number): void {
    if (this.estado === 'pausado' || this.estado === 'carregando') return;

    if (this.estado === 'intro') {
      this.tempoIntro -= dt;
      if (this.tempoIntro <= 0) this.mudarEstado('jogando');
    }

    if (this.estado === 'jogando') {
      this.placar.avancarTempo(dt);
      this.soltarGruposDaOnda(dt);
    } else if (this.estado === 'menu') {
      this.atualizarDemo(dt);
    } else if (this.estado === 'fim' && this.esperaFim > 0) {
      this.esperaFim -= dt;
      if (this.esperaFim <= 0) this.eventos.aoFimDeJogo(this.resumo());
    }

    this.moverPalavras(dt);
    this.moverProjeteis(dt);
    this.atualizarMago(dt);
    this.efeitos.atualizar(dt);

    if (
      this.estado === 'jogando' && this.restantes === 0 &&
      this.palavras.length === 0 && this.projeteis.length === 0
    ) {
      this.fimDaOnda();
    }
  }

  private mudarEstado(estado: EstadoJogo): void {
    this.estado = estado;
    this.eventos.aoMudarEstado(estado);
  }

  private limparTela(): void {
    this.palavras = [];
    this.projeteis = [];
    this.alvoId = null;
    this.efeitos.limpar();
  }

  private iniciarOnda(onda: number): void {
    this.onda = onda;
    this.config = configDaOnda(onda);
    this.restantes = this.config.totalPalavras;
    this.proximoGrupo = 0.4;
    this.danoNaOnda = false;
    this.tempoIntro = DURACAO_INTRO;
    if (onda > 1 && (onda - 1) % ONDAS_POR_VIDA_EXTRA === 0 && this.vidas < VIDAS_MAX) {
      this.vidas++;
      this.efeitos.texto(LARGURA / 2, 190, '+1 VIDA', '#ff5d8f', true);
      this.sons.tocar('vida');
    } else {
      this.sons.tocar('onda');
    }
    this.mudarEstado('intro');
  }

  private fimDaOnda(): void {
    const bonus = this.placar.registrarFimDeOnda(this.onda, !this.danoNaOnda);
    if (bonus > 0) this.efeitos.texto(LARGURA / 2, 170, `ONDA PERFEITA +${bonus}`, '#ffd166', true);
    this.iniciarOnda(this.onda + 1);
  }

  private fimDeJogo(): void {
    for (const p of this.palavras) this.efeitos.explosao(p.x, p.y - 6, CORES.dano, 16, 120);
    this.palavras = [];
    this.projeteis = [];
    this.alvoId = null;
    this.esperaFim = ESPERA_FIM;
    this.sons.tocar('fim');
    this.mudarEstado('fim');
  }

  private soltarGruposDaOnda(dt: number): void {
    if (this.restantes <= 0) return;
    const caindo = this.palavras.filter((p) => p.estado === 'caindo').length;
    if (caindo === 0) this.proximoGrupo = Math.min(this.proximoGrupo, 0.35);
    this.proximoGrupo -= dt;
    if (this.proximoGrupo > 0 || caindo >= MAX_PALAVRAS_NA_TELA) return;

    const cfg = this.config;
    const tamanhoGrupo = Math.min(
      this.restantes,
      cfg.grupoMin + Math.floor(Math.random() * (cfg.grupoMax - cfg.grupoMin + 1)),
    );
    const letras = this.soltarGrupo(tamanhoGrupo, cfg);
    this.restantes -= tamanhoGrupo;
    this.proximoGrupo = intervaloEntreGrupos(cfg, letras, tamanhoGrupo);
  }

  /** Cria um grupo de palavras espalhadas em faixas; devolve o total de letras. */
  private soltarGrupo(quantidade: number, cfg: ConfigOnda, velocidadeFixa?: number): number {
    const iniciais = new Set(this.palavras.filter((p) => p.ativa).map((p) => inicial(p.texto)));
    const sorteadas = Array.from({ length: quantidade }, () => {
      const s = this.banco.sortear({ pctMin: cfg.pctMin, pctMax: cfg.pctMax, tamanhoMax: cfg.tamanhoMax, iniciaisEmUso: iniciais });
      iniciais.add(inicial(s.texto));
      return s;
    });
    const letras = sorteadas.reduce((soma, s) => soma + [...s.texto].length, 0);
    const queda = tempoDeQueda(cfg, letras, quantidade);

    const faixa = (LARGURA - 2 * MARGEM) / quantidade;
    const ordem = sorteadas.map((_, i) => i).sort(() => Math.random() - 0.5);
    sorteadas.forEach((s, i) => {
      const medida = this.medir(s.texto);
      const meia = medida.largura / 2;
      const ini = MARGEM + ordem[i] * faixa + meia;
      const fim = MARGEM + (ordem[i] + 1) * faixa - meia;
      const x = fim > ini ? ini + Math.random() * (fim - ini) : MARGEM + (ordem[i] + 0.5) * faixa;
      const y = TOPO_SPAWN - Math.random() * 28;
      const velocidade = velocidadeFixa ?? ((CHAO_Y - y) / queda) * (0.92 + Math.random() * 0.16);
      this.palavras.push({
        id: this.proximoId++,
        texto: s.texto,
        letras: [...s.texto],
        dificuldade: s.dificuldade,
        x: Math.min(LARGURA - MARGEM - meia, Math.max(MARGEM + meia, x)),
        y,
        velocidade,
        ...medida,
        digitadas: 0,
        atingidas: 0,
        ativa: true,
        estado: 'caindo',
        pontos: 0,
      });
    });
    return letras;
  }

  private processarLetra(letra: string, demo: boolean): void {
    const r = processarTecla(letra, this.palavras, this.alvoId, { ignorarAcentos: this.opcoes.ignorarAcentos });
    const ponta = this.mago.pontaDaVarinha();

    if (r.tipo === 'erro') {
      if (!demo) this.placar.registrarErro(r.esperado);
      this.mago.falhar();
      this.efeitos.explosao(ponta.x, ponta.y, CORES.falha, 6, 40, 60);
      if (!demo) this.sons.tocar('erro');
      return;
    }

    const p = this.palavras.find((x) => x.id === r.palavraId)!;
    p.digitadas++;
    this.alvoId = p.id;
    if (!demo) {
      const antes = this.placar.multiplicador();
      this.placar.registrarAcerto();
      const depois = this.placar.multiplicador();
      if (depois > antes) this.efeitos.texto(LARGURA / 2, 120, `COMBO x${depois}!`, '#7fdcff', true);
      this.sons.tocar('magia', r.indice);
    }
    this.projeteis.push(criarProjetil(p.letras[r.indice], p.id, r.indice, ponta.x, ponta.y));
    this.mago.conjurar();
    this.efeitos.explosao(ponta.x, ponta.y, CORES.magia, 4, 40, 0);

    if (r.completou) {
      p.estado = 'completa';
      p.ativa = false;
      this.alvoId = null;
      p.pontos = demo ? 0 : this.placar.registrarPalavra(p.letras.length, p.dificuldade);
    }
  }

  private moverPalavras(dt: number): void {
    for (const p of [...this.palavras]) {
      if (p.estado === 'completa') {
        p.velocidade = Math.max(0, p.velocidade - 240 * dt);
      }
      p.y += p.velocidade * dt;
      if (p.estado === 'caindo' && p.y >= CHAO_Y - 2) this.impacto(p);
    }
  }

  private impacto(p: Palavra): void {
    this.palavras = this.palavras.filter((x) => x !== p);
    this.projeteis = this.projeteis.filter((x) => x.palavraId !== p.id);
    if (this.alvoId === p.id) this.alvoId = null;
    this.efeitos.explosao(p.x, CHAO_Y - 2, CORES.dano, 40, 150, 260);
    if (this.estado !== 'jogando') return;

    this.efeitos.tremer(4, 0.35);
    this.efeitos.flash = 1;
    this.placar.combo = 0;
    this.danoNaOnda = true;
    this.vidas--;
    this.sons.tocar('dano');
    if (this.vidas <= 0) this.fimDeJogo();
  }

  private moverProjeteis(dt: number): void {
    const chegaram: Projetil[] = [];
    this.projeteis = this.projeteis.filter((pr) => {
      const p = this.palavras.find((x) => x.id === pr.palavraId);
      if (!p) return false;
      const alvo = centroDaLetra(p, pr.indice);
      if (Math.random() < 0.6) this.efeitos.rastroDeMagia(pr.x, pr.y);
      if (avancarProjetil(pr, dt, alvo.x, alvo.y)) {
        chegaram.push(pr);
        return false;
      }
      return true;
    });

    for (const pr of chegaram) {
      const p = this.palavras.find((x) => x.id === pr.palavraId);
      if (!p) continue;
      p.atingidas++;
      const c = centroDaLetra(p, pr.indice);
      this.efeitos.explosao(c.x, c.y, CORES.magia, 5, 50, 0);
      if (this.estado === 'jogando') this.sons.tocar('acerto');
      if (p.estado === 'completa' && p.atingidas >= p.letras.length) this.estourar(p);
    }
  }

  private estourar(p: Palavra): void {
    this.palavras = this.palavras.filter((x) => x !== p);
    const posicoes = p.letras.map((_, i) => centroDaLetra(p, i));
    this.efeitos.estilhacarPalavra(p.letras, posicoes);
    this.efeitos.explosao(p.x, p.y - 6, CORES.estouro, 24 + p.letras.length * 4, 170);
    if (p.pontos > 0) this.efeitos.texto(p.x, p.y - 16, `+${p.pontos}`, '#ffd166');
    if (this.estado === 'jogando') this.sons.tocar('estouro');
  }

  private atualizarMago(dt: number): void {
    const alvo = this.alvoId === null ? undefined : this.palavras.find((p) => p.id === this.alvoId);
    let foco: Ponto | null = null;
    if (alvo) {
      foco = centroDaLetra(alvo, alvo.digitadas);
    } else {
      const perigo = this.palavras
        .filter((p) => p.estado === 'caindo' && p.y > 0)
        .reduce<Palavra | undefined>((a, b) => (!a || b.y > a.y ? b : a), undefined);
      if (perigo) foco = { x: perigo.x, y: perigo.y - 6 };
    }
    this.mago.atualizar(dt, foco, !!alvo);
  }

  // ── Demonstração no menu: o mago digita sozinho palavras fáceis ─────

  private atualizarDemo(dt: number): void {
    this.demoSoltar -= dt;
    if (this.demoSoltar <= 0 && this.palavras.length < 2) {
      this.soltarGrupo(1, { ...configDaOnda(1), pctMax: 0.3, tamanhoMax: 7 }, 28);
      this.demoSoltar = 2.6;
    }
    this.demoTecla -= dt;
    if (this.demoTecla > 0) return;
    this.demoTecla = 0.14 + Math.random() * 0.12;
    const alvo =
      this.palavras.find((p) => p.id === this.alvoId && p.ativa) ??
      this.palavras.find((p) => p.ativa && p.y > 70);
    if (alvo) this.processarLetra(alvo.letras[alvo.digitadas], true);
  }
}
