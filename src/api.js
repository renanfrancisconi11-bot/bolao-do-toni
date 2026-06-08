import { JOGOS } from "./jogos";

const API_TOKEN = "2f31933ee37349bb95799a24a5701b83";

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
  "New Zealand":"Nova Zelândia","Bosnia-Herzegovina":"Bósnia-Herz.",
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
           (c.includes(h)||h.includes(c))&&(f.includes(a)||a.includes(f));
  });
}

export async function buscarResultadosAPI() {
  try {
    // Copa do Mundo 2026 — competition code WC, season 2026
    const url = "https://api.football-data.org/v4/competitions/WC/matches?season=2026&status=FINISHED";
    const res = await fetch(url, {
      headers: { "X-Auth-Token": API_TOKEN }
    });

    if (!res.ok) {
      console.warn("API erro:", res.status, await res.text());
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
        m.homeTeam.name || m.homeTeam.shortName || "",
        m.awayTeam.name || m.awayTeam.shortName || ""
      );
      if (jogo) resultados[jogo.id] = { casa: String(homeScore), fora: String(awayScore) };
    });

    return Object.keys(resultados).length > 0 ? resultados : null;
  } catch(err) {
    console.warn("Erro API:", err);
    return null;
  }
}
