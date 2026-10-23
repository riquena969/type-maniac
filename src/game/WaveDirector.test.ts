import { describe, expect, it } from 'vitest';
import { WPM_MAXIMO, configDaOnda, intervaloEntreGrupos, tempoDeQueda } from './WaveDirector';

describe('configDaOnda', () => {
  it('fica mais difícil a cada onda, sem nunca aliviar', () => {
    for (let n = 1; n < 40; n++) {
      const a = configDaOnda(n);
      const b = configDaOnda(n + 1);
      expect(b.wpmAlvo).toBeGreaterThanOrEqual(a.wpmAlvo);
      expect(b.totalPalavras).toBeGreaterThanOrEqual(a.totalPalavras);
      expect(b.pctMin).toBeGreaterThanOrEqual(a.pctMin);
      expect(b.pctMax).toBeGreaterThanOrEqual(a.pctMax);
      expect(b.tamanhoMax).toBeGreaterThanOrEqual(a.tamanhoMax);
      expect(b.folga).toBeLessThanOrEqual(a.folga);
    }
  });

  it('respeita os tetos', () => {
    const c = configDaOnda(500);
    expect(c.wpmAlvo).toBe(WPM_MAXIMO);
    expect(c.pctMax).toBe(1);
    expect(c.pctMin).toBeLessThan(c.pctMax);
    expect(c.tamanhoMax).toBe(14);
    expect(c.folga).toBeGreaterThan(1);
  });

  it('começa fácil', () => {
    const c = configDaOnda(1);
    expect(c.pctMin).toBe(0);
    expect(c.pctMax).toBeCloseTo(0.15);
    expect(c.wpmAlvo).toBe(15);
  });
});

describe('tempos', () => {
  it('a queda dá mais tempo do que digitar no WPM-alvo exige', () => {
    const c = configDaOnda(8);
    const letras = 20;
    const minimo = letras / ((c.wpmAlvo * 5) / 60);
    expect(tempoDeQueda(c, letras, 3)).toBeGreaterThan(minimo);
  });

  it('grupos mais longos caem mais devagar e espaçam mais', () => {
    const c = configDaOnda(3);
    expect(tempoDeQueda(c, 20, 3)).toBeGreaterThan(tempoDeQueda(c, 8, 2));
    expect(intervaloEntreGrupos(c, 20, 3)).toBeGreaterThan(intervaloEntreGrupos(c, 8, 2));
  });
});
