import { semAcentos } from './normalize';

export interface PalavraSorteada {
  texto: string;
  /** 0 (mais fácil) a 999 (mais difícil), pela posição no ranking. */
  dificuldade: number;
}

export interface FiltroSorteio {
  /** Janela de percentil do ranking, 0..1. */
  pctMin: number;
  pctMax: number;
  tamanhoMax: number;
  /** Iniciais (sem acento) já em uso na tela; evita ambiguidade na mira. */
  iniciaisEmUso: ReadonlySet<string>;
}

const MEMORIA_RECENTES = 300;
const TENTATIVAS = 80;

export function inicial(texto: string): string {
  return semAcentos([...texto][0] ?? '');
}

export class WordBank {
  private recentes: string[] = [];
  private emRecentes = new Set<string>();

  constructor(
    private readonly palavras: readonly string[],
    private readonly aleatorio: () => number = Math.random,
  ) {
    if (palavras.length < 2) throw new Error('WordBank precisa de pelo menos 2 palavras');
  }

  static async carregar(url: string): Promise<WordBank> {
    const resposta = await fetch(url);
    if (!resposta.ok) throw new Error(`Falha ao carregar palavras: HTTP ${resposta.status}`);
    const dados = (await resposta.json()) as { palavras: string[] };
    return new WordBank(dados.palavras);
  }

  get tamanho(): number {
    return this.palavras.length;
  }

  dificuldadeDe(indice: number): number {
    return Math.round((indice / (this.palavras.length - 1)) * 999);
  }

  sortear(filtro: FiltroSorteio): PalavraSorteada {
    const n = this.palavras.length;
    const ini = Math.max(0, Math.min(n - 1, Math.floor(filtro.pctMin * n)));
    const fim = Math.max(ini + 1, Math.min(n, Math.ceil(filtro.pctMax * n)));

    // Relaxa as restrições aos poucos até achar algo.
    const niveis: Array<(p: string) => boolean> = [
      (p) => !this.emRecentes.has(p) && [...p].length <= filtro.tamanhoMax && !filtro.iniciaisEmUso.has(inicial(p)),
      (p) => [...p].length <= filtro.tamanhoMax && !filtro.iniciaisEmUso.has(inicial(p)),
      (p) => !filtro.iniciaisEmUso.has(inicial(p)),
      () => true,
    ];
    for (const aceita of niveis) {
      for (let t = 0; t < TENTATIVAS; t++) {
        const indice = ini + Math.floor(this.aleatorio() * (fim - ini));
        const texto = this.palavras[indice];
        if (aceita(texto)) return this.usar(texto, indice);
      }
    }
    const indice = ini + Math.floor(this.aleatorio() * (fim - ini));
    return this.usar(this.palavras[indice], indice);
  }

  private usar(texto: string, indice: number): PalavraSorteada {
    this.recentes.push(texto);
    this.emRecentes.add(texto);
    if (this.recentes.length > MEMORIA_RECENTES) this.emRecentes.delete(this.recentes.shift()!);
    return { texto, dificuldade: this.dificuldadeDe(indice) };
  }
}
