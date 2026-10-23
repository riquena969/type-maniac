import { describe, expect, it } from 'vitest';
import { Placar } from './Scoring';

describe('Placar', () => {
  it('combo sobe o multiplicador e erro zera', () => {
    const p = new Placar();
    for (let i = 0; i < 10; i++) p.registrarAcerto();
    expect(p.multiplicador()).toBe(2);
    for (let i = 0; i < 15; i++) p.registrarAcerto();
    expect(p.multiplicador()).toBe(3);
    p.registrarErro('a');
    expect(p.combo).toBe(0);
    expect(p.maiorCombo).toBe(25);
    expect(p.multiplicador()).toBe(1);
  });

  it('pontua mais palavras maiores e mais difíceis', () => {
    const p = new Placar();
    const facil = p.registrarPalavra(4, 0);
    const dificil = p.registrarPalavra(4, 999);
    const longa = p.registrarPalavra(10, 0);
    expect(facil).toBe(40);
    expect(dificil).toBeGreaterThan(facil);
    expect(longa).toBeGreaterThan(facil);
    expect(p.pontos).toBe(facil + dificil + longa);
  });

  it('bônus de onda só sem dano', () => {
    const p = new Placar();
    expect(p.registrarFimDeOnda(3, false)).toBe(0);
    expect(p.registrarFimDeOnda(3, true)).toBe(150);
  });

  it('calcula WPM, precisão e letras mais erradas', () => {
    const p = new Placar();
    for (let i = 0; i < 100; i++) p.registrarAcerto();
    p.registrarErro('ç');
    p.registrarErro('ç');
    p.registrarErro('é');
    p.registrarErro(null);
    p.avancarTempo(60);
    expect(p.wpm()).toBe(20);
    expect(p.precisao()).toBeCloseTo(100 / 104);
    expect(p.letrasMaisErradas()).toEqual([{ letra: 'ç', erros: 2 }, { letra: 'é', erros: 1 }]);
  });
});
