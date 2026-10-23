// Gera public/words/pt-br.json: palavras pt-BR ordenadas da mais fácil para a mais difícil de digitar.
// Uso: npm run words
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { dificuldadeBruta } from '../src/words/difficulty';
import { PALAVRA_VALIDA } from '../src/words/normalize';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');
const CACHE = join(RAIZ, 'scripts/.cache');
const SAIDA = join(RAIZ, 'public/words/pt-br.json');

const FONTES = {
  frequencia: 'https://raw.githubusercontent.com/hermitdave/FrequencyWords/master/content/2018/pt_br/pt_br_50k.txt',
  // Dicionário Hunspell VERO/LibreOffice bruto: preserva maiúsculas e hífens, que o palavras.txt achata.
  dicionario: 'https://raw.githubusercontent.com/pythonprobr/palavras/master/pt_BR.dic.bz2',
};

// Estrangeirismos aceitos pelo dicionário mas estranhos para treinar português.
const PARECE_ESTRANGEIRA = [
  /[kwy]/,
  /^s[^aeiouáéíóúâêôãõ]/,
  /[^aeiouáéíóúâêôãõlrszmxn]$/,
  /(sh|th|ph|ck|tt|ff|pp|bb|dd|gg|ll|nn|mm|zz)/,
];
const EXCECOES_ESTRANGEIRA = new Set(['sob']);

const TAMANHO_MIN = 3;
const TAMANHO_MAX = 14;
const LIMITE_PALAVRAS = 12000;

async function baixar(nome: string, url: string): Promise<string> {
  const arquivo = join(CACHE, nome);
  if (!existsSync(arquivo)) {
    console.log(`baixando ${url}`);
    const resposta = await fetch(url);
    if (!resposta.ok) throw new Error(`${url}: HTTP ${resposta.status}`);
    await mkdir(CACHE, { recursive: true });
    await writeFile(arquivo, Buffer.from(await resposta.arrayBuffer()));
  }
  return arquivo;
}

/** Palavras do dicionário escritas em minúscula e sem hífen (exclui nomes próprios e pedaços de compostos). */
function lerDicionario(arquivoBz2: string): Set<string> {
  const bruto = execFileSync('bunzip2', ['-c', arquivoBz2], { maxBuffer: 64 * 1024 * 1024 });
  const texto = new TextDecoder('latin1').decode(bruto);
  const palavras = new Set<string>();
  for (const linha of texto.split(/\r?\n/).slice(1)) {
    const palavra = linha.split('/')[0].trim().normalize('NFC');
    if (PALAVRA_VALIDA.test(palavra)) palavras.add(palavra);
  }
  return palavras;
}

async function lerLista(nome: string): Promise<string[]> {
  return (await readFile(join(RAIZ, 'scripts/data', nome), 'utf8'))
    .split('\n')
    .map((l) => l.trim().normalize('NFC'))
    .filter((l) => l && !l.startsWith('#'));
}

async function carregarBloqueio(): Promise<(palavra: string) => boolean> {
  const linhas = await lerLista('bloqueadas.txt');
  const exatas = new Set(linhas.filter((l) => !l.endsWith('*')));
  const prefixos = linhas.filter((l) => l.endsWith('*')).map((l) => l.slice(0, -1));
  return (p) => exatas.has(p) || prefixos.some((pre) => p.startsWith(pre));
}

async function main() {
  const [arquivoFrequencia, arquivoDicionario, bloqueada] = await Promise.all([
    baixar('pt_br_50k.txt', FONTES.frequencia),
    baixar('pt_BR.dic.bz2', FONTES.dicionario),
    carregarBloqueio(),
  ]);
  const curtas = new Set(await lerLista('curtas.txt'));
  const frequencia = await readFile(arquivoFrequencia, 'utf8');
  const dicionario = lerDicionario(arquivoDicionario);
  const estrangeira = (p: string) => !EXCECOES_ESTRANGEIRA.has(p) && PARECE_ESTRANGEIRA.some((r) => r.test(p));

  const candidatas: Array<{ palavra: string; bruta: number }> = [];
  const vistas = new Set<string>();
  const linhas = frequencia.split('\n');
  for (let i = 0; i < linhas.length && candidatas.length < LIMITE_PALAVRAS; i++) {
    const palavra = linhas[i].split(' ')[0]?.trim().normalize('NFC');
    if (!palavra || vistas.has(palavra)) continue;
    vistas.add(palavra);
    const tamanho = [...palavra].length;
    if (tamanho < TAMANHO_MIN || tamanho > TAMANHO_MAX) continue;
    if (tamanho === TAMANHO_MIN && !curtas.has(palavra)) continue;
    if (!PALAVRA_VALIDA.test(palavra) || !dicionario.has(palavra)) continue;
    if (bloqueada(palavra) || estrangeira(palavra)) continue;
    const bruta = dificuldadeBruta(palavra, i + 1);
    if (bruta !== null) candidatas.push({ palavra, bruta });
  }

  candidatas.sort((a, b) => a.bruta - b.bruta || a.palavra.localeCompare(b.palavra, 'pt-BR'));
  const palavras = candidatas.map((c) => c.palavra);

  await mkdir(dirname(SAIDA), { recursive: true });
  await writeFile(
    SAIDA,
    JSON.stringify({
      versao: 1,
      descricao: 'Palavras pt-BR ordenadas da mais fácil para a mais difícil de digitar (ABNT2).',
      licenca: 'CC BY-SA 4.0 — derivado de FrequencyWords (Hermit Dave, OpenSubtitles 2018), filtrado com o dicionário VERO pt_BR via pythonprobr/palavras (MPL-2.0).',
      palavras,
    }) + '\n',
  );

  console.log(`\n${palavras.length} palavras → ${SAIDA}\n`);
  for (let decil = 0; decil < 10; decil++) {
    const ini = Math.floor((decil * palavras.length) / 10);
    const fim = Math.floor(((decil + 1) * palavras.length) / 10);
    const fatia = palavras.slice(ini, fim);
    const media = fatia.reduce((s, p) => s + [...p].length, 0) / fatia.length;
    const amostra = Array.from({ length: 10 }, (_, k) => fatia[Math.floor((k * fatia.length) / 10)]);
    console.log(`decil ${decil + 1} (média ${media.toFixed(1)} letras): ${amostra.join(', ')}`);
  }
}

main().catch((erro) => {
  console.error(erro);
  process.exit(1);
});
