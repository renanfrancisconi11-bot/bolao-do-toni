// ============================================================
// LEITOR DA PLANILHA Buteco_do_Toni.xlsx
// Le o arquivo e devolve um objeto pronto pro site.
// O site NAO recalcula pontos: so espelha o que esta na planilha.
// ============================================================

// Quantos destaques cada ano tinha por semana (o formato mudou ao longo do tempo)
const SLOTS_POR_ANO = {
  2018: ["1º", "2º", "3º"],
  2019: ["1º", "2º", "3º"],
  2020: ["1º", "2º", "3º", "Separou"],
  2021: ["1º", "2º", "3º", "Abacaxi", "Separou"],
  2022: ["1º", "2º", "3º", "Abacaxi", "Separou"],
};
const SLOTS_PADRAO = ["1º", "2º", "3º", "Abacaxi", "Separou"];

const txt = (v) => (v === null || v === undefined ? "" : String(v).trim());
const norm = (v) =>
  txt(v)
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
const num = (v) => {
  if (typeof v === "number") return v;
  const s = txt(v).replace(/\./g, "").replace(",", ".");
  const n = parseFloat(s);
  return isNaN(n) ? null : n;
};

// Converte data do Excel (numero serial ou Date) pra "dd/mm/aaaa"
function dataBR(v) {
  if (!v && v !== 0) return "";
  let d = null;
  if (v instanceof Date) d = v;
  else if (typeof v === "number" && v > 20000 && v < 80000) {
    d = new Date(Date.UTC(1899, 11, 30 + Math.floor(v)));
  } else {
    const s = txt(v);
    if (/^\d{4}-\d{2}-\d{2}/.test(s)) d = new Date(s + (s.length === 10 ? "T00:00:00Z" : "Z"));
    else return s;
  }
  if (!d || isNaN(d.getTime())) return txt(v);
  const p = (n) => String(n).padStart(2, "0");
  return `${p(d.getUTCDate())}/${p(d.getUTCMonth() + 1)}/${d.getUTCFullYear()}`;
}

// Localiza a primeira celula cujo texto normalizado bate com o alvo
function achar(grade, alvo) {
  const a = norm(alvo);
  for (let r = 0; r < grade.length; r++) {
    const linha = grade[r] || [];
    for (let c = 0; c < linha.length; c++) {
      if (norm(linha[c]) === a) return { r, c };
    }
  }
  return null;
}

const celula = (grade, r, c) => ((grade[r] || [])[c] ?? null);

// ------------------------------------------------------------
// RANKING (Toni Ballon'Dor)
// ------------------------------------------------------------
function lerRanking(grade) {
  // Acha a linha de cabecalho: a que tem "Pontos" e "Nome" nas primeiras colunas
  let hr = -1;
  for (let r = 0; r < Math.min(grade.length, 12); r++) {
    const linha = (grade[r] || []).slice(0, 8).map(norm);
    if (linha.includes("PONTOS") && linha.includes("NOME")) { hr = r; break; }
  }
  if (hr < 0) return [];

  const head = (grade[hr] || []).slice(0, 8).map(norm);
  const col = {
    pos: head.indexOf("POSICAO"),
    pts: head.indexOf("PONTOS"),
    nome: head.indexOf("NOME"),
    scouts: head.indexOf("SCOUTS"),
    jogos: head.indexOf("JOGOS"),
  };

  const out = [];
  for (let r = hr + 1; r < grade.length; r++) {
    const nome = txt(celula(grade, r, col.nome));
    const pts = num(celula(grade, r, col.pts));
    if (!nome) {
      // duas linhas seguidas sem nome = fim da tabela
      if (!txt(celula(grade, r + 1, col.nome))) break;
      continue;
    }
    out.push({
      pos: out.length + 1,
      nome,
      pontos: pts === null ? 0 : pts,
      scouts: col.scouts >= 0 ? txt(celula(grade, r, col.scouts)) : "",
      jogos: col.jogos >= 0 ? num(celula(grade, r, col.jogos)) : null,
    });
  }
  return out;
}

// ------------------------------------------------------------
// ARTILHARIA e MENOS VAZADO (blocos laterais, so existem de 2024 em diante)
// ------------------------------------------------------------
function lerBlocoLateral(grade, tituloBloco) {
  const t = achar(grade, tituloBloco);
  if (!t) return [];

  const hr = t.r + 1;
  const head = (grade[hr] || []).map(norm);
  const cGols = head.indexOf("GOLS", t.c);
  const cNome = head.indexOf("NOME", t.c);
  if (cGols < 0 || cNome < 0) return [];
  const cJogos = head.indexOf("JOGOS", t.c);
  const cMedia = head.indexOf("MEDIA", t.c);

  const out = [];
  for (let r = hr + 1; r < grade.length; r++) {
    const nome = txt(celula(grade, r, cNome));
    if (!nome) {
      if (!txt(celula(grade, r + 1, cNome))) break;
      continue;
    }
    const media = cMedia >= 0 ? num(celula(grade, r, cMedia)) : null;
    out.push({
      pos: out.length + 1,
      nome,
      gols: num(celula(grade, r, cGols)) ?? 0,
      jogos: cJogos >= 0 ? num(celula(grade, r, cJogos)) : null,
      media: media === null ? null : Math.round(media * 100) / 100,
    });
  }
  return out;
}

