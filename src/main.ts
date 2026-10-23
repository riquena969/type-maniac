import '@fontsource/pixelify-sans/latin-400.css';
import '@fontsource/press-start-2p/latin-400.css';
import './style.css';
import { Sons } from './audio/sfx';
import { FONTE_HUD, FONTE_PALAVRA, FONTE_TITULO } from './game/constantes';
import { Jogo } from './game/Game';
import { Renderer } from './render/Renderer';
import { Interface } from './ui/screens';
import { lerConfig } from './ui/storage';
import { WordBank } from './words/WordBank';

const PASSO = 1 / 120;

async function iniciar(): Promise<void> {
  const palco = document.querySelector<HTMLElement>('#palco')!;
  const canvas = document.querySelector<HTMLCanvasElement>('#tela')!;
  const raizUi = document.querySelector<HTMLElement>('#interface')!;

  const config = lerConfig();
  const sons = new Sons();
  sons.ativo = config.som;

  let jogo: Jogo | undefined;
  const ui = new Interface(raizUi, {
    jogar: () => jogo?.novaPartida(),
    continuar: () => jogo?.continuar(),
    menu: () => jogo?.irParaMenu(),
    aoMudarConfig: (c) => {
      sons.ativo = c.som;
      if (jogo) jogo.opcoes = c;
    },
  }, config);

  try {
    const renderer = new Renderer(canvas, palco);
    const amostra = 'aáàâãçéêíóôõú';
    await Promise.all([FONTE_PALAVRA, FONTE_HUD, FONTE_TITULO].map((f) => document.fonts.load(f, amostra)));
    const banco = await WordBank.carregar(`${import.meta.env.BASE_URL}words/pt-br.json`);

    jogo = new Jogo(banco, (t) => renderer.medir(t), sons, config, {
      aoMudarEstado: (estado) => ui.aoMudarEstado(estado),
      aoFimDeJogo: (resumo) => ui.mostrarFim(resumo),
    });
    const j = jogo;

    window.addEventListener('keydown', (e) => {
      if (j.teclado(e)) e.preventDefault();
    });
    window.addEventListener('blur', () => j.pausar());
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) j.pausar();
    });

    if (import.meta.env.DEV) Object.assign(window, { __typeManiac: j });

    j.irParaMenu();
    let anterior = performance.now();
    let acumulado = 0;
    const quadro = (agora: number) => {
      acumulado += Math.min(0.1, (agora - anterior) / 1000);
      anterior = agora;
      while (acumulado >= PASSO) {
        j.atualizar(PASSO);
        acumulado -= PASSO;
      }
      renderer.desenhar(j, agora / 1000);
      requestAnimationFrame(quadro);
    };
    requestAnimationFrame(quadro);
  } catch (erro) {
    console.error(erro);
    ui.erro(erro instanceof Error ? erro.message : String(erro));
  }
}

void iniciar();
