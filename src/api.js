import { JOGOS } from "./jogos";

// Mapa de nomes da API (inglês) → nomes do bolão (português)
const NOMES = {
  "Germany":"Alemanha","Argentina":"Argentina","France":"França",
  "Brazil":"Brasil","England":"Inglaterra","Spain":"Espanha",
  "Portugal":"Portugal","Netherlands":"Holanda","Belgium":"Bélgica",
  "Uruguay":"Uruguai","Mexico":"México","United States":"Estados Unidos",
  "Canada":"Canadá","Australia":"Austrália","Japan":"Japão",
  "South Korea":"Coreia do Sul","Morocco":"Marrocos","Senegal":"Senegal",
  "Switzerland":"Suíça","Croatia":"Croácia","Ecuador":"Equador",
  "Ghana":"Gana","Tunisia":"Tunísia","Iran":"Irã",
  "Saudi Arabia":"Arábia Saudita","Qatar":"Catar",
  "South Africa":"África do Sul","Norway":"Noruega","Turkey":"Turquia",
  "Ukraine":"Ucrânia","Colombia":"Colômbia","Paraguay":"Paraguai",
  "Austria":"Áustria","Scotland":"Escócia","New Zealand":"Nova Zelândia",
  "Egypt":"Egito","Iraq":"Iraque","Jordan":"Jordânia","Algeria":"Argélia",
  "DR Congo":"RD Congo","Ivory Coast":"Costa do Marfim","Panama":"Panamá",
  "Uzbekistan":"Uzbequistão","Bosnia and Herzegovina":"Bósnia-Herz.",
  "Haiti":"Haiti","Cape Verde":"Cabo Verde","Curaçao":"Curaçao",
  "Serbia":"Sérvia","Poland":"Polônia","Denmark":"Dinamarca",
  "Costa Rica":"Costa Rica","Venezuela":"Venezuela","Honduras":"Honduras",
};

function norm(s) {
  return (NOMES[s] || s)
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g,"")
    .replace(/[^a-z0-9]/g,"");
}

function encontrarJogo(homeApi, awayApi) {
  const h = norm(homeApi), a = norm(awayApi);
  return JOGOS.find(j => {
    const c = norm(j.casa), f = norm(j.fora);
    return (c===h&&f===a)||(c===a&&f===h)||
           ((c.includes(h)||h.includes(c))&&(f.includes(a)||a.includes(f)));
  });
}

export async function buscarResultadosAPI() {
  try {
    // Chama a função serverless do Netlify (evita CORS)
    const url = "/.netlify/functions/resultados";
    const res = await fetch(url);

    if (!res.ok) {
      console.warn("Função serverless retornou erro:", res.status);
      return null;
    }

    const data = await res.json();
    if (!data.matches?.length) return null;

    const resultados = {};
    data.matches.forEach(m => {
      if (m.status !== "FINISHED") return;
      const homeScore = m.score?.fullTime?.home;
      const awayScore = m.score?.fullTime?.away;
      if (homeScore == null || awayScore == null) return;
      const jogo = encontrarJogo(
        m.homeTeam?.name || m.homeTeam?.shortName || "",
        m.awayTeam?.name || m.awayTeam?.shortName || ""
      );
      if (jogo) resultados[jogo.id] = { casa: String(homeScore), fora: String(awayScore) };
    });

    return Object.keys(resultados).length > 0 ? resultados : null;
  } catch(err) {
    console.warn("Erro ao buscar resultados:", err);
    return null;
  }
}
