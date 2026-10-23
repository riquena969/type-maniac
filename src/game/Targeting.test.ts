import { describe, expect, it } from 'vitest';
import { letraDoEvento, processarTecla, type Alvejavel } from './Targeting';

function palavra(id: number, texto: string, y: number, digitadas = 0): Alvejavel {
  return { id, letras: [...texto], digitadas, y, ativa: true };
}

const sem = { ignorarAcentos: false };
const com = { ignorarAcentos: true };

describe('processarTecla', () => {
  it('trava na palavra mais baixa que começa com a letra', () => {
    const palavras = [palavra(1, 'casa', 50), palavra(2, 'cão', 120), palavra(3, 'bola', 200)];
    expect(processarTecla('c', palavras, null, sem)).toEqual({
      tipo: 'acerto', palavraId: 2, indice: 0, completou: false, travou: true,
    });
  });

  it('avança o alvo travado e avisa quando completa', () => {
    const palavras = [palavra(1, 'sol', 50, 2)];
    expect(processarTecla('l', palavras, 1, sem)).toMatchObject({ tipo: 'acerto', indice: 2, completou: true, travou: false });
  });

  it('erro mantém o alvo e informa a letra esperada', () => {
    const palavras = [palavra(1, 'sol', 50, 1), palavra(2, 'xis', 300)];
    expect(processarTecla('x', palavras, 1, sem)).toEqual({ tipo: 'erro', palavraId: 1, esperado: 'o' });
  });

  it('sem alvo e sem palavra compatível é erro sem letra esperada', () => {
    expect(processarTecla('z', [palavra(1, 'sol', 50)], null, sem)).toEqual({ tipo: 'erro', palavraId: null, esperado: null });
  });

  it('exige acento por padrão e aceita sem acento no modo ignorar acentos', () => {
    const palavras = [palavra(1, 'pé', 50, 1), palavra(2, 'ação', 80, 1)];
    expect(processarTecla('e', palavras, 1, sem).tipo).toBe('erro');
    expect(processarTecla('é', palavras, 1, sem).tipo).toBe('acerto');
    expect(processarTecla('e', palavras, 1, com).tipo).toBe('acerto');
    expect(processarTecla('c', palavras, 2, com).tipo).toBe('acerto');
  });

  it('ignora alvo que já não está ativo e retoma palavra parcialmente digitada', () => {
    const palavras = [{ ...palavra(1, 'sol', 50, 1), ativa: false }, palavra(2, 'mar', 80, 1)];
    expect(processarTecla('a', palavras, 1, sem)).toMatchObject({ tipo: 'acerto', palavraId: 2, travou: true });
  });
});

describe('letraDoEvento', () => {
  const ev = (key: string, mods: Partial<KeyboardEvent> = {}) =>
    letraDoEvento({ key, ctrlKey: false, metaKey: false, altKey: false, ...mods });

  it('aceita letras, inclusive acentuadas, em minúscula', () => {
    expect(ev('a')).toBe('a');
    expect(ev('É')).toBe('é');
    expect(ev('ç')).toBe('ç');
  });

  it('ignora teclas mortas, especiais e atalhos', () => {
    expect(ev('Dead')).toBeNull();
    expect(ev('Shift')).toBeNull();
    expect(ev('1')).toBeNull();
    expect(ev(' ')).toBeNull();
    expect(ev('r', { metaKey: true })).toBeNull();
    expect(ev('r', { ctrlKey: true })).toBeNull();
  });
});
