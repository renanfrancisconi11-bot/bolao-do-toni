import { useState, useEffect, useRef } from "react";
import logo from "./logo.png";
import { PARTICIPANTES as PB, SENHAS as SB, JOGOS, MULTIPLICADORES, calcularPontos, podeApostar, tempoRestante } from "./jogos";
import { salvarPalpiteDB, carregarPalpitesDB, salvarResultadoDB, carregarResultadosDB, salvarSenhaDB, carregarSenhasDB, resetarSenhaDB, carregarExtrasDB, adicionarExtraDB, removerExtraDB, supabase } from "./supabase";
import "./App.css";

const K_SES="bolao_session",K_ADM="bolao_admin",K_EXT="bolao_extra_participantes";
const ADMIN_PWD="bdt2026admin";
const load=(k,d)=>{try{return JSON.parse(localStorage.getItem(k))??d;}catch{return d;}};
const getParts=(extras)=>[...PB,...(extras||[]).map(x=>x.nome)];
const icon=r=>({Grupos:"⚽","16-avos":"🎯",Oitavas:"⚡",Quartas:"🔥",Semifinal:"💥","3º Lugar":"🥉",Final:"🏆"}[r]||"⚽");

function getRanking(pal,res,extras){
  return getParts(extras).map(nome=>{
    let total=0,exatos=0,acertos=0,palpitou=0;
    JOGOS.forEach(j=>{
      const p=pal[nome]?.[j.id];
      // conta se fez palpite válido neste jogo
      if(p&&p.casa!==""&&p.fora!=="")palpitou++;
      const r=res[j.id];
      if(!p||!r)return;
      const pts=calcularPontos(p.casa,p.fora,r.casa,r.fora,j.rodada);
      if(pts===null)return;
      total+=pts;const m=MULTIPLICADORES[j.rodada]||1;
      if(pts===3*m)exatos++;if(pts>0)acertos++;
    });
    return {nome,total,exatos,acertos,palpitou};
  })
  .filter(x=>x.palpitou>0) // só quem fez ao menos 1 palpite aparece
  .sort((a,b)=>b.total-a.total||b.exatos-a.exatos||a.nome.localeCompare(b.nome));
}

function Header({view,setView,participante}){
  return (<header className="header"><div className="header-inner">
    <div className="logo" onClick={()=>setView("home")}>
      <img src={logo} alt="BDT" className="logo-img"/>
      <div><span className="logo-text">BOLÃO DO TONI</span><span className="logo-sub">COPA DO MUNDO 2026</span></div>
    </div>
    <nav className="nav">
      <button className={`nav-btn ${view==="ranking"?"active":""}`} onClick={()=>setView("ranking")}>Ranking</button>
      {participante&&<button className={`nav-btn ${view==="palpites"?"active":""}`} onClick={()=>setView("palpites")}>Palpites</button>}
      <button className={`nav-btn nav-btn-user ${participante?"logged":""}`} onClick={()=>setView("login")}>{participante?`👤 ${participante.split(" ")[0]}`:"Entrar"}</button>
    </nav>
  </div></header>);
}

function Hero({setView,ranking,extras}){
  const top3=ranking.slice(0,3),total=getParts(extras).length;
  return (<section className="hero">
    <div className="hero-bg"><div className="hero-orb hero-orb-1"/><div className="hero-orb hero-orb-2"/><div className="hero-grid"/></div>
    <div className="hero-content">
      <div className="hero-badge">🇧🇷 🇺🇸 🇨🇦 🇲🇽 · 11 JUN – 19 JUL 2026</div>
      <h1 className="hero-title">BOLÃO<br/><span className="hero-title-accent">DO TONI</span><br/><span className="hero-title-blue">2026</span></h1>
      <p className="hero-sub">{total} participantes · 104 jogos · palpite até 1h antes de cada jogo</p>
      <div className="hero-actions">
        <button className="btn-primary" onClick={()=>setView("ranking")}>Ver Ranking</button>
        <button className="btn-secondary" onClick={()=>setView("login")}>Fazer Palpites</button>
      </div>
    </div>
    {top3.length>0&&top3[0].total>0&&<div className="hero-podium"><div className="podium-label">Liderando agora</div>
      {top3.map((p,i)=><div key={p.nome} className="podium-item"><span className="podium-medal">{["🥇","🥈","🥉"][i]}</span><span className="podium-name">{p.nome.split(" ")[0]}</span><span className="podium-pts">{p.total}pts</span></div>)}
    </div>}
  </section>);
}

