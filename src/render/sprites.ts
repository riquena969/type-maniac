import { criarSprite, espelhar, type Paleta } from './pixelart';

const PALETA_MAGO: Paleta = {
  K: '#140c24',
  H: '#4b2f9e', h: '#6d4fd0', s: '#ffe066', b: '#e8a33d',
  F: '#f4c58f', f: '#d99a63', E: '#140c24',
  W: '#f2efe8', w: '#c9c3d8',
  R: '#3352a6', r: '#24397a', T: '#e8a33d',
  B: '#4a2c1c',
};

// Mago virado para a direita, sem o braço da varinha (desenhado à parte, apontando para o alvo).
const CORPO = [
  '..........KK......',
  '.........KhK......',
  '........KhHK......',
  '........KhHHK.....',
  '.......KhHHHK.....',
  '.......KhHsHK.....',
  '......KhHsssHK....',
  '......KhHHsHHK....',
  '.....KhHHHHHHHK...',
  '...KKbbbbbbbbbbKK.',
  '..KHHHHHHHHHHHHHHK',
  '...KKKFFFFFFFKKK..',
  '.....KFFFFFEFFFK..',
  '.....KFFFFFFFFFfK.',
  '.....KWWFFFFFWWWK.',
  '....KRWWWWWWWWWWK.',
  '...KRRWWWWWWWWWRK.',
  '...KRRrWWWWWWWRRK.',
  '..KRRRrRWWWWWRRRK.',
  '..KRRRrRRWWWRRRRK.',
  '..KRRRrRRRWRRRRRK.',
  '.KRRRRrRRRRRRRRRRK',
  '.KRRRRrRRRRRRRRRRK',
  '.KTTTTTTTTTTTTTTTK',
  '..KKKKKKKKKKKKKKK.',
];

const PES = {
  parado: ['.....BBB...BBB....', '....BBBB..BBBB....'],
  passoA: ['....BBB.....BBB...', '...BBBB.....BBBB..'],
  passoB: ['......BBB.BBB.....', '.....BBBBBBBBB....'],
};

/** O mago é o protagonista: desenhado com pixels de arte maiores que o cenário. */
export const PIXEL_MAGO = 3;

/** Ponto do ombro (de onde sai o braço), em pixels de arte, com o mago virado à direita. */
export const OMBRO_MAGO = { x: 12, y: 17 };
export const LARGURA_MAGO = CORPO[0].length;
export const ALTURA_MAGO = CORPO.length + 2;

export interface QuadrosMago {
  direita: HTMLCanvasElement[];
  esquerda: HTMLCanvasElement[];
}

export type QuadroMago = 'parado' | 'passoA' | 'passoB';
export const ORDEM_QUADROS: QuadroMago[] = ['parado', 'passoA', 'passoB'];

export function criarQuadrosMago(): QuadrosMago {
  const direita = ORDEM_QUADROS.map((q) => criarSprite([...CORPO, ...PES[q]], PALETA_MAGO));
  return { direita, esquerda: direita.map(espelhar) };
}

export const CORES_BRACO = { manga: '#3352a6', mangaSombra: '#24397a', mao: '#f4c58f', varinha: '#7a4a2a', ponta: '#fff3b0' };

const PALETA_CORACAO: Paleta = { R: '#e8384f', r: '#a3203a', w: '#ffd0d6', K: '#140c24', g: '#3a3150' };

export function criarCoracoes(): { cheio: HTMLCanvasElement; vazio: HTMLCanvasElement } {
  const cheio = criarSprite([
    '.KK.KK.',
    'KwRKRRK',
    'KRRRRrK',
    '.KRRrK.',
    '..KrK..',
    '...K...',
  ], PALETA_CORACAO);
  const vazio = criarSprite([
    '.KK.KK.',
    'KggKggK',
    'KgggggK',
    '.KgggK.',
    '..KgK..',
    '...K...',
  ], PALETA_CORACAO);
  return { cheio, vazio };
}
