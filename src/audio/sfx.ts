// Efeitos sonoros e música sintetizados na hora (WebAudio), sem arquivos de áudio.
import { Trilha, type ModoMusica } from './music';

export type Som = 'magia' | 'acerto' | 'estouro' | 'erro' | 'dano' | 'onda' | 'vida' | 'fim';

export class Sons {
  /** Efeitos sonoros ligados. */
  ativo = true;
  private ctx: AudioContext | null = null;
  private mestre: GainNode | null = null;
  private ruidoBranco: AudioBuffer | null = null;
  private trilha: Trilha | null = null;
  private musicaLigada = true;
  /** O que deveria estar tocando agora (a trilha só começa depois do primeiro gesto do usuário). */
  private modoMusica: ModoMusica | null = null;
  private musicaPausada = false;

  /** Precisa ser chamado a partir de um gesto do usuário (clique ou tecla). */
  desbloquear(): void {
    try {
      if (!this.ctx) {
        this.ctx = new AudioContext();
        this.mestre = this.ctx.createGain();
        this.mestre.gain.value = 0.22;
        this.mestre.connect(this.ctx.destination);
        const n = this.ctx.sampleRate;
        this.ruidoBranco = this.ctx.createBuffer(1, n, n);
        const dados = this.ruidoBranco.getChannelData(0);
        for (let i = 0; i < n; i++) dados[i] = Math.random() * 2 - 1;
        this.trilha = new Trilha(this.ctx, this.mestre, this.ruidoBranco);
      }
      if (this.ctx.state === 'suspended') void this.ctx.resume();
      this.sincronizarMusica();
    } catch {
      this.ctx = null;
    }
  }

  definirMusica(ligada: boolean): void {
    this.musicaLigada = ligada;
    this.sincronizarMusica();
  }

  musica(modo: ModoMusica | null): void {
    this.modoMusica = modo;
    this.musicaPausada = false;
    this.sincronizarMusica();
  }

  pausarMusica(pausada: boolean): void {
    this.musicaPausada = pausada;
    this.sincronizarMusica();
  }

  ritmo(onda: number): void {
    this.trilha?.ritmo(onda);
  }

  private sincronizarMusica(): void {
    if (!this.trilha) return;
    if (this.musicaLigada && this.modoMusica && !this.musicaPausada) this.trilha.tocar(this.modoMusica);
    else this.trilha.parar();
  }

  tocar(som: Som, variacao = 0): void {
    if (!this.ativo || !this.ctx || this.ctx.state !== 'running') return;
    switch (som) {
      case 'magia': {
        const f = 520 + Math.min(variacao, 12) * 28;
        this.tom(f, 0.06, 'square', 0.1, 0, f * 1.6);
        break;
      }
      case 'acerto':
        this.ruido(0.03, 0.07, 0, 5000);
        break;
      case 'estouro':
        this.tom(660, 0.07, 'triangle', 0.25);
        this.tom(880, 0.07, 'triangle', 0.25, 0.05);
        this.tom(1320, 0.12, 'triangle', 0.25, 0.1);
        this.ruido(0.12, 0.12, 0, 3000);
        break;
      case 'erro':
        this.tom(150, 0.12, 'sawtooth', 0.14, 0, 90);
        break;
      case 'dano':
        this.ruido(0.35, 0.4, 0, 700);
        this.tom(220, 0.3, 'square', 0.18, 0, 55);
        break;
      case 'onda':
        this.tom(523, 0.1, 'square', 0.14);
        this.tom(659, 0.1, 'square', 0.14, 0.1);
        this.tom(784, 0.2, 'square', 0.14, 0.2);
        break;
      case 'vida':
        this.tom(784, 0.08, 'triangle', 0.25);
        this.tom(1047, 0.16, 'triangle', 0.25, 0.08);
        break;
      case 'fim':
        this.tom(392, 0.2, 'square', 0.15);
        this.tom(330, 0.2, 'square', 0.15, 0.2);
        this.tom(262, 0.45, 'square', 0.15, 0.4, 196);
        break;
    }
  }

  private tom(freq: number, duracao: number, tipo: OscillatorType, volume: number, atraso = 0, freqFinal?: number): void {
    const ctx = this.ctx!;
    const t0 = ctx.currentTime + atraso;
    const osc = ctx.createOscillator();
    const ganho = ctx.createGain();
    osc.type = tipo;
    osc.frequency.setValueAtTime(freq, t0);
    if (freqFinal) osc.frequency.exponentialRampToValueAtTime(freqFinal, t0 + duracao);
    ganho.gain.setValueAtTime(volume, t0);
    ganho.gain.exponentialRampToValueAtTime(0.001, t0 + duracao);
    osc.connect(ganho).connect(this.mestre!);
    osc.start(t0);
    osc.stop(t0 + duracao + 0.02);
  }

  private ruido(duracao: number, volume: number, atraso: number, corte: number): void {
    const ctx = this.ctx!;
    const t0 = ctx.currentTime + atraso;
    const fonte = ctx.createBufferSource();
    fonte.buffer = this.ruidoBranco;
    const filtro = ctx.createBiquadFilter();
    filtro.type = 'lowpass';
    filtro.frequency.value = corte;
    const ganho = ctx.createGain();
    ganho.gain.setValueAtTime(volume, t0);
    ganho.gain.exponentialRampToValueAtTime(0.001, t0 + duracao);
    fonte.connect(filtro).connect(ganho).connect(this.mestre!);
    fonte.start(t0);
    fonte.stop(t0 + duracao + 0.02);
  }
}
