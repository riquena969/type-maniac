export interface Particula {
  x: number;
  y: number;
  vx: number;
  vy: number;
  vida: number;
  vidaMax: number;
  cor: string;
  tamanho: number;
  gravidade: number;
}

export interface TextoFlutuante {
  x: number;
  y: number;
  texto: string;
  cor: string;
  vida: number;
  vidaMax: number;
  grande: boolean;
}

export interface LetraVoando {
  letra: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  giro: number;
  angulo: number;
  vida: number;
  cor: string;
}

export const CORES = {
  magia: ['#7fdcff', '#b28dff', '#e8fbff', '#ffd166'],
  estouro: ['#ffd166', '#ff8e3c', '#ff5d8f', '#b28dff', '#7fdcff', '#ffffff'],
  dano: ['#ff5d5d', '#ff8e3c', '#ffd166', '#5a4636'],
  falha: ['#7a7090', '#a9a1bd'],
};

const MAX_PARTICULAS = 900;

export class Efeitos {
  particulas: Particula[] = [];
  textos: TextoFlutuante[] = [];
  letras: LetraVoando[] = [];
  private tremor = 0;
  private forcaTremor = 0;
  flash = 0;

  explosao(x: number, y: number, cores: readonly string[], quantidade: number, forca: number, gravidade = 140): void {
    for (let i = 0; i < quantidade && this.particulas.length < MAX_PARTICULAS; i++) {
      const ang = Math.random() * Math.PI * 2;
      const vel = forca * (0.3 + Math.random() * 0.7);
      const vida = 0.4 + Math.random() * 0.6;
      this.particulas.push({
        x, y,
        vx: Math.cos(ang) * vel,
        vy: Math.sin(ang) * vel - forca * 0.3,
        vida, vidaMax: vida,
        cor: cores[Math.floor(Math.random() * cores.length)],
        tamanho: Math.random() < 0.3 ? 4 : 2,
        gravidade,
      });
    }
  }

  rastroDeMagia(x: number, y: number): void {
    if (this.particulas.length >= MAX_PARTICULAS) return;
    const vida = 0.2 + Math.random() * 0.25;
    this.particulas.push({
      x: x + (Math.random() - 0.5) * 4,
      y: y + (Math.random() - 0.5) * 4,
      vx: (Math.random() - 0.5) * 20,
      vy: (Math.random() - 0.5) * 20,
      vida, vidaMax: vida,
      cor: CORES.magia[Math.floor(Math.random() * CORES.magia.length)],
      tamanho: 2,
      gravidade: 0,
    });
  }

  estilhacarPalavra(letras: readonly string[], posicoes: Array<{ x: number; y: number }>): void {
    letras.forEach((letra, i) => {
      const { x, y } = posicoes[i];
      this.letras.push({
        letra, x, y,
        vx: (Math.random() - 0.5) * 160,
        vy: -60 - Math.random() * 120,
        giro: (Math.random() - 0.5) * 10,
        angulo: 0,
        vida: 0.9,
        cor: CORES.estouro[i % CORES.estouro.length],
      });
    });
  }

  texto(x: number, y: number, texto: string, cor: string, grande = false): void {
    const vida = grande ? 1.4 : 0.9;
    this.textos.push({ x, y, texto, cor, vida, vidaMax: vida, grande });
  }

  tremer(forca: number, duracao: number): void {
    this.forcaTremor = Math.max(this.forcaTremor, forca);
    this.tremor = Math.max(this.tremor, duracao);
  }

  deslocamentoDoTremor(): { x: number; y: number } {
    if (this.tremor <= 0) return { x: 0, y: 0 };
    const f = this.forcaTremor;
    return { x: Math.round((Math.random() - 0.5) * 2 * f), y: Math.round((Math.random() - 0.5) * 2 * f) };
  }

  atualizar(dt: number): void {
    this.tremor = Math.max(0, this.tremor - dt);
    if (this.tremor === 0) this.forcaTremor = 0;
    this.flash = Math.max(0, this.flash - dt * 2.5);

    for (const p of this.particulas) {
      p.vida -= dt;
      p.vy += p.gravidade * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
    }
    this.particulas = this.particulas.filter((p) => p.vida > 0);

    for (const t of this.textos) {
      t.vida -= dt;
      t.y -= (t.grande ? 12 : 28) * dt;
    }
    this.textos = this.textos.filter((t) => t.vida > 0);

    for (const l of this.letras) {
      l.vida -= dt;
      l.vy += 320 * dt;
      l.x += l.vx * dt;
      l.y += l.vy * dt;
      l.angulo += l.giro * dt;
    }
    this.letras = this.letras.filter((l) => l.vida > 0);
  }

  limpar(): void {
    this.particulas = [];
    this.textos = [];
    this.letras = [];
    this.tremor = 0;
    this.flash = 0;
  }
}