function LoginView({setParticipante,setView,participante,senhasDB,extras}){
  const [sel,setSel]=useState(""),[sen,setSen]=useState(""),[err,setErr]=useState("");
  const go=()=>{
    if(!sel){setErr("Selecione seu nome.");return;}
    if(!sen){setErr("Digite sua senha.");return;}
    let ok=false;
    if(senhasDB[sel]) ok=senhasDB[sel]===sen;
    else { const e=(extras||[]).find(x=>x.nome===sel); ok=e?e.senha===sen:SB[sel]===sen; }
    if(!ok){setErr("Senha incorreta! Fale com o Toni.");return;}
    localStorage.setItem(K_SES,JSON.stringify({nome:sel}));
    setParticipante(sel);setView("palpites");
  };
  const out=()=>{localStorage.removeItem(K_SES);setParticipante(null);setView("home");};
  return (<div className="view-container"><div className="card login-card">
    <img src={logo} alt="BDT" className="login-logo"/>
    <h2 className="card-title">Entrar no Bolão</h2>
    <p className="card-sub">Selecione seu nome e digite sua senha</p>
    <select className="select-input" value={sel} onChange={e=>{setSel(e.target.value);setErr("");}}>
      <option value="">— Selecione seu nome —</option>{getParts(extras).map(n=><option key={n} value={n}>{n}</option>)}
    </select>
    <input className="select-input" type="password" placeholder="Sua senha" value={sen} onChange={e=>{setSen(e.target.value);setErr("");}} onKeyDown={e=>e.key==="Enter"&&go()}/>
    {err&&<p className="error-msg">⚠️ {err}</p>}
    <button className="btn-primary btn-full" onClick={go} disabled={!sel||!sen}>Entrar →</button>
    {participante&&<button className="btn-ghost btn-full" onClick={out}>Sair ({participante.split(" ")[0]})</button>}
    <p className="senha-hint">Senha padrão = número da camisa · <span className="link-trocar" onClick={()=>setView("trocar-senha")}>Trocar senha</span></p>
  </div></div>);
}

