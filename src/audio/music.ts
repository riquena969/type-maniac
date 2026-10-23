// Trilha chiptune gerada na hora: progressão em lá menor com baixo, arpejo, melodia e percussão.
// O andamento acompanha a onda; no menu toca uma versão mais calma, sem bateria.

export type ModoMusica = 'menu' | 'jogo';

const PASSOS_POR_COMPASSO = 16;
// Am · F · C · G · Am · F · G · E (o Mi maior puxa de volta para o lá menor).
const ACORDES = [
  { raiz: 45, terca: 3 }, { raiz: 41, terca: 4 }, { raiz: 48, terca: 4 }, { raiz: 43, terca: 4 },
  { raiz: 45, terca: 3 }, { raiz: 41, terca: 4 }, { raiz: 43, terca: 4 }, { raiz: 40, terca: 4 },
];
// Melodia em colcheias (8 por compasso); null = pausa.
const MELODIA: Array<Array<number | null>> = [
  [76, null, 81, null, 84, 83, 81, null],
  [81, null, 84, null, 79, 77, 76, null],
  [76, null, 79, null, 84, null, 83, null],
  [86, null, 83, null, 79, null, null, null],
  [81, null, 84, null, 88, 86, 84, null],
  [81, null, 84, null, 81, 79, 77, null],
  [79, null, 83, null, 86, null, 84, 83],
  [80, null, 83, null, 76, null, null, null],
];
const BAIXO_PASSOS: Record<number, number> = { 0: 0, 3: 0, 6: 12, 8: 0, 11: 7, 14: 12 };
const ARPEJO = [0, 1, 2, 3, 4, 5, 4, 3, 2, 1, 2, 3, 4, 5, 4, 3];
const TOTAL_PASSOS = PASSOS_POR_COMPASSO * ACORDES.length;

const frequencia = (midi: number) => 440 * 2 ** ((midi - 69) / 12);

export class Trilha {
  private saida: GainNode;
  private timer: ReturnType<typeof setInterval> | null = null;
  private proximoPasso = 0;
  private passo = 0;
  private volta = 0;
  private bpm = 100;
  private modo: ModoMusica = 'menu';

  constructor(
    private readonly ctx: AudioContext,
    destino: AudioNode,
    private readonly ruido: AudioBuffer,
  ) {
    this.saida = ctx.createGain();
    this.saida.gain.value = 0;
    this.saida.connect(destino);
  }

  get tocando(): boolean {
    return this.timer !== null;
  }

  tocar(modo: ModoMusica): void {
    const mudouModo = modo !== this.modo;
    this.modo = modo;
    if (modo === 'menu') this.bpm = 92;
    if (this.timer && !mudouModo) return;
    this.parar(0.05);
    this.passo = 0;
    this.volta = 0;
    this.proximoPasso = this.ctx.currentTime + 0.08;
    this.timer = setInterval(() => this.agendar(), 25);
    this.volume(0.45, 0.4);
  }

  parar(fade = 0.4): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    this.volume(0, fade);
  }

  /** A música acelera com a onda (100 → 150 BPM). */
  ritmo(onda: number): void {
    this.bpm = 100 + Math.min(20, Math.max(0, onda - 1)) * 2.5;
  }

  private volume(alvo: number, segundos: number): void {
    const agora = this.ctx.currentTime;
    this.saida.gain.cancelScheduledValues(agora);
    this.saida.gain.setValueAtTime(this.saida.gain.value, agora);
    this.saida.gain.linearRampToValueAtTime(alvo, agora + segundos);
  }

  private agendar(): void {
    const duracaoPasso = 60 / this.bpm / 4;
    while (this.proximoPasso < this.ctx.currentTime + 0.12) {
      this.tocarPasso(this.passo, this.proximoPasso, duracaoPasso);
      this.proximoPasso += duracaoPasso;
      this.passo = (this.passo + 1) % TOTAL_PASSOS;
      if (this.passo === 0) this.volta++;
    }
  }

  private tocarPasso(passo: number, t: number, duracao: number): void {
    const compasso = Math.floor(passo / PASSOS_POR_COMPASSO);
    const p = passo % PASSOS_POR_COMPASSO;
    const { raiz, terca } = ACORDES[compasso];
    const jogo = this.modo === 'jogo';

    const intervaloBaixo = BAIXO_PASSOS[p];
    if (intervaloBaixo !== undefined) this.nota(raiz + intervaloBaixo, t, duracao * 2.2, 'triangle', 0.5);

    if (jogo || p % 2 === 0) {
      const tons = [0, terca, 7, 12, 12 + terca, 19];
      this.nota(raiz + 12 + tons[ARPEJO[p]], t, duracao * 0.8, 'square', jogo ? 0.05 : 0.04);
    }

    // No jogo a melodia toca em voltas alternadas, para não cansar quem está digitando.
    const comMelodia = !jogo || this.volta % 2 === 0;
    if (comMelodia && p % 2 === 0) {
      const nota = MELODIA[compasso][p / 2];
      if (nota !== null) this.nota(nota - (jogo ? 12 : 0), t, duracao * 1.8, 'square', jogo ? 0.045 : 0.06);
    }

    if (jogo) {
      if (p === 0 || p === 8) this.bumbo(t);
      if (p === 4 || p === 12) this.chiado(t, 0.1, 0.16, 1800);
      if (p % 4 === 2) this.chiado(t, 0.03, 0.06, 7000);
    }
  }

  private nota(midi: number, t: number, duracao: number, tipo: OscillatorType, volume: number): void {
    const osc = this.ctx.createOscillator();
    const ganho = this.ctx.createGain();
    osc.type = tipo;
    osc.frequency.setValueAtTime(frequencia(midi), t);
    ganho.gain.setValueAtTime(volume, t);
    ganho.gain.exponentialRampToValueAtTime(0.001, t + duracao);
    osc.connect(ganho).connect(this.saida);
    osc.start(t);
    osc.stop(t + duracao + 0.02);
  }

  private bumbo(t: number): void {
    const osc = this.ctx.createOscillator();
    const ganho = this.ctx.createGain();
    osc.frequency.setValueAtTime(130, t);
    osc.frequency.exponentialRampToValueAtTime(45, t + 0.12);
    ganho.gain.setValueAtTime(0.55, t);
    ganho.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
    osc.connect(ganho).connect(this.saida);
    osc.start(t);
    osc.stop(t + 0.17);
  }

  private chiado(t: number, duracao: number, volume: number, corte: number): void {
    const fonte = this.ctx.createBufferSource();
    fonte.buffer = this.ruido;
    const filtro = this.ctx.createBiquadFilter();
    filtro.type = 'highpass';
    filtro.frequency.value = corte;
    const ganho = this.ctx.createGain();
    ganho.gain.setValueAtTime(volume, t);
    ganho.gain.exponentialRampToValueAtTime(0.001, t + duracao);
    fonte.connect(filtro).connect(ganho).connect(this.saida);
    fonte.start(t, Math.random() * 0.5);
    fonte.stop(t + duracao + 0.02);
  }
}
