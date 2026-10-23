// Curva de dificuldade: cada onda tem um WPM-alvo, e a velocidade de queda é
// calculada para que alguém digitando nesse ritmo dê conta da tela bem a tempo.

export interface ConfigOnda {
  onda: number;
  totalPalavras: number;
  grupoMin: number;
  grupoMax: number;
  wpmAlvo: number;
  /** Multiplicador do tempo de digitação disponível (folga > 1 = mais tempo). */
  folga: number;
  /** Segundos extras de margem antes de a palavra tocar o chão. */
  margem: number;
  /** Intervalo entre grupos, como fração do tempo de digitar o grupo. */
  ritmo: number;
  pctMin: number;
  pctMax: number;
  tamanhoMax: number;
}

export const WPM_MAXIMO = 100;
const REACAO_POR_PALAVRA = 0.45;

export function configDaOnda(onda: number): ConfigOnda {
  const n = Math.max(1, Math.floor(onda));
  const k = n - 1;
  const [grupoMin, grupoMax] = n <= 2 ? [1, 2] : n <= 6 ? [2, 3] : [2, 4];
  return {
    onda: n,
    totalPalavras: Math.min(40, 6 + 2 * n),
    grupoMin,
    grupoMax,
    wpmAlvo: Math.min(WPM_MAXIMO, 15 + 4.5 * k),
    folga: Math.max(1.15, 1.8 - 0.05 * k),
    margem: Math.max(1, 2.5 - 0.1 * k),
    ritmo: Math.max(0.95, 1.25 - 0.02 * k),
    pctMin: Math.min(0.5, 0.03 * k),
    pctMax: Math.min(1, 0.15 + 0.06 * k),
    tamanhoMax: Math.min(14, 5 + Math.floor(k / 2)),
  };
}

function tempoParaDigitar(cfg: ConfigOnda, letras: number, palavras: number): number {
  const letrasPorSegundo = (cfg.wpmAlvo * 5) / 60;
  return letras / letrasPorSegundo + REACAO_POR_PALAVRA * palavras;
}

/** Segundos que as palavras do grupo levam do topo até o chão. */
export function tempoDeQueda(cfg: ConfigOnda, letrasDoGrupo: number, palavrasNoGrupo: number): number {
  return tempoParaDigitar(cfg, letrasDoGrupo, palavrasNoGrupo) * cfg.folga + cfg.margem;
}

/** Segundos até soltar o próximo grupo. */
export function intervaloEntreGrupos(cfg: ConfigOnda, letrasDoGrupo: number, palavrasNoGrupo: number): number {
  return tempoParaDigitar(cfg, letrasDoGrupo, palavrasNoGrupo) * cfg.ritmo;
}