function TrocarSenha({setView,participante,senhasDB,setSenhasDB,extras}){
  const [sel,setSel]=useState(participante||""),[atual,setAtual]=useState(""),[nova,setNova]=useState(""),[conf,setConf]=useState(""),[err,setErr]=useState(""),[ok,setOk]=useState(false);
  const go=async()=>{
    if(!sel){setErr("Selecione seu nome.");return;}
    let senhaOk=false;
    if(senhasDB[sel]) senhaOk=senhasDB[sel]===atual;
    else { const e=(extras||[]).find(x=>x.nome===sel); senhaOk=e?e.senha===atual:SB[sel]===atual; }
    if(!senhaOk){setErr("Senha atual incorreta!");return;}
    if(nova.length<3){setErr("Mínimo 3 caracteres.");return;}
    if(nova!==conf){setErr("As senhas não coincidem.");return;}
    const saved=await salvarSenhaDB(sel,nova);
    if(!saved){setErr("Erro ao salvar. Tente novamente.");return;}
    setSenhasDB(prev=>({...prev,[sel]:nova}));
    setOk(true);setTimeout(()=>setView("login"),2500);
  };
  if(ok)return (<div className="view-container"><div className="card login-card"><div className="card-icon">✅</div><h2 className="card-title">Senha alterada!</h2><p className="card-sub">Redirecionando...</p></div></div>);
  return (<div className="view-container"><div className="card login-card">
    <img src={logo} alt="BDT" className="login-logo"/>
    <h2 className="card-title">🔑 Trocar Senha</h2>
    <p className="card-sub">Escolha uma senha pessoal para proteger sua conta</p>
    <select className="select-input" value={sel} onChange={e=>{setSel(e.target.value);setErr("");}}>
      <option value="">— Selecione seu nome —</option>{getParts(extras).map(n=><option key={n} value={n}>{n}</option>)}
    </select>
    <input className="select-input" type="password" placeholder="Senha atual (número da camisa)" value={atual} onChange={e=>{setAtual(e.target.value);setErr("");}}/>
    <div className="divider-line"/>
    <input className="select-input" type="password" placeholder="Nova senha (mínimo 3 caracteres)" value={nova} onChange={e=>{setNova(e.target.value);setErr("");}}/>
    <input className="select-input" type="password" placeholder="Confirmar nova senha" value={conf} onChange={e=>{setConf(e.target.value);setErr("");}} onKeyDown={e=>e.key==="Enter"&&go()}/>
    {err&&<p className="error-msg">⚠️ {err}</p>}
    <button className="btn-primary btn-full" onClick={go} disabled={!sel||!atual||!nova||!conf}>Salvar nova senha</button>
    <button className="btn-ghost btn-full" onClick={()=>setView("login")}>← Voltar</button>
  </div></div>);
}

function RankingView({ranking,resultados,carregando}){
  const ap=Object.keys(resultados).length;
  return (<div className="view-container">
    <div className="section-header"><div><h2 className="section-title">🏅 Ranking Geral</h2><p className="section-sub">{carregando?"Carregando...":`Atualizado em tempo real · ${ap} jogos apurados`}</p></div><span className="section-badge">{ap} jogos apurados</span></div>
    <div className="ranking-table"><div className="ranking-header"><span>Pos</span><span>Participante</span><span>Pts</span><span className="hide-mobile">Exatos</span><span className="hide-mobile">Acertos</span></div>
      {ranking.map((p,i)=><div key={p.nome} className={`ranking-row rank-${i<3?i+1:"rest"}`}><span className="rank-pos">{i===0?"🥇":i===1?"🥈":i===2?"🥉":i+1}</span><span className="rank-name">{p.nome}</span><span className="rank-pts">{p.total}</span><span className="rank-extra hide-mobile">{p.exatos}</span><span className="rank-extra hide-mobile">{p.acertos}</span></div>)}
    </div>
    <div className="pontuacao-legenda"><h3>Sistema de Pontuação</h3><div className="legenda-grid">
      {Object.entries(MULTIPLICADORES).map(([f,m])=><div key={f} className="legenda-item"><span className="legenda-fase">{icon(f)} {f}</span><span className="legenda-pts"><span className="pts-exact">{3*m}pts</span> exato · <span className="pts-saldo">{2*m}pts</span> saldo · <span className="pts-winner">{1*m}pts</span> vencedor</span></div>)}
    </div></div>
  </div>);
}

