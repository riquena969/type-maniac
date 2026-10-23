// Modelo físico do teclado ABNT2 usado para estimar o esforço de digitar uma palavra.

export type Mao = 'esquerda' | 'direita';
export type Dedo = 'minimo' | 'anelar' | 'medio' | 'indicador';
export type Fileira = 'superior' | 'central' | 'inferior';

export interface Tecla {
  id: string;
  mao: Mao;
  dedo: Dedo;
  fileira: Fileira;
  /** Tecla fora da coluna "de descanso" do dedo (exige esticar). */
  esticada: boolean;
}

// Coluna → mão/dedo, seguindo a digitação de 10 dedos.
const COLUNAS: Array<{ mao: Mao; dedo: Dedo; esticada: boolean }> = [
  { mao: 'esquerda', dedo: 'minimo', esticada: false },
  { mao: 'esquerda', dedo: 'anelar', esticada: false },
  { mao: 'esquerda', dedo: 'medio', esticada: false },
  { mao: 'esquerda', dedo: 'indicador', esticada: false },
  { mao: 'esquerda', dedo: 'indicador', esticada: true },
  { mao: 'direita', dedo: 'indicador', esticada: true },
  { mao: 'direita', dedo: 'indicador', esticada: false },
  { mao: 'direita', dedo: 'medio', esticada: false },
  { mao: 'direita', dedo: 'anelar', esticada: false },
  { mao: 'direita', dedo: 'minimo', esticada: false },
  { mao: 'direita', dedo: 'minimo', esticada: true },
  { mao: 'direita', dedo: 'minimo', esticada: true },
];

const FILEIRAS: Record<Fileira, string[]> = {
  superior: ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p', '´', '['],
  central: ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l', 'ç', '~', ']'],
  inferior: ['z', 'x', 'c', 'v', 'b', 'n', 'm', ',', '.', ';', '/'],
};

export const TECLAS: ReadonlyMap<string, Tecla> = (() => {
  const mapa = new Map<string, Tecla>();
  for (const fileira of Object.keys(FILEIRAS) as Fileira[]) {
    FILEIRAS[fileira].forEach((id, coluna) => {
      mapa.set(id, { id, fileira, ...COLUNAS[coluna] });
    });
  }
  // Shift oposto à mão da tecla acentuada; os acentos ficam na mão direita.
  mapa.set('shift-esq', { id: 'shift-esq', mao: 'esquerda', dedo: 'minimo', fileira: 'inferior', esticada: true });
  mapa.set('shift-dir', { id: 'shift-dir', mao: 'direita', dedo: 'minimo', fileira: 'inferior', esticada: true });
  return mapa;
})();

// Caractere acentuado → sequência de teclas (teclas mortas do ABNT2).
const ACENTOS: Record<string, string[]> = {
  á: ['´', 'a'], é: ['´', 'e'], í: ['´', 'i'], ó: ['´', 'o'], ú: ['´', 'u'],
  à: ['shift-esq', '´', 'a'],
  â: ['shift-esq', '~', 'a'], ê: ['shift-esq', '~', 'e'], ô: ['shift-esq', '~', 'o'],
  ã: ['~', 'a'], õ: ['~', 'o'],
};

/** Teclas físicas pressionadas para digitar a palavra, ou `null` se tiver caractere fora do ABNT2 minúsculo. */
export function teclasDaPalavra(palavra: string): Tecla[] | null {
  const teclas: Tecla[] = [];
  for (const ch of palavra.normalize('NFC')) {
    const ids = ACENTOS[ch] ?? (/^[a-zç]$/.test(ch) ? [ch] : null);
    if (!ids) return null;
    for (const id of ids) teclas.push(TECLAS.get(id)!);
  }
  return teclas;
}
