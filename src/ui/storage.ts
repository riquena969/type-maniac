// Persistência local (recordes e opções). Tudo tolera storage indisponível ou corrompido.

export interface Recorde {
  nome: string;
  pontos: number;
  onda: number;
  wpm: number;
  precisao: number;
  data: string;
}

export interface Configuracoes {
  ignorarAcentos: boolean;
  som: boolean;
  /** Último nome usado no placar. */
  nome: string;
  /** Onda em que a partida começa (quem já digita rápido pula o aquecimento). */
  ondaInicial: number;
}

export const ONDAS_INICIAIS = [1, 5, 10, 15] as const;

type Armazem = Pick<Storage, 'getItem' | 'setItem'>;

const CHAVE_RECORDES = 'type-maniac:recordes:v1';
const CHAVE_CONFIG = 'type-maniac:config:v1';
export const TOP = 10;
export const CONFIG_PADRAO: Configuracoes = { ignorarAcentos: false, som: true, nome: '', ondaInicial: 1 };

function armazemPadrao(): Armazem | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function ler<T>(chave: string, armazem: Armazem | null): T | null {
  try {
    const bruto = armazem?.getItem(chave);
    return bruto ? (JSON.parse(bruto) as T) : null;
  } catch {
    return null;
  }
}

function gravar(chave: string, valor: unknown, armazem: Armazem | null): void {
  try {
    armazem?.setItem(chave, JSON.stringify(valor));
  } catch {
    // Sem storage (aba privada, cota cheia): o jogo segue sem persistir.
  }
}

function ehRecorde(r: unknown): r is Recorde {
  const x = r as Recorde;
  return !!x && typeof x.nome === 'string' && Number.isFinite(x.pontos) && Number.isFinite(x.onda);
}

export function lerRecordes(armazem: Armazem | null = armazemPadrao()): Recorde[] {
  const lista = ler<unknown>(CHAVE_RECORDES, armazem);
  if (!Array.isArray(lista)) return [];
  return lista.filter(ehRecorde).sort((a, b) => b.pontos - a.pontos).slice(0, TOP);
}

export function entraNoTop(pontos: number, recordes: readonly Recorde[]): boolean {
  if (pontos <= 0) return false;
  return recordes.length < TOP || pontos > recordes[recordes.length - 1].pontos;
}

/** Insere o recorde, mantém o top 10 e devolve a lista atualizada. */
export function salvarRecorde(recorde: Recorde, armazem: Armazem | null = armazemPadrao()): Recorde[] {
  const lista = [...lerRecordes(armazem), recorde].sort((a, b) => b.pontos - a.pontos).slice(0, TOP);
  gravar(CHAVE_RECORDES, lista, armazem);
  return lista;
}

export function lerConfig(armazem: Armazem | null = armazemPadrao()): Configuracoes {
  return { ...CONFIG_PADRAO, ...ler<Partial<Configuracoes>>(CHAVE_CONFIG, armazem) };
}

export function salvarConfig(config: Configuracoes, armazem: Armazem | null = armazemPadrao()): void {
  gravar(CHAVE_CONFIG, config, armazem);
}