function PalpitesView({participante,palpites,setPalpites,resultados,isAdmin,setResultados,setView,senhasDB}){
  const rodadasUnicas=[...new Set(JOGOS.map(j=>j.rodada))];
  const [rf,setRf]=useState("Grupos"),[salvando,setSalvando]=useState({}),[verPalpites,setVerPalpites]=useState({});
  const temCustom=!!senhasDB[participante];
  const my=palpites[participante]||{};
  const tot=JOGOS.filter(j=>{const p=my[j.id];return p&&p.casa!==""&&p.fora!=="";}).length;
  const timers=useRef({});
  const palRef=useRef(palpites); palRef.current=palpites;
  const resRef=useRef(resultados); resRef.current=resultados;
  const hp=(id,c,v,h)=>{
    if(!podeApostar(h))return;
    const vv=v.replace(/[^0-9]/g,"").slice(0,2);
    setPalpites(p=>({...p,[participante]:{...p[participante],[id]:{...p[participante]?.[id],[c]:vv}}}));
    clearTimeout(timers.current[id]);
    timers.current[id]=setTimeout(async()=>{
      const cur=palRef.current[participante]?.[id]||{casa:"",fora:""};
      // Só salva se AMBOS os campos estiverem preenchidos
      if(cur.casa===""||cur.fora===""){
        setSalvando(s=>({...s,[id]:"incompleto"}));
        setTimeout(()=>setSalvando(s=>{const n={...s};delete n[id];return n;}),2500);
        return;
      }
      setSalvando(s=>({...s,[id]:"salvando"}));
      const ok=await salvarPalpiteDB(participante,id,cur.casa,cur.fora);
      setSalvando(s=>({...s,[id]:ok?"ok":"erro"}));
      setTimeout(()=>setSalvando(s=>{const n={...s};delete n[id];return n;}),1500);
    },800);
  };
  const hr=(id,c,v)=>{
    const vv=v.replace(/[^0-9]/g,"").slice(0,2);
    setResultados(p=>({...p,[id]:{...p[id],[c]:vv}}));
    clearTimeout(timers.current["r"+id]);
    timers.current["r"+id]=setTimeout(()=>{
      const cur=resRef.current[id]||{casa:"",fora:""};
      salvarResultadoDB(id,cur.casa??"",cur.fora??"");
    },800);
  };
  return (<div className="view-container">
    <div className="section-header"><div><h2 className="section-title">🎯 Palpites</h2><p className="section-sub">{participante} · {tot}/{JOGOS.length} preenchidos · salva automático</p></div>
      <div className="header-actions">{!temCustom&&<button className="btn-trocar-senha" onClick={()=>setView("trocar-senha")}>🔑 Criar senha</button>}</div>
    </div>
    {!temCustom&&<div className="aviso-senha">🔒 <strong>Crie sua senha pessoal!</strong> Qualquer um que saiba seu número de camisa pode acessar sua conta.<button className="aviso-btn" onClick={()=>setView("trocar-senha")}>Criar senha agora →</button></div>}
    <div className="progress-bar"><div className="progress-fill" style={{width:`${(tot/JOGOS.length)*100}%`}}/></div>
    <div className="rodada-tabs">{rodadasUnicas.map(r=><button key={r} className={`rodada-tab ${rf===r?"active":""}`} onClick={()=>setRf(r)}>{icon(r)} {r}</button>)}</div>
    <div className="jogos-list">
      {JOGOS.filter(j=>j.rodada===rf).map(j=>{
        const p=my[j.id]||{casa:"",fora:""},r=resultados[j.id];
        const pts=r?calcularPontos(p.casa,p.fora,r.casa,r.fora,j.rodada):null;
        const pode=podeApostar(j.hora),tempo=tempoRestante(j.hora),preen=p.casa!==""&&p.fora!=="";
        const st=salvando[j.id];
        return (<div key={j.id} className={`jogo-card ${preen?"filled":""} ${!pode?"locked":""} ${pts!==null?`result-${pts>0?"hit":"miss"}`:""}`}>
          <div className="jogo-meta"><span className="jogo-data">{j.data}{j.hora?` · ${j.hora.slice(11,16)}h`:""}</span><span className="jogo-grupo">{j.grupo}</span>
            {!pode&&!r&&<span className="jogo-locked">🔒 Encerrado</span>}{pode&&tempo&&<span className="jogo-tempo">⏱ {tempo}</span>}
            {st==="salvando"&&<span className="jogo-tempo">💾...</span>}{st==="ok"&&<span className="jogo-resultado-badge">✓ salvo</span>}{st==="incompleto"&&<span className="jogo-incompleto">⚠️ preencha os 2 placares</span>}
            {r&&<span className="jogo-resultado-badge">✅ {r.casa}×{r.fora}</span>}{pts!==null&&<span className={`jogo-pts ${pts>0?"pts-pos":"pts-zero"}`}>{pts>0?`+${pts}`:0} pts</span>}
          </div>
          <div className="jogo-body"><span className="jogo-time jogo-casa">{j.casa}</span>
            <div className="jogo-placar">
              <input className="placar-input" type="text" inputMode="numeric" maxLength={2} value={p.casa} onChange={e=>hp(j.id,"casa",e.target.value,j.hora)} placeholder="–" disabled={!pode}/>
              <span className="placar-x">×</span>
              <input className="placar-input" type="text" inputMode="numeric" maxLength={2} value={p.fora} onChange={e=>hp(j.id,"fora",e.target.value,j.hora)} placeholder="–" disabled={!pode}/>
            </div><span className="jogo-time jogo-fora">{j.fora}</span>
          </div>
          {isAdmin&&<div className="jogo-resultado-admin"><span className="admin-label">⚙️ Resultado oficial:</span>
            <input className="placar-input placar-admin" type="text" inputMode="numeric" maxLength={2} value={r?.casa??""} onChange={e=>hr(j.id,"casa",e.target.value)} placeholder="–"/>
            <span className="placar-x">×</span>
            <input className="placar-input placar-admin" type="text" inputMode="numeric" maxLength={2} value={r?.fora??""} onChange={e=>hr(j.id,"fora",e.target.value)} placeholder="–"/>
          </div>}
          {!pode&&(()=>{
            // Jogo travado: mostra palpites de todos (dropdown)
            const lista=Object.keys(palpites)
              .map(nome=>{
                const pp=palpites[nome]?.[j.id];
                if(!pp||pp.casa===""||pp.fora==="")return null;
                const ptsP=r?calcularPontos(pp.casa,pp.fora,r.casa,r.fora,j.rodada):null;
                return {nome,casa:pp.casa,fora:pp.fora,pts:ptsP};
              })
              .filter(Boolean)
              .sort((a,b)=>(b.pts??-1)-(a.pts??-1)||a.nome.localeCompare(b.nome));
            const aberto=!!verPalpites[j.id];
            return (<div className="palpites-todos">
              <button className="btn-ver-palpites" onClick={()=>setVerPalpites(v=>({...v,[j.id]:!v[j.id]}))}>
                👥 {aberto?"Esconder":"Ver"} palpites de todos ({lista.length})
              </button>
              {aberto&&<div className="palpites-lista">
                {lista.length===0&&<div className="palpite-linha vazio">Ninguém palpitou neste jogo.</div>}
                {lista.map(x=>(<div key={x.nome} className={`palpite-linha ${x.nome===participante?"meu":""}`}>
                  <span className="palpite-nome">{x.nome}</span>
                  <span className="palpite-placar">{x.casa}×{x.fora}</span>
                  {x.pts!==null&&<span className={`palpite-pts ${x.pts>0?"pos":"zero"}`}>{x.pts>0?`+${x.pts}`:0}</span>}
                </div>))}
              </div>}
            </div>);
          })()}
        </div>);
      })}
    </div>
  </div>);
}

