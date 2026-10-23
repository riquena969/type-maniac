import { describe, expect, it } from 'vitest';
import { CONFIG_PADRAO, entraNoTop, lerConfig, lerRecordes, salvarConfig, salvarRecorde, type Recorde } from './storage';

function memoria(inicial: Record<string, string> = {}) {
  const dados = new Map(Object.entries(inicial));
  return {
    getItem: (k: string) => dados.get(k) ?? null,
    setItem: (k: string, v: string) => void dados.set(k, v),
  };
}

const recorde = (pontos: number): Recorde => ({ nome: `p${pontos}`, pontos, onda: 1, wpm: 30, precisao: 0.9, data: '2026-10-23' });

describe('recordes', () => {
  it('mantém o top 10 ordenado', () => {
    const armazem = memoria();
    for (const pts of [50, 900, 10, 300, 700, 20, 40, 60, 80, 100, 5, 1000]) salvarRecorde(recorde(pts), armazem);
    const lista = lerRecordes(armazem);
    expect(lista).toHaveLength(10);
    expect(lista[0].pontos).toBe(1000);
    expect(lista.map((r) => r.pontos)).not.toContain(5);
    expect(lista.map((r) => r.pontos)).not.toContain(10);
  });

  it('diz se uma pontuação entra no top', () => {
    const cheia = Array.from({ length: 10 }, (_, i) => recorde((i + 1) * 100)).reverse();
    expect(entraNoTop(50, cheia)).toBe(false);
    expect(entraNoTop(150, cheia)).toBe(true);
    expect(entraNoTop(0, [])).toBe(false);
    expect(entraNoTop(1, [])).toBe(true);
  });

  it('não quebra com JSON corrompido ou storage indisponível', () => {
    expect(lerRecordes(memoria({ 'type-maniac:recordes:v1': '{oops' }))).toEqual([]);
    expect(lerRecordes(memoria({ 'type-maniac:recordes:v1': '[{"nome":1}]' }))).toEqual([]);
    expect(lerRecordes(null)).toEqual([]);
    const quebrado = { getItem: () => { throw new Error('SecurityError'); }, setItem: () => { throw new Error('QuotaExceeded'); } };
    expect(lerRecordes(quebrado)).toEqual([]);
    expect(() => salvarRecorde(recorde(10), quebrado)).not.toThrow();
  });
});

describe('configurações', () => {
  it('usa o padrão e mescla o que foi salvo', () => {
    const armazem = memoria();
    expect(lerConfig(armazem)).toEqual(CONFIG_PADRAO);
    const config = { ignorarAcentos: true, som: false, musica: false, nome: 'Ana', ondaInicial: 5 };
    salvarConfig(config, armazem);
    expect(lerConfig(armazem)).toEqual(config);
  });
});
