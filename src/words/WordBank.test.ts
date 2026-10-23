import { describe, expect, it } from 'vitest';
import { WordBank, inicial } from './WordBank';

function sequencia(valores: number[]): () => number {
  let i = 0;
  return () => valores[i++ % valores.length];
}

const PALAVRAS = ['sol', 'mar', 'casa', 'bola', 'árvore', 'janela', 'computador', 'excepcionalmente'];

describe('WordBank', () => {
  it('mapeia posição no ranking para dificuldade 0..999', () => {
    const banco = new WordBank(PALAVRAS);
    expect(banco.dificuldadeDe(0)).toBe(0);
    expect(banco.dificuldadeDe(PALAVRAS.length - 1)).toBe(999);
  });

  it('sorteia dentro da janela de percentil e do tamanho máximo', () => {
    const banco = new WordBank(PALAVRAS, Math.random);
    for (let i = 0; i < 50; i++) {
      const p = banco.sortear({ pctMin: 0, pctMax: 0.5, tamanhoMax: 4, iniciaisEmUso: new Set() });
      expect(PALAVRAS.indexOf(p.texto)).toBeLessThan(4);
    }
  });

  it('evita iniciais já em uso, comparando sem acento', () => {
    const banco = new WordBank(PALAVRAS, sequencia([0.62, 0.1, 0.3]));
    const p = banco.sortear({ pctMin: 0, pctMax: 1, tamanhoMax: 20, iniciaisEmUso: new Set(['a', 's']) });
    expect(['a', 's']).not.toContain(inicial(p.texto));
  });

  it('não repete palavras recentes enquanto houver alternativa', () => {
    const banco = new WordBank(PALAVRAS);
    const vistas = new Set<string>();
    for (let i = 0; i < 4; i++) {
      vistas.add(banco.sortear({ pctMin: 0, pctMax: 0.5, tamanhoMax: 20, iniciaisEmUso: new Set() }).texto);
    }
    expect(vistas.size).toBe(4);
  });

  it('relaxa as restrições quando nada satisfaz', () => {
    const banco = new WordBank(PALAVRAS);
    const p = banco.sortear({ pctMin: 0.9, pctMax: 1, tamanhoMax: 3, iniciaisEmUso: new Set(['e']) });
    expect(p.texto).toBe('excepcionalmente');
  });
});
