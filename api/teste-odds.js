const API_TOKEN = "2f31933ee37349bb95799a24a5701b83";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin","*");
  try {
    const wc = await fetch("https://api.football-data.org/v4/competitions/WC/matches?season=2026",{
      headers:{"X-Auth-Token":API_TOKEN}
    });
    const wcData = wc.ok ? await wc.json() : null;

    let exemploJogo = null;
    let temCampoOdds = false;
    let valorOdds = null;
    if(wcData?.matches?.length){
      const j = wcData.matches[0];
      exemploJogo = {
        casa: j.homeTeam?.name,
        fora: j.awayTeam?.name,
        status: j.status,
        data: j.utcDate,
        odds: j.odds,
      };
      temCampoOdds = j.odds !== undefined && j.odds !== null;
      valorOdds = j.odds;
    }

    const pl = await fetch("https://api.football-data.org/v4/competitions/PL/matches?status=FINISHED",{
      headers:{"X-Auth-Token":API_TOKEN}
    });
    const plData = pl.ok ? await pl.json() : null;
    let exemploPL = null;
    if(plData?.matches?.length){
      const j = plData.matches[plData.matches.length-1];
      exemploPL = {
        casa: j.homeTeam?.name,
        fora: j.awayTeam?.name,
        status: j.status,
        odds: j.odds,
        temOdds: j.odds !== undefined && j.odds !== null,
      };
    }

    return res.status(200).json({
      copa2026: {
        conectou: wc.ok,
        totalJogos: wcData?.matches?.length || 0,
        exemploJogo,
        TEM_CAMPO_ODDS: temCampoOdds,
        valorDasOdds: valorOdds,
      },
      premierLeague_teste: {
        conectou: pl.ok,
        exemplo: exemploPL,
      },
      conclusao: temCampoOdds
        ? "✅ A API RETORNA ODDS! Valor: "+JSON.stringify(valorOdds)
        : "⚠️ Campo odds veio vazio/nulo (pode ser plano grátis sem odds, ou odds só aparecem perto do jogo)"
    });
  } catch(err){
    return res.status(200).json({erro:err.message});
  }
}
