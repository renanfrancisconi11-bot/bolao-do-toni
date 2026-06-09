import { JOGOS } from "./jogos";
const NOMES = {
  "Germany":"Alemanha","France":"França","Brazil":"Brasil","England":"Inglaterra",
  "Spain":"Espanha","Netherlands":"Holanda","Belgium":"Bélgica","Uruguay":"Uruguai",
  "Mexico":"México","United States":"Estados Unidos","Canada":"Canadá","Australia":"Austrália",
  "Japan":"Japão","South Korea":"Coreia do Sul","Morocco":"Marrocos","Switzerland":"Suíça",
  "Croatia":"Croácia","Ecuador":"Equador","Ghana":"Gana","Tunisia":"Tunísia","Iran":"Irã",
  "Saudi Arabia":"Arábia Saudita","Qatar":"Catar","South Africa":"África do Sul","Norway":"Noruega",
  "Turkey":"Turquia","Ukraine":"Ucrânia","Colombia":"Colômbia","Paraguay":"Paraguai","Austria":"Áustria",
  "Scotland":"Escócia","New Zealand":"Nova Zelândia","Egypt":"Egito","Iraq":"Iraque","Jordan":"Jordânia",
  "Algeria":"Argélia","DR Congo":"RD Congo","Ivory Coast":"Costa do Marfim","Panama":"Panamá",
  "Uzbekistan":"Uzbequistão","Bosnia and Herzegovina":"Bósnia-Herz.","Haiti":"Haiti","Cape Verde":"Cabo Verde",
};
function norm(s){return (NOMES[s]||s).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]/g,"");}
function encontrarJogo(h,a){const hn=norm(h),an=norm(a);return JOGOS.find(j=>{const c=norm(j.casa),f=norm(j.fora);return (c===hn&&f===an)||((c.includes(hn)||hn.includes(c))&&(f.includes(an)||an.includes(f)));});}
export async function buscarResultadosAPI(){
  try {
    const res=await fetch("/.netlify/functions/resultados");
    if(!res.ok) return null;
    const data=await res.json();
    if(!data.matches?.length) return null;
    const r={};
    data.matches.forEach(m=>{
      if(m.status!=="FINISHED")return;
      const hs=m.score?.fullTime?.home,as=m.score?.fullTime?.away;
      if(hs==null||as==null)return;
      const j=encontrarJogo(m.homeTeam?.name||"",m.awayTeam?.name||"");
      if(j)r[j.id]={casa:String(hs),fora:String(as)};
    });
    return Object.keys(r).length>0?r:null;
  } catch(e){return null;}
}