function AdminPanel({setView,senhasDB,setSenhasDB,extras,setExtras}){
  const [nome,setNome]=useState(""),[senha,setSenha]=useState(""),[err,setErr]=useState(""),[ok,setOk]=useState("");
  const todos=getParts(extras);
  const add=async()=>{
    const n=nome.trim(),s=senha.trim();
    if(!n){setErr("Digite o nome.");return;}
    if(!s){setErr("Digite a senha.");return;}
    if(todos.includes(n)){setErr("Esse nome já existe!");return;}
    const okDb=await adicionarExtraDB(n,s);
    if(!okDb){setErr("Erro ao salvar no banco. Tente de novo.");return;}
    setExtras(prev=>[...prev,{nome:n,senha:s}]);
    setNome("");setSenha("");setErr("");setOk(`✅ ${n} adicionado! Agora aparece para todos.`);setTimeout(()=>setOk(""),3000);
  };
  const rm=async n=>{
    if(!window.confirm(`Remover ${n}?`))return;
    const okDb=await removerExtraDB(n);
    if(!okDb){setOk("❌ Erro ao remover. Tente de novo.");setTimeout(()=>setOk(""),3000);return;}
    setExtras(prev=>prev.filter(e=>e.nome!==n));
  };
  const reset=async n=>{
    if(!window.confirm(`Resetar senha de ${n}? Vai voltar para a senha padrão (número da camisa).`))return;
    const ok=await resetarSenhaDB(n);
    if(ok){setSenhasDB(prev=>{const next={...prev};delete next[n];return next;});setOk(`🔑 Senha de ${n.split(" ")[0]} resetada!`);}
    else setOk("❌ Erro ao resetar. Tente de novo.");
    setTimeout(()=>setOk(""),3000);
  };
  return (<div className="view-container">
    <div className="section-header"><h2 className="section-title">⚙️ Painel Admin</h2><button className="btn-ghost" onClick={()=>setView("ranking")}>← Voltar</button></div>
    {ok&&<div className="sucesso-banner">{ok}</div>}
    <div className="admin-card"><h3 className="admin-card-title">➕ Adicionar Participante</h3><div className="admin-form">
      <input className="select-input" type="text" placeholder="Nome completo" value={nome} onChange={e=>{setNome(e.target.value);setErr("");}}/>
      <input className="select-input" type="text" placeholder="Senha inicial" value={senha} onChange={e=>{setSenha(e.target.value);setErr("");}} onKeyDown={e=>e.key==="Enter"&&add()}/>
      {err&&<p className="error-msg">⚠️ {err}</p>}
      <button className="btn-primary" onClick={add}>Adicionar</button>
    </div></div>
    {extras.length>0&&<div className="admin-card"><h3 className="admin-card-title">👥 Participantes Adicionados</h3><div className="admin-lista">
      {extras.map(e=><div key={e.nome} className="admin-item"><span className="admin-item-nome">{e.nome}</span><span className="admin-item-senha">senha: {e.senha}</span><button className="admin-item-btn" onClick={()=>rm(e.nome)}>🗑️ Remover</button></div>)}
    </div></div>}
    <div className="admin-card">
      <h3 className="admin-card-title">🔑 Gerenciar Senhas</h3>
      <p className="admin-card-sub">Reseta a senha de qualquer participante para o padrão (número da camisa). Funciona de qualquer dispositivo!</p>
      <div className="admin-lista">
        {todos.map(n=>{
          const temCustom=!!senhasDB[n];
          return (<div key={n} className="admin-item">
            <span className="admin-item-nome">{n}</span>
            <span className={`admin-item-status ${temCustom?"custom":"padrao"}`}>{temCustom?"🔒 senha custom":"🔓 senha padrão"}</span>
            {temCustom&&<button className="admin-item-btn reset" onClick={()=>reset(n)}>↺ Resetar</button>}
          </div>);
        })}
      </div>
    </div>
  </div>);
}