// ------------------------------------------------------------
// SEMANAS (grade de destaques: 1o, 2o, 3o, Abacaxi, Separou)
// ------------------------------------------------------------
function lerSemanas(grade, ano) {
  const slots = SLOTS_POR_ANO[ano] || SLOTS_PADRAO;
  const achados = [];

  for (let r = 0; r < grade.length; r++) {
    const linha = grade[r] || [];
    for (let c = 0; c < linha.length; c++) {
      const m = /^SEMANA\s*(\d+)$/.exec(norm(linha[c]));
      if (m) achados.push({ r, c, n: parseInt(m[1], 10) });
    }
  }

  const semanas = achados.map(({ r, c, n }) => {
    const destaques = slots
      .map((rotulo, i) => ({ rotulo, nome: txt(celula(grade, r + 2 + i, c)) }))
      .filter((d) => d.nome);
    return { numero: n, data: dataBR(celula(grade, r + 1, c)), destaques };
  });

  semanas.sort((a, b) => a.numero - b.numero);
  // So devolve semanas que ja aconteceram (tem pelo menos um destaque)
  return semanas.filter((s) => s.destaques.length > 0);
}

// ------------------------------------------------------------
// FINANCEIRO (abas "Mensalidades AAAA")
// ------------------------------------------------------------
const MESES = ["JANEIRO","FEVEREIRO","MARCO","ABRIL","MAIO","JUNHO","JULHO","AGOSTO","SETEMBRO","OUTUBRO","NOVEMBRO","DEZEMBRO"];

function lerFinanceiro(grade) {
  const h = achar(grade, "Nome");
  if (!h) return null;
  const hr = h.r;
  const head = (grade[hr] || []).map(norm);

  const colsMes = [];
  head.forEach((v, i) => { if (MESES.includes(v) && i > h.c) colsMes.push({ i, rotulo: txt((grade[hr] || [])[i]) }); });

  const cCred = head.indexOf("CREDITO");
  const cDeb = head.indexOf("DEBITO");
  const cCaixa = head.indexOf("EM CAIXA");

  const pessoas = [];
  for (let r = hr + 1; r < grade.length; r++) {
    const nome = txt(celula(grade, r, h.c));
    if (!nome) { if (!txt(celula(grade, r + 1, h.c))) break; continue; }
    const pagamentos = colsMes.map((m) => ({ rotulo: m.rotulo, valor: num(celula(grade, r, m.i)), marca: txt(celula(grade, r, m.i)) }));
    pessoas.push({ nome, pagamentos, total: pagamentos.reduce((s, p) => s + (p.valor || 0), 0) });
  }

  const movs = (colValor, colDesc) => {
    if (colValor < 0) return [];
    const l = [];
    for (let r = hr + 1; r < grade.length; r++) {
      const v = num(celula(grade, r, colValor));
      const d = txt(celula(grade, r, colDesc));
      if (v === null && !d) continue;
      l.push({ valor: v, descricao: d });
    }
    return l;
  };

  let emCaixa = null;
  if (cCaixa >= 0) {
    for (let r = hr + 1; r < grade.length; r++) {
      const v = num(celula(grade, r, cCaixa));
      if (v !== null) { emCaixa = v; break; }
    }
  }

  const creditos = movs(cCred, cCred + 1);
  const debitos = movs(cDeb, cDeb + 1);

  const totalCreditos = creditos.reduce((s, x) => s + (x.valor || 0), 0);
  const totalDebitos = debitos.reduce((s, x) => s + (x.valor || 0), 0);
  const somaPagamentos = pessoas.reduce((s, p) => s + p.total, 0);

  const conferencia = [];
  const dif = Math.round((somaPagamentos - totalCreditos) * 100) / 100;
  if (Math.abs(dif) >= 0.01) {
    conferencia.push(
      `A soma do que cada um pagou (${somaPagamentos.toFixed(2)}) não bate com o CRÉDITO da planilha ` +
      `(${totalCreditos.toFixed(2)}). Diferença de ${dif.toFixed(2)}. ` +
      `Costuma ser a fórmula do CRÉDITO com o intervalo curto demais, deixando linhas de fora.`
    );
  }
  const caixaCalc = Math.round((totalCreditos - totalDebitos) * 100) / 100;
  if (emCaixa !== null && Math.abs(caixaCalc - emCaixa) >= 0.01) {
    conferencia.push(`EM CAIXA da planilha é ${emCaixa.toFixed(2)}, mas crédito menos débito dá ${caixaCalc.toFixed(2)}.`);
  }

  return {
    colunasPagamento: colsMes.map((m) => m.rotulo),
    pessoas,
    creditos,
    debitos,
    emCaixa,
    totalCreditos,
    totalDebitos,
    somaPagamentos,
    conferencia,
  };
}

