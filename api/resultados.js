const API_TOKEN = "2f31933ee37349bb95799a24a5701b83";
const SUPABASE_URL = "https://roeccnuucpdmzzntvkxu.supabase.co";
const SUPABASE_KEY = "sb_publishable_4AC2R5FnzG0E6F-kivQU_g_6FsLNlrq";

// Confrontos da fase de grupos (corrigidos) para casar com a API football-data
const JOGOS = [
  {id:1,casa:"México",fora:"África do Sul"},{id:2,casa:"Coreia do Sul",fora:"Rep. Tcheca"},
  {id:3,casa:"Canadá",fora:"Bósnia-Herz."},{id:4,casa:"Estados Unidos",fora:"Paraguai"},
  {id:5,casa:"Catar",fora:"Suíça"},{id:6,casa:"Brasil",fora:"Marrocos"},
  {id:7,casa:"Haiti",fora:"Escócia"},{id:8,casa:"Austrália",fora:"Turquia"},
  {id:9,casa:"Alemanha",fora:"Curaçao"},{id:10,casa:"Costa do Marfim",fora:"Equador"},
  {id:11,casa:"Holanda",fora:"Japão"},{id:12,casa:"Suécia",fora:"Tunísia"},
  {id:13,casa:"Espanha",fora:"Cabo Verde"},{id:14,casa:"Arábia Saudita",fora:"Uruguai"},
  {id:15,casa:"Bélgica",fora:"Egito"},{id:16,casa:"Irã",fora:"Nova Zelândia"},
  {id:17,casa:"Argentina",fora:"Argélia"},{id:18,casa:"França",fora:"Senegal"},
  {id:19,casa:"Iraque",fora:"Noruega"},{id:20,casa:"Áustria",fora:"Jordânia"},
  {id:21,casa:"Portugal",fora:"RD Congo"},{id:22,casa:"Inglaterra",fora:"Croácia"},
  {id:23,casa:"Gana",fora:"Panamá"},{id:24,casa:"Uzbequistão",fora:"Colômbia"},
  {id:25,casa:"Rep. Tcheca",fora:"África do Sul"},{id:26,casa:"Suíça",fora:"Bósnia-Herz."},
  {id:27,casa:"Canadá",fora:"Catar"},{id:28,casa:"México",fora:"Coreia do Sul"},
  {id:29,casa:"Turquia",fora:"Paraguai"},{id:30,casa:"Estados Unidos",fora:"Austrália"},
  {id:31,casa:"Escócia",fora:"Marrocos"},{id:32,casa:"Brasil",fora:"Haiti"},
  {id:33,casa:"Tunísia",fora:"Japão"},{id:34,casa:"Holanda",fora:"Suécia"},
  {id:35,casa:"Alemanha",fora:"Costa do Marfim"},{id:36,casa:"Equador",fora:"Curaçao"},
  {id:37,casa:"Espanha",fora:"Arábia Saudita"},{id:38,casa:"Bélgica",fora:"Irã"},
  {id:39,casa:"Uruguai",fora:"Cabo Verde"},{id:40,casa:"Nova Zelândia",fora:"Egito"},
  {id:41,casa:"Argentina",fora:"Áustria"},{id:42,casa:"França",fora:"Iraque"},
  {id:43,casa:"Noruega",fora:"Senegal"},{id:44,casa:"Jordânia",fora:"Argélia"},
  {id:45,casa:"Portugal",fora:"Uzbequistão"},{id:46,casa:"Inglaterra",fora:"Gana"},
  {id:47,casa:"Panamá",fora:"Croácia"},{id:48,casa:"Colômbia",fora:"RD Congo"},
  {id:49,casa:"Suíça",fora:"Canadá"},{id:50,casa:"Bósnia-Herz.",fora:"Catar"},
  {id:51,casa:"Escócia",fora:"Brasil"},{id:52,casa:"Marrocos",fora:"Haiti"},
  {id:53,casa:"Rep. Tcheca",fora:"México"},{id:54,casa:"África do Sul",fora:"Coreia do Sul"},
  {id:55,casa:"Equador",fora:"Alemanha"},{id:56,casa:"Curaçao",fora:"Costa do Marfim"},
  {id:57,casa:"Japão",fora:"Suécia"},{id:58,casa:"Tunísia",fora:"Holanda"},
  {id:59,casa:"Turquia",fora:"Estados Unidos"},{id:60,casa:"Paraguai",fora:"Austrália"},
  {id:61,casa:"Noruega",fora:"França"},{id:62,casa:"Senegal",fora:"Iraque"},
  {id:63,casa:"Cabo Verde",fora:"Arábia Saudita"},{id:64,casa:"Uruguai",fora:"Espanha"},
  {id:65,casa:"Egito",fora:"Irã"},{id:66,casa:"Nova Zelândia",fora:"Bélgica"},
  {id:67,casa:"Panamá",fora:"Inglaterra"},{id:68,casa:"Croácia",fora:"Gana"},
  {id:69,casa:"Colômbia",fora:"Portugal"},{id:70,casa:"RD Congo",fora:"Uzbequistão"},
  {id:71,casa:"Argélia",fora:"Áustria"},{id:72,casa:"Jordânia",fora:"Argentina"},
];

