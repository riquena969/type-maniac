// Telas em HTML sobre o canvas: menu, opções, recordes, créditos, pausa e fim de jogo.
import type { EstadoJogo, ResumoPartida } from '../game/Game';
import { ONDAS_INICIAIS, entraNoTop, lerRecordes, salvarConfig, salvarRecorde, type Configuracoes, type Recorde } from './storage';

export interface AcoesInterface {
  jogar(): void;
  continuar(): void;
  menu(): void;
  aoMudarConfig(config: Configuracoes): void;
}

const ESCAPES: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ESCAPES[c]);
const pct = (x: number) => `${Math.round(x * 100)}%`;
const numero = (x: number) => x.toLocaleString('pt-BR');

export class Interface {
  private tela: 'menu' | 'submenu' | 'pausa' | 'fim' | null = null;

  constructor(
    private readonly raiz: HTMLElement,
    private readonly acoes: AcoesInterface,
    private config: Configuracoes,
  ) {
    raiz.addEventListener('click', (e) => {
      const botao = (e.target as HTMLElement).closest<HTMLButtonElement>('button[data-acao]');
      if (botao) this.executar(botao.dataset.acao!);
    });
    raiz.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.tela === 'submenu') {
        e.stopPropagation();
        this.menu();
      }
    });
  }

  aoMudarEstado(estado: EstadoJogo): void {
    if (estado === 'menu') this.menu();
    else if (estado === 'pausado') this.pausa();
    else if (estado === 'intro' || estado === 'jogando') this.esconder();
  }

  erro(mensagem: string): void {
    this.mostrar(null, `<section class="painel"><h2>Ops!</h2><p>${esc(mensagem)}</p><p>Recarregue a página para tentar de novo.</p></section>`);
  }

  private executar(acao: string): void {
    switch (acao) {
      case 'jogar': this.acoes.jogar(); break;
      case 'continuar': this.acoes.continuar(); break;
      case 'menu': this.acoes.menu(); break;
      case 'recordes': this.recordes(); break;
      case 'opcoes': this.opcoes(); break;
      case 'creditos': this.creditos(); break;
      case 'voltar': this.menu(); break;
    }
  }

  private mostrar(tela: Interface['tela'], html: string): void {
    this.tela = tela;
    this.raiz.innerHTML = html;
    this.raiz.hidden = false;
    this.raiz.querySelector<HTMLElement>('[autofocus]')?.focus();
  }

  esconder(): void {
    this.tela = null;
    (document.activeElement as HTMLElement | null)?.blur();
    this.raiz.hidden = true;
    this.raiz.innerHTML = '';
  }

  menu(): void {
    const melhor = lerRecordes()[0];
    this.mostrar('menu', `
      <section class="painel menu">
        <h1 class="logo">Type Maniac</h1>
        <p class="lema">Digite as palavras antes que elas toquem o chão.</p>
        <nav class="botoes">
          <button data-acao="jogar" autofocus>Jogar</button>
          <button data-acao="recordes">Recordes</button>
          <button data-acao="opcoes">Opções</button>
          <button data-acao="creditos">Créditos</button>
        </nav>
        <p class="dica">A primeira letra escolhe o alvo · <kbd>Backspace</kbd> solta o alvo · <kbd>Esc</kbd> pausa</p>
        ${melhor ? `<p class="melhor">Recorde: <strong>${numero(melhor.pontos)}</strong> pts · ${esc(melhor.nome)}</p>` : ''}
      </section>`);
  }

  private opcoes(): void {
    const marcado = (b: boolean) => (b ? 'checked' : '');
    this.mostrar('submenu', `
      <section class="painel">
        <h2>Opções</h2>
        <label class="opcao">
          <input type="checkbox" data-opcao="ignorarAcentos" ${marcado(this.config.ignorarAcentos)}>
          <span><strong>Ignorar acentos</strong><small>Aceita "e" no lugar de "é" e "c" no lugar de "ç". Bom para teclados sem acentos.</small></span>
        </label>
        <label class="opcao">
          <input type="checkbox" data-opcao="som" ${marcado(this.config.som)}>
          <span><strong>Som</strong><small>Efeitos sonoros do mago.</small></span>
        </label>
        <label class="opcao">
          <select data-opcao="ondaInicial">
            ${ONDAS_INICIAIS.map((n) => `<option value="${n}" ${n === this.config.ondaInicial ? 'selected' : ''}>Onda ${n}</option>`).join('')}
          </select>
          <span><strong>Começar na onda</strong><small>Já digita rápido? Pule o aquecimento. Palavras e velocidade começam mais difíceis.</small></span>
        </label>
        <nav class="botoes"><button data-acao="voltar" autofocus>Voltar</button></nav>
      </section>`);
    this.raiz.querySelectorAll<HTMLInputElement | HTMLSelectElement>('[data-opcao]').forEach((input) => {
      input.addEventListener('change', () => {
        const valor = input instanceof HTMLSelectElement ? Number(input.value) : input.checked;
        this.config = { ...this.config, [input.dataset.opcao!]: valor };
        salvarConfig(this.config);
        this.acoes.aoMudarConfig(this.config);
      });
    });
  }

  private tabelaRecordes(recordes: readonly Recorde[], destaque?: Recorde): string {
    if (recordes.length === 0) return '<p class="vazio">Nenhum recorde ainda. Jogue uma partida!</p>';
    const linhas = recordes.map((r, i) => `
      <tr class="${r === destaque ? 'destaque' : ''}">
        <td>${i + 1}</td><td class="nome">${esc(r.nome)}</td><td>${numero(r.pontos)}</td>
        <td>${r.onda}</td><td>${r.wpm}</td><td>${pct(r.precisao)}</td>
      </tr>`).join('');
    return `<table class="recordes">
      <thead><tr><th>#</th><th>Nome</th><th>Pontos</th><th>Onda</th><th>PPM</th><th>Prec.</th></tr></thead>
      <tbody>${linhas}</tbody></table>`;
  }

  private recordes(): void {
    this.mostrar('submenu', `
      <section class="painel">
        <h2>Recordes</h2>
        ${this.tabelaRecordes(lerRecordes())}
        <nav class="botoes"><button data-acao="voltar" autofocus>Voltar</button></nav>
      </section>`);
  }

  private creditos(): void {
    this.mostrar('submenu', `
      <section class="painel creditos">
        <h2>Créditos</h2>
        <p>Palavras: <a href="https://github.com/hermitdave/FrequencyWords" target="_blank" rel="noopener">FrequencyWords</a>
          © Hermit Dave (OpenSubtitles 2018), <a href="https://creativecommons.org/licenses/by-sa/4.0/deed.pt-br" target="_blank" rel="noopener">CC BY-SA 4.0</a>,
          filtradas com o dicionário VERO pt_BR via <a href="https://github.com/pythonprobr/palavras" target="_blank" rel="noopener">pythonprobr/palavras</a> (MPL-2.0).</p>
        <p>Dificuldade de cada palavra estimada pelo esforço de digitá-la num teclado ABNT2.</p>
        <p>Fontes: Pixelify Sans e Press Start 2P (SIL Open Font License).</p>
        <p>Código: <a href="https://github.com/riquena969/type-maniac" target="_blank" rel="noopener">github.com/riquena969/type-maniac</a> (MIT).</p>
        <nav class="botoes"><button data-acao="voltar" autofocus>Voltar</button></nav>
      </section>`);
  }

  private pausa(): void {
    this.mostrar('pausa', `
      <section class="painel">
        <h2>Pausado</h2>
        <nav class="botoes">
          <button data-acao="continuar" autofocus>Continuar <kbd>Esc</kbd></button>
          <button data-acao="menu">Sair para o menu</button>
        </nav>
      </section>`);
  }

  mostrarFim(resumo: ResumoPartida): void {
    const recordes = lerRecordes();
    const novoRecorde = entraNoTop(resumo.pontos, recordes);
    const letras = resumo.letrasMaisErradas.length
      ? `<ul class="chips">${resumo.letrasMaisErradas.map((l) => `<li><span>${esc(l.letra)}</span><small>${l.erros}×</small></li>`).join('')}</ul>`
      : '<p class="vazio">Nenhuma letra errada. Impressionante!</p>';

    this.mostrar('fim', `
      <section class="painel fim">
        <h2>Fim de jogo</h2>
        <dl class="stats">
          <div><dt>Pontos</dt><dd>${numero(resumo.pontos)}</dd></div>
          <div><dt>Onda</dt><dd>${resumo.onda}</dd></div>
          <div><dt>PPM</dt><dd>${resumo.wpm}</dd></div>
          <div><dt>Precisão</dt><dd>${pct(resumo.precisao)}</dd></div>
          <div><dt>Maior combo</dt><dd>${resumo.maiorCombo}</dd></div>
          <div><dt>Palavras</dt><dd>${resumo.palavras}</dd></div>
        </dl>
        <h3>Letras para treinar</h3>
        ${letras}
        ${novoRecorde ? `
          <form class="novo-recorde">
            <label for="nome">Novo recorde! Seu nome:</label>
            <input id="nome" name="nome" maxlength="12" autocomplete="nickname" required value="${esc(this.config.nome)}" autofocus>
            <button type="submit">Salvar</button>
          </form>` : ''}
        <nav class="botoes lado-a-lado">
          <button data-acao="jogar" ${novoRecorde ? '' : 'autofocus'}>Jogar de novo</button>
          <button data-acao="menu">Menu</button>
        </nav>
      </section>`);

    const form = this.raiz.querySelector<HTMLFormElement>('form.novo-recorde');
    const input = form?.querySelector<HTMLInputElement>('input');
    input?.select();
    form?.addEventListener('submit', (e) => {
      e.preventDefault();
      const nome = input!.value.trim().slice(0, 12) || 'Mago';
      const recorde: Recorde = {
        nome,
        pontos: resumo.pontos,
        onda: resumo.onda,
        wpm: resumo.wpm,
        precisao: resumo.precisao,
        data: new Date().toISOString(),
      };
      const lista = salvarRecorde(recorde);
      this.config = { ...this.config, nome };
      salvarConfig(this.config);
      this.acoes.aoMudarConfig(this.config);
      const salvo = lista.find((r) => r.data === recorde.data && r.nome === recorde.nome);
      form.outerHTML = this.tabelaRecordes(lista, salvo);
      this.raiz.querySelector<HTMLButtonElement>('button[data-acao="jogar"]')?.focus();
    });
  }
}
