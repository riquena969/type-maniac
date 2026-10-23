# Type Maniac

Jogo de digitação em português. Palavras caem do céu; um mago em pixel art lança cada letra que você digita da ponta da varinha até a palavra, e ela estoura quando completa. Deixe uma palavra tocar o chão e você perde uma vida.

**Jogar:** https://riquena969.github.io/type-maniac/

## Como jogar

- Digite a primeira letra de uma palavra para mirar nela (o mago escolhe a mais baixa que começa com aquela letra) e continue digitando até ela estourar.
- `Backspace` solta o alvo, `Esc` pausa.
- Você tem 3 vidas. A cada 5 ondas ganha uma de volta (até 3).
- Acertos seguidos formam combo: 2× a partir de 10, 3× a partir de 25, 4× a partir de 50.
- Onda sem perder vida dá bônus.
- No fim, o jogo mostra seus PPM (palavras por minuto), a precisão e as **letras que você mais errou**, para saber o que treinar.

Em **Opções** dá para ignorar acentos (para teclados sem acento), desligar o som e começar numa onda mais alta.

## Como a dificuldade sobe

Cada onda tem uma meta de PPM, de 15 até 100. A velocidade de queda é calculada para que alguém digitando nessa meta consiga limpar a tela bem a tempo. A cada onda também aumentam:

- a quantidade de palavras e o tamanho dos grupos que caem juntos;
- o tamanho máximo das palavras;
- a faixa de dificuldade das palavras sorteadas: começa nos 15% mais fáceis e vai até as mais difíceis.

### Ranking de dificuldade das palavras

As cerca de 9.700 palavras de `public/words/pt-br.json` estão ordenadas da mais fácil para a mais difícil de digitar. A nota de cada palavra vem de `src/words/difficulty.ts`:

- **Esforço no teclado ABNT2:** cada tecla custa conforme o dedo (indicador < médio < anelar < mínimo) e a fileira (central < superior < inferior). Teclas fora da posição de descanso custam um pouco mais.
- **Transições:**
  - repetir o mesmo dedo em teclas diferentes pesa bastante;
  - continuar na mesma mão pesa pouco;
  - alternar as mãos não pesa;
  - saltar da fileira de cima para a de baixo com a mesma mão pesa extra.
- **Acentos:** contam as teclas reais do ABNT2. `é` = `´` + `e`, `ã` = `~` + `a`, `â` = Shift + `~` + `a`; `ç` é uma tecla só.
- **Letras pouco usadas** em português (`k`, `w`, `y`, `x`, `z`) somam um extra.
- **Familiaridade:** palavras raras (pela frequência em legendas de filmes) são mais difíceis de ler e antecipar.

Para regerar a lista, que baixa as fontes e imprime amostras de cada decil para revisão:

```bash
npm run words
```

Palavras ofensivas, nomes e estrangeirismos que escapam dos filtros vão em `scripts/data/bloqueadas.txt`. As de 3 letras só entram se estiverem em `scripts/data/curtas.txt`.

## Desenvolvimento

```bash
npm install
npm run dev      # http://localhost:5173/type-maniac/
npm test         # testes (Vitest), incluindo simulações de partidas com robôs digitando
npm run build    # gera dist/
```

Stack: TypeScript, Vite e Canvas 2D, sem engine. Sprites e cenário são desenhados por código e os sons são sintetizados com WebAudio. Todo push na `main` publica no GitHub Pages pelo workflow `.github/workflows/deploy.yml`.

## Créditos e licenças

- **Código:** MIT. Veja `LICENSE`.
- **Lista de palavras:** CC BY-SA 4.0. É derivada do [FrequencyWords](https://github.com/hermitdave/FrequencyWords) (© Hermit Dave, OpenSubtitles 2018) e filtrada com o dicionário VERO pt_BR via [pythonprobr/palavras](https://github.com/pythonprobr/palavras) (MPL-2.0). Veja `public/words/LICENSE.txt`.
- **Fontes:** [Pixelify Sans](https://fonts.google.com/specimen/Pixelify+Sans) e [Press Start 2P](https://fonts.google.com/specimen/Press+Start+2P), ambas sob a SIL Open Font License.
