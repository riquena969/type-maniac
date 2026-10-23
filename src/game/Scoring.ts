export const DEGRAUS_COMBO = [
  { combo: 50, multiplicador: 4 },
  { combo: 25, multiplicador: 3 },
  { combo: 10, multiplicador: 2 },
] as const;

export class Placar {
  pontos = 0;
  combo = 0;
  maiorCombo = 0;
  acertos = 0;
  erros = 0;
  palavras = 0;
  /** Segundos de jogo ativo (sem pausa nem letreiro de onda). */
  tempoAtivo = 0;
  private errosPorLetra = new Map<string, number>();

  multiplicador(): number {
    return DEGRAUS_COMBO.find((d) => this.combo >= d.combo)?.multiplicador ?? 1;
  }

  registrarAcerto(): void {
    this.acertos++;
    this.combo++;
    this.maiorCombo = Math.max(this.maiorCombo, this.combo);
  }

  registrarErro(esperada: string | null): void {
    this.erros++;
    this.combo = 0;
    if (esperada) this.errosPorLetra.set(esperada, (this.errosPorLetra.get(esperada) ?? 0) + 1);
  }

  /** Soma e devolve os pontos de uma palavra completada. */
  registrarPalavra(tamanho: number, dificuldade: number): number {
    const pontos = Math.round(10 * (1 + dificuldade / 250) * tamanho * this.multiplicador());
    this.palavras++;
    this.pontos += pontos;
    return pontos;
  }

  /** Bônus por terminar a onda; só vale se nenhuma palavra tocou o chão. */
  registrarFimDeOnda(onda: number, semDano: boolean): number {
    const bonus = semDano ? 50 * onda : 0;
    this.pontos += bonus;
    return bonus;
  }

  avancarTempo(segundos: number): void {
    this.tempoAtivo += segundos;
  }

  wpm(): number {
    if (this.tempoAtivo < 1) return 0;
    return Math.round(this.acertos / 5 / (this.tempoAtivo / 60));
  }

  precisao(): number {
    const total = this.acertos + this.erros;
    return total === 0 ? 1 : this.acertos / total;
  }

  letrasMaisErradas(quantas = 5): Array<{ letra: string; erros: number }> {
    return [...this.errosPorLetra]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'pt-BR'))
      .slice(0, quantas)
      .map(([letra, erros]) => ({ letra, erros }));
  }
}
