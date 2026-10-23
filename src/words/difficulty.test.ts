import { describe, expect, it } from 'vitest';
import { dificuldadeBruta, esforcoDeDigitacao } from './difficulty';
import { teclasDaPalavra } from './keyboard-abnt2';
import { semAcentos } from './normalize';

const ids = (p: string) => teclasDaPalavra(p)?.map((t) => t.id);

describe('teclasDaPalavra (ABNT2)', () => {
  it('expande acentos em teclas mortas e shift', () => {
    expect(ids('é')).toEqual(['´', 'e']);
    expect(ids('ã')).toEqual(['~', 'a']);
    expect(ids('â')).toEqual(['shift-esq', '~', 'a']);
    expect(ids('à')).toEqual(['shift-esq', '´', 'a']);
    expect(ids('ç')).toEqual(['ç']);
    expect(ids('pão')).toEqual(['p', '~', 'a', 'o']);
  });

  it('recusa caracteres fora do alfabeto do jogo', () => {
    expect(teclasDaPalavra('fim,')).toBeNull();
    expect(teclasDaPalavra('Casa')).toBeNull();
    expect(teclasDaPalavra('pingüim')).toBeNull();
  });
});

describe('esforcoDeDigitacao', () => {
  const e = (p: string) => esforcoDeDigitacao(p)!;

  it('cresce com o tamanho', () => {
    expect(e('casa')).toBeLessThan(e('computador'));
    expect(e('computador')).toBeLessThan(e('excepcionalmente'));
  });

  it('fileira central alternando mãos é mais fácil que bigramas do mesmo dedo', () => {
    expect(e('fala')).toBeLessThan(e('dedo'));
    expect(e('juju')).toBeLessThan(e('cede'));
  });

  it('acento custa mais que a mesma palavra sem acento', () => {
    expect(e('pao')).toBeLessThan(e('pão'));
    expect(e('voce')).toBeLessThan(e('você'));
    expect(e('ave')).toBeLessThan(e('avô'));
  });

  it('letras raras custam mais', () => {
    expect(e('caqui')).toBeLessThan(e('kiwis'));
  });
});

describe('dificuldadeBruta', () => {
  it('palavra rara é mais difícil que comum de mesmo esforço', () => {
    expect(dificuldadeBruta('casa', 50)!).toBeLessThan(dificuldadeBruta('casa', 20000)!);
  });
});

describe('semAcentos', () => {
  it('remove acentos e cedilha', () => {
    expect(semAcentos('ação àvô pêssego')).toBe('acao avo pessego');
  });
});
