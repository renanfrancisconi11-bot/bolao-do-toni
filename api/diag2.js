const API_TOKEN = "2f31933ee37349bb95799a24a5701b83";

const JOGOS = [
  {id:1,casa:"México",fora:"África do Sul"},
];

const NOMES = {
  "South Africa":"África do Sul","Mexico":"México",
};
const norm=s=>(NOMES[s]||s).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]/g,"");

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin","*");
  try {
    const r = await fetch("https://api.football-data.org/v4/competitions/WC/matches?season=2026",{
      headers:{"X-Auth-Token":API_TOKEN}
    });
    const data = await r.json();
    const finalizados = (data.matches||[]).filter(m=>m.status==="FINISHED");

    const analise = finalizados.map(m=>{
      const apiCasa=m.homeTeam?.name||"";
      const apiFora=m.awayTeam?.name||"";
      const casaNorm=norm(apiCasa);
      const foraNorm=norm(apiFora);
      const j=JOGOS[0];
      const nossoCasa=norm(j.casa);
      const nossoFora=norm(j.fora);
      return {
        api_casa_original: apiCasa,
        api_fora_original: apiFora,
        api_casa_normalizado: casaNorm,
        api_fora_normalizado: foraNorm,
        nosso_casa_normalizado: nossoCasa,
        nosso_fora_normalizado: nossoFora,
        casa_bate: casaNorm===nossoCasa,
        fora_bate: foraNorm===nossoFora,
        tem_no_dicionario_casa: NOMES[apiCasa]!==undefined,
        tem_no_dicionario_fora: NOMES[apiFora]!==undefined,
      };
    });

    return res.status(200).json({
      total_finalizados: finalizados.length,
      analise_match: analise,
    });
  } catch(err){
    return res.status(200).json({erro:err.message});
  }
}