const NOMES = {
  "Germany":"Alemanha","France":"França","Brazil":"Brasil","England":"Inglaterra",
  "Spain":"Espanha","Netherlands":"Holanda","Belgium":"Bélgica","Uruguay":"Uruguai",
  "Mexico":"México","United States":"Estados Unidos","Canada":"Canadá","Australia":"Austrália",
  "Japan":"Japão","South Korea":"Coreia do Sul","Morocco":"Marrocos","Switzerland":"Suíça",
  "Croatia":"Croácia","Ecuador":"Equador","Ghana":"Gana","Tunisia":"Tunísia","Iran":"Irã",
  "Saudi Arabia":"Arábia Saudita","Qatar":"Catar","South Africa":"África do Sul","Norway":"Noruega",
  "Turkey":"Turquia","Sweden":"Suécia","Colombia":"Colômbia","Paraguay":"Paraguai","Austria":"Áustria",
  "Scotland":"Escócia","New Zealand":"Nova Zelândia","Egypt":"Egito","Iraq":"Iraque","Jordan":"Jordânia",
  "Algeria":"Argélia","DR Congo":"RD Congo","Ivory Coast":"Costa do Marfim","Panama":"Panamá",
  "Uzbekistan":"Uzbequistão","Bosnia and Herzegovina":"Bósnia-Herz.","Haiti":"Haiti","Cape Verde":"Cabo Verde",
  "Czech Republic":"Rep. Tcheca","Curaçao":"Curaçao",
};
const norm=s=>(NOMES[s]||s).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]/g,"");
function achar(h,a){const hn=norm(h),an=norm(a);return JOGOS.find(j=>{const c=norm(j.casa),f=norm(j.fora);return (c===hn&&f===an)||((c.includes(hn)||hn.includes(c))&&(f.includes(an)||an.includes(f)));});}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin","*");
  try {
    const apiRes = await fetch("https://api.football-data.org/v4/competitions/WC/matches?season=2026",{
      headers:{"X-Auth-Token":API_TOKEN}
    });
    if(!apiRes.ok){
      return res.status(200).json({ok:false,motivo:`API retornou ${apiRes.status}`,gravados:0});
    }
    const data = await apiRes.json();
    if(!data.matches?.length){
      return res.status(200).json({ok:true,motivo:"Nenhum jogo finalizado ainda",gravados:0});
    }
    const paraGravar=[];
    data.matches.forEach(m=>{
      if(m.status!=="FINISHED")return;
      const hs=m.score?.fullTime?.home,as=m.score?.fullTime?.away;
      if(hs==null||as==null)return;
      const jogo=achar(m.homeTeam?.name||"",m.awayTeam?.name||"");
      if(jogo)paraGravar.push({jogo_id:jogo.id,casa:String(hs),fora:String(as),updated_at:new Date().toISOString()});
    });
    if(paraGravar.length===0){
      return res.status(200).json({ok:true,motivo:"Nenhum jogo casou com o bolão",gravados:0});
    }
    const sbRes = await fetch(`${SUPABASE_URL}/rest/v1/resultados`,{
      method:"POST",
      headers:{"apikey":SUPABASE_KEY,"Authorization":`Bearer ${SUPABASE_KEY}`,"Content-Type":"application/json","Prefer":"resolution=merge-duplicates"},
      body:JSON.stringify(paraGravar)
    });
    if(!sbRes.ok){
      const txt=await sbRes.text();
      return res.status(200).json({ok:false,motivo:"Erro ao gravar no banco: "+txt,gravados:0});
    }
    return res.status(200).json({ok:true,gravados:paraGravar.length,resultados:paraGravar});
  } catch(err){
    return res.status(200).json({ok:false,motivo:err.message,gravados:0});
  }
}