// ------------------------------------------------------------
// UNIFORMES (bloco "Numero / Nome / Camisa / Calcao")
// ------------------------------------------------------------
function lerUniformes(grade) {
  const h = achar(grade, "Número") || achar(grade, "Numero");
  if (!h) return { jogadores: [], estoque: [] };
  const hr = h.r;
  const head = (grade[hr] || []).map(norm);

  const cNome = head.indexOf("NOME", h.c + 1);
  const cCam = head.indexOf("CAMISA", h.c);
  const cCal = head.indexOf("CALCAO", h.c);

  const jogadores = [];
  for (let r = hr + 1; r < grade.length; r++) {
    const nome = cNome >= 0 ? txt(celula(grade, r, cNome)) : "";
    if (!nome) { if (!txt(celula(grade, r + 1, cNome))) break; continue; }
    const n = num(celula(grade, r, h.c));
    jogadores.push({
      numero: n === null ? txt(celula(grade, r, h.c)) : String(n),
      nome,
      camisa: cCam >= 0 ? txt(celula(grade, r, cCam)) : "",
      calcao: cCal >= 0 ? txt(celula(grade, r, cCal)) : "",
    });
  }

  const estoque = [];
  head.forEach((v, i) => {
    if (/^(CAMISAS?|CALCOES|CALCAO)\s/.test(v)) {
      const itens = [];
      for (let r = hr + 1; r < grade.length; r++) {
        const s = txt(celula(grade, r, i));
        if (!s) { if (!txt(celula(grade, r + 1, i))) break; continue; }
        itens.push(s);
      }
      if (itens.length) estoque.push({ titulo: txt((grade[hr] || [])[i]), itens });
    }
  });

  return { jogadores, estoque };
}

// ------------------------------------------------------------
// FUNCAO PRINCIPAL
// ------------------------------------------------------------
export function lerPlanilha(workbook, XLSX) {
  const grades = {};
  workbook.SheetNames.forEach((n) => {
    grades[n] = XLSX.utils.sheet_to_json(workbook.Sheets[n], {
      header: 1, defval: null, raw: true, blankrows: true,
    });
  });

  const anos = {};
  const avisos = [];

  workbook.SheetNames.forEach((nome) => {
    const m = /^(\d{4})\s*AWARDS$/i.exec(nome.trim());
    if (!m) return;
    const ano = parseInt(m[1], 10);
    const g = grades[nome];

    const ranking = lerRanking(g);
    if (!ranking.length) { avisos.push(`Aba "${nome}": não achei o ranking (procuro as colunas Pontos e Nome).`); return; }

    anos[ano] = {
      ano,
      aba: nome,
      ranking,
      artilharia: lerBlocoLateral(g, "ARTILHARIA"),
      menosVazado: lerBlocoLateral(g, "MENOS VAZADO"),
      semanas: lerSemanas(g, ano),
    };
  });

  // Financeiro + uniformes: pega a aba de mensalidades do ano mais recente
  const abasMens = workbook.SheetNames
    .filter((n) => /mensalidade/i.test(n))
    .sort((a, b) => (parseInt((b.match(/\d{4}/) || [0])[0], 10) - parseInt((a.match(/\d{4}/) || [0])[0], 10)));

  const financeiro = {};
  abasMens.forEach((nome) => {
    const ano = parseInt((nome.match(/\d{4}/) || [0])[0], 10);
    const f = lerFinanceiro(grades[nome]);
    if (f) financeiro[ano] = { ...f, aba: nome };
    else avisos.push(`Aba "${nome}": não achei a coluna Nome, pulei o financeiro.`);
  });

  const uniformes = abasMens.length ? lerUniformes(grades[abasMens[0]]) : { jogadores: [], estoque: [] };

  // Hall da Fama: campeao (e top 3) de cada ano
  const hallDaFama = Object.values(anos)
    .sort((a, b) => b.ano - a.ano)
    .map((a) => ({ ano: a.ano, podio: a.ranking.slice(0, 3).map((p) => ({ nome: p.nome, pontos: p.pontos })) }))
    .filter((h) => h.podio.length > 0);

  const anosDetalhados = Object.values(anos)
    .filter((a) => a.artilharia.length > 0 || a.menosVazado.length > 0)
    .map((a) => a.ano)
    .sort((a, b) => b - a);

  if (!Object.keys(anos).length) avisos.push('Nenhuma aba no formato "AAAA AWARDS" foi encontrada.');

  return {
    versao: 1,
    importadoEm: new Date().toISOString(),
    anos,
    anosDetalhados,
    hallDaFama,
    uniformes,
    financeiro,
    avisos,
  };
}

export const _internos = { lerRanking, lerBlocoLateral, lerSemanas, lerFinanceiro, lerUniformes, dataBR };
