import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import type { Sons } from '../audio/sfx';
import { CONFIG_PADRAO } from '../ui/storage';
import { WordBank } from '../words/WordBank';
import { Jogo, type EstadoJogo, type ResumoPartida } from './Game';

const palavras = (JSON.parse(readFileSync('public/words/pt-br.json', 'utf8')) as { palavras: string[] }).palavras;
const sonsMudos = new Proxy({}, { get: () => () => {} }) as Sons;
const medir = (texto: string) => {
  const letras = [...texto];
  return { deslocamentos: letras.map((_, i) => i * 9), larguras: letras.map(() => 9), largura: letras.length * 9 };
};

function tecla(key: string): KeyboardEvent {
  return { key, ctrlKey: false, metaKey: false, altKey: false } as KeyboardEvent;
}

/** Simula uma partida com um robô digitando a `wpm` sem errar. */
export function simular(wpm: number, limiteSegundos = 900, ondaInicial = 1) {
  const estados: EstadoJogo[] = [];
  let resumo: ResumoPartida | null = null;
  const jogo = new Jogo(new WordBank(palavras), medir, sonsMudos, { ...CONFIG_PADRAO, ondaInicial }, {
    aoMudarEstado: (e) => estados.push(e),
    aoFimDeJogo: (r) => (resumo = r),
  });
  jogo.novaPartida();
  const dt = 1 / 60;
  const intervalo = 60 / (wpm * 5);
  let relogio = 0;
  for (let t = 0; t < limiteSegundos && !resumo; t += dt) {
    jogo.atualizar(dt);
    relogio -= dt;
    if (jogo.estado !== 'jogando' || relogio > 0) continue;
    const alvo =
      jogo.palavras.find((p) => p.id === jogo.alvoId && p.ativa) ??
      jogo.palavras.filter((p) => p.ativa && p.y > 0).sort((a, b) => b.y - a.y)[0];
    if (!alvo) continue;
    jogo.teclado(tecla(alvo.letras[alvo.digitadas]));
    relogio = intervalo + (alvo.digitadas === 1 ? 0.25 : 0);
  }
  return { jogo, estados, resumo: resumo as ResumoPartida | null };
}

describe('Jogo (simulação)', () => {
  it('quem não digita perde as 3 vidas na primeira onda', () => {
    const { resumo, estados } = simular(0.0001, 120);
    expect(resumo).not.toBeNull();
    expect(resumo!.onda).toBe(1);
    expect(estados.at(-1)).toBe('fim');
  });

  it('quem digita mais rápido chega mais longe', () => {
    const lento = simular(25).jogo.onda;
    const rapido = simular(70).jogo.onda;
    expect(lento).toBeGreaterThanOrEqual(2);
    expect(rapido).toBeGreaterThan(lento);
  });

  it('começar numa onda mais alta funciona', () => {
    const { jogo } = simular(200, 5, 10);
    expect(jogo.onda).toBeGreaterThanOrEqual(10);
  });
});