function AdminLogin({setIsAdmin,setView}){
  const [pwd,setPwd]=useState(""),[err,setErr]=useState(false);
  const go=()=>{if(pwd===ADMIN_PWD){localStorage.setItem(K_ADM,"true");setIsAdmin(true);setView("admin-panel");}else{setErr(true);setTimeout(()=>setErr(false),2000);}};
  return (<div className="view-container"><div className="card login-card"><div className="card-icon">⚙️</div><h2 className="card-title">Área do Organizador</h2>
    <input className="select-input" type="password" placeholder="Senha do organizador" value={pwd} onChange={e=>setPwd(e.target.value)} onKeyDown={e=>e.key==="Enter"&&go()}/>
    {err&&<p className="error-msg">Senha incorreta</p>}<button className="btn-primary btn-full" onClick={go}>Entrar</button>
  </div></div>);
}

export default function App(){
  const [view,setView]=useState("home");
  const [participante,setParticipante]=useState(()=>load(K_SES,null)?.nome||null);
  const [palpites,setPalpites]=useState({});
  const [resultados,setResultados]=useState({});
  const [senhasDB,setSenhasDB]=useState({});
  const [extras,setExtras]=useState([]);
  const [carregando,setCarregando]=useState(true);
  const [isAdmin,setIsAdmin]=useState(()=>localStorage.getItem(K_ADM)==="true");
  const [showAdmin,setShowAdmin]=useState(false);
  const [clicks,setClicks]=useState(0);
  const ranking=getRanking(palpites,resultados,extras);

  useEffect(()=>{
    let ativo=true;
    async function carregar(){
      const [pal,res,sen,ext]=await Promise.all([carregarPalpitesDB(),carregarResultadosDB(),carregarSenhasDB(),carregarExtrasDB()]);
      if(ativo){setPalpites(pal);setResultados(res);setSenhasDB(sen);setExtras(ext);setCarregando(false);}
    }
    async function buscarAuto(){try{await fetch("/api/resultados");}catch(e){}}
    carregar();
    buscarAuto();
    const ch=supabase.channel("bolao-changes")
      .on("postgres_changes",{event:"*",schema:"public",table:"palpites"},()=>carregar())
      .on("postgres_changes",{event:"*",schema:"public",table:"resultados"},()=>carregar())
      .on("postgres_changes",{event:"*",schema:"public",table:"senhas"},()=>carregar())
      .on("postgres_changes",{event:"*",schema:"public",table:"participantes_extras"},()=>carregar())
      .subscribe();
    const intv=setInterval(carregar,30000);
    const intvApi=setInterval(buscarAuto,3*60*1000);
    return()=>{ativo=false;clearInterval(intv);clearInterval(intvApi);supabase.removeChannel(ch);};
  },[]);

  const logoClick=()=>{const n=clicks+1;setClicks(n);if(n>=5){setShowAdmin(true);setClicks(0);}setTimeout(()=>setClicks(0),3000);};
  if(showAdmin)return (<><Header view="admin" setView={()=>setShowAdmin(false)} participante={participante}/><AdminLogin setIsAdmin={setIsAdmin} setView={v=>{setShowAdmin(false);setView(v);}}/></>);
  return (<div className="app">
    <Header view={view} setView={setView} participante={participante}/>
    <main className="main">
      {view==="home"&&<Hero setView={setView} ranking={ranking} extras={extras}/>}
      {view==="login"&&<LoginView setParticipante={setParticipante} setView={setView} participante={participante} senhasDB={senhasDB} extras={extras}/>}
      {view==="trocar-senha"&&<TrocarSenha setView={setView} participante={participante} senhasDB={senhasDB} setSenhasDB={setSenhasDB} extras={extras}/>}
      {view==="ranking"&&<RankingView ranking={ranking} resultados={resultados} carregando={carregando}/>}
      {view==="admin-panel"&&isAdmin&&<AdminPanel setView={setView} senhasDB={senhasDB} setSenhasDB={setSenhasDB} extras={extras} setExtras={setExtras}/>}
      {(view==="palpites"&&participante)&&<PalpitesView participante={participante} palpites={palpites} setPalpites={setPalpites} resultados={resultados} isAdmin={isAdmin} setResultados={setResultados} setView={setView} senhasDB={senhasDB}/>}
      {(view==="palpites"&&!participante)&&<LoginView setParticipante={setParticipante} setView={setView} participante={participante} senhasDB={senhasDB} extras={extras}/>}
    </main>
    <footer className="footer">
      <span>Bolão do Toni · Copa 2026 {isAdmin&&<><span className="admin-badge" onClick={()=>setView("admin-panel")}>⚙️ Painel Admin</span><span className="admin-badge" style={{marginLeft:6}} onClick={()=>{localStorage.removeItem(K_ADM);setIsAdmin(false);}}>Sair</span></>}</span>
      <span onClick={logoClick} style={{cursor:"default",userSelect:"none"}}>🏆</span>
    </footer>
  </div>);
}
