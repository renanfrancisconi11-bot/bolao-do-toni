const API_TOKEN = "2f31933ee37349bb95799a24a5701b83";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin","*");
  try {
    const r = await fetch("https://api.football-data.org/v4/competitions/WC/matches?season=2026",{
      headers:{"X-Auth-Token":API_TOKEN}
    });
    if(!r.ok){
      return res.status(200).json({erro:`API retornou status ${r.status}`, texto: await r.text()});
    }
    const data = await r.json();
    const jogos = data.matches || [];

    const porStatus = {};
    jogos.forEach(j=>{ porStatus[j.status]=(porStatus[j.status]||0)+1; });

    const primeiros = jogos.slice(0,6).map(j=>({
      casa: j.homeTeam?.name,
      fora: j.awayTeam?.name,
      status: j.status,
      dataUTC: j.utcDate,
      placar_casa: j.score?.fullTime?.home,
      placar_fora: j.score?.fullTime?.away,
    }));

    const finalizados = jogos.filter(j=>j.status==="FINISHED").map(j=>({
      casa: j.homeTeam?.name,
      fora: j.awayTeam?.name,
      placar: `${j.score?.fullTime?.home}x${j.score?.fullTime?.away}`,
    }));

    return res.status(200).json({
      horario_agora_UTC: new Date().toISOString(),
      total_jogos: jogos.length,
      jogos_por_status: porStatus,
      jogos_finalizados: finalizados,
      primeiros_6_jogos: primeiros,
      explicacao: "Se o status do 1º jogo não for FINISHED, a API ainda não liberou o resultado (atraso do plano grátis)."
    });
  } catch(err){
    return res.status(200).json({erro:err.message});
  }
}
