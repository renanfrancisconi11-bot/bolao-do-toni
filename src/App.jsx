import { useState, useEffect, useCallback } from "react";
import logo from "./logo.png";
import { PARTICIPANTES as PB, SENHAS as SB, JOGOS, MULTIPLICADORES, calcularPontos, podeApostar, tempoRestante } from "./jogos";
import { buscarResultadosAPI } from "./api";
import "./App.css";

const K_PAL="bolao_palpites",K_RES="bolao_resultados",K_SES="bolao_session",K_ADM="bolao_admin",K_FET="bolao_last_fetch",K_SEN="bolao_minhas_senhas",K_EXT="bolao_extra_participantes";
const ADMIN_PWD="bdt2026admin",FETCH_INT=5*60*1000;

const load=(k,d)=>{try{return JSON.parse(localStorage.getItem(k))??d;}catch{return d;}};
const getParts=()=>{const e=load(K_EXT,[]);return [...PB,...e.map(x=>x.nome)];};
function verSenha(nome,s){const c=load(K_SEN,{});if(c[nome])return c[nome]===s;const e=load(K_EXT,[]).find(x=>x.nome===nome);if(e)return e.senha===s;return SB[nome]===s;}
const icon=r=>({Grupos:"⚽",Oitavas:"⚡",Quartas:"🔥",Semifinal:"💥","3º Lugar":"🥉",Final:"🏆"}[r]||"⚽");

function getRanking(pal,res){
  return getParts().map(nome=>{
    let total=0,exatos=0,acertos=0;
    JOGOS.forEach(j=>{
      const p=pal[nome]?.[j.id],r=res[j.id];
      if(!p||!r)return;
      const pts=calcularPontos(p.casa,p.fora,r.casa,r.fora,j.rodada);
      if(pts===null)return;
      total+=pts;const m=MULTIPLICADORES[j.rodada]||1;
      if(pts===3*m)exatos++;if(pts>0)acertos++;
    });
    return {nome,total,exatos,acertos};
  }).sort((a,b)=>b.total-a.total||b.exatos-a.exatos||a.nome.localeCompare(b.nome));
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

function Hero({setView,ranking}){
  const top3=ranking.slice(0,3),total=getParts().length;
  return (<section className="hero">
    <div className="hero-bg"><div className="hero-orb hero-orb-1"/><div className="hero-orb hero-orb-2"/><div className="hero-grid"/></div>
    <div className="hero-content">
      <div className="hero-badge">🇧🇷 🇺🇸 🇨🇦 🇲🇽 · 11 JUN – 19 JUL 2026</div>
      <h1 className="hero-title">BOLÃO<br/><span className="hero-title-accent">DO TONI</span><br/><span className="hero-title-blue">2026</span></h1>
      <p className="hero-sub">{total} participantes · 102 jogos · palpite até 1h antes de cada jogo</p>
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

function LoginView({setParticipante,setView,participante}){
  const [sel,setSel]=useState(""),[sen,setSen]=useState(""),[err,setErr]=useState("");
  const go=()=>{if(!sel){setErr("Selecione seu nome.");return;}if(!sen){setErr("Digite sua senha.");return;}if(!verSenha(sel,sen)){setErr("Senha incorreta! Fale com o Toni.");return;}localStorage.setItem(K_SES,JSON.stringify({nome:sel}));setParticipante(sel);setView("palpites");};
  const out=()=>{localStorage.removeItem(K_SES);setParticipante(null);setView("home");};
  return (<div className="view-container"><div className="card login-card">
    <img src={logo} alt="BDT" className="login-logo"/>
    <h2 className="card-title">Entrar no Bolão</h2>
    <p className="card-sub">Selecione seu nome e digite sua senha</p>
    <select className="select-input" value={sel} onChange={e=>{setSel(e.target.value);setErr("");}}>
      <option value="">— Selecione seu nome —</option>{getParts().map(n=><option key={n} value={n}>{n}</option>)}
    </select>
    <input className="select-input" type="password" placeholder="Sua senha" value={sen} onChange={e=>{setSen(e.target.value);setErr("");}} onKeyDown={e=>e.key==="Enter"&&go()}/>
    {err&&<p className="error-msg">⚠️ {err}</p>}
    <button className="btn-primary btn-full" onClick={go} disabled={!sel||!sen}>Entrar →</button>
    {participante&&<button className="btn-ghost btn-full" onClick={out}>Sair ({participante.split(" ")[0]})</button>}
    <p className="senha-hint">Senha padrão = número da camisa · <span className="link-trocar" onClick={()=>setView("trocar-senha")}>Trocar senha</span></p>
  </div></div>);
}

function TrocarSenha({setView}){
  const [sel,setSel]=useState(""),[atual,setAtual]=useState(""),[nova,setNova]=useState(""),[conf,setConf]=useState(""),[err,setErr]=useState(""),[ok,setOk]=useState(false);
  const go=()=>{if(!sel){setErr("Selecione seu nome.");return;}if(!verSenha(sel,atual)){setErr("Senha atual incorreta!");return;}if(nova.length<3){setErr("Mínimo 3 caracteres.");return;}if(nova!==conf){setErr("As senhas não coincidem.");return;}const c=load(K_SEN,{});c[sel]=nova;localStorage.setItem(K_SEN,JSON.stringify(c));setOk(true);setTimeout(()=>setView("login"),2500);};
  if(ok)return (<div className="view-container"><div className="card login-card"><div className="card-icon">✅</div><h2 className="card-title">Senha alterada!</h2><p className="card-sub">Redirecionando...</p></div></div>);
  return (<div className="view-container"><div className="card login-card">
    <img src={logo} alt="BDT" className="login-logo"/>
    <h2 className="card-title">🔑 Trocar Senha</h2>
    <p className="card-sub">Escolha uma senha pessoal para proteger sua conta</p>
    <select className="select-input" value={sel} onChange={e=>{setSel(e.target.value);setErr("");}}><option value="">— Selecione seu nome —</option>{getParts().map(n=><option key={n} value={n}>{n}</option>)}</select>
    <input className="select-input" type="password" placeholder="Senha atual (número da camisa)" value={atual} onChange={e=>{setAtual(e.target.value);setErr("");}}/>
    <div className="divider-line"/>
    <input className="select-input" type="password" placeholder="Nova senha (mínimo 3 caracteres)" value={nova} onChange={e=>{setNova(e.target.value);setErr("");}}/>
    <input className="select-input" type="password" placeholder="Confirmar nova senha" value={conf} onChange={e=>{setConf(e.target.value);setErr("");}} onKeyDown={e=>e.key==="Enter"&&go()}/>
    {err&&<p className="error-msg">⚠️ {err}</p>}
    <button className="btn-primary btn-full" onClick={go} disabled={!sel||!atual||!nova||!conf}>Salvar nova senha</button>
    <button className="btn-ghost btn-full" onClick={()=>setView("login")}>← Voltar</button>
  </div></div>);
}

function RankingView({ranking,resultados,ultima}){
  const ap=Object.keys(resultados).length;
  return (<div className="view-container">
    <div className="section-header"><div><h2 className="section-title">🏅 Ranking</h2>{ultima&&<p className="section-sub">Atualizado às {ultima} · {ap} jogos apurados</p>}</div><span className="section-badge">{ap} jogos apurados</span></div>
    <div className="ranking-table"><div className="ranking-header"><span>Pos</span><span>Participante</span><span>Pts</span><span className="hide-mobile">Exatos</span><span className="hide-mobile">Acertos</span></div>
      {ranking.map((p,i)=><div key={p.nome} className={`ranking-row rank-${i<3?i+1:"rest"}`}><span className="rank-pos">{i===0?"🥇":i===1?"🥈":i===2?"🥉":i+1}</span><span className="rank-name">{p.nome}</span><span className="rank-pts">{p.total}</span><span className="rank-extra hide-mobile">{p.exatos}</span><span className="rank-extra hide-mobile">{p.acertos}</span></div>)}
    </div>
    <div className="pontuacao-legenda"><h3>Sistema de Pontuação</h3><div className="legenda-grid">
      {Object.entries(MULTIPLICADORES).map(([f,m])=><div key={f} className="legenda-item"><span className="legenda-fase">{icon(f)} {f}</span><span className="legenda-pts"><span className="pts-exact">{3*m}pts</span> exato · <span className="pts-saldo">{2*m}pts</span> saldo · <span className="pts-winner">{1*m}pts</span> vencedor</span></div>)}
    </div></div>
  </div>);
}

function PalpitesView({participante,palpites,setPalpites,resultados,isAdmin,setResultados,setView}){
  const [rf,setRf]=useState("Grupos"),[saved,setSaved]=useState(false);
  const temCustom=!!load(K_SEN,{})[participante];
  const rodadas=[...new Set(JOGOS.map(j=>j.rodada))];
  const jogos=JOGOS.filter(j=>j.rodada===rf);
  const my=palpites[participante]||{};
  const tot=JOGOS.filter(j=>{const p=my[j.id];return p&&p.casa!==""&&p.fora!=="";}).length;
  const hp=(id,c,v,h)=>{if(!podeApostar(h))return;const vv=v.replace(/[^0-9]/g,"").slice(0,2);setPalpites(p=>{const n={...p,[participante]:{...p[participante],[id]:{...p[participante]?.[id],[c]:vv}}};localStorage.setItem(K_PAL,JSON.stringify(n));return n;});setSaved(false);};
  const hr=(id,c,v)=>{const vv=v.replace(/[^0-9]/g,"").slice(0,2);setResultados(p=>{const n={...p,[id]:{...p[id],[c]:vv}};localStorage.setItem(K_RES,JSON.stringify(n));return n;});};
  const salvar=()=>{localStorage.setItem(K_PAL,JSON.stringify(palpites));setSaved(true);setTimeout(()=>setSaved(false),3000);};
  return (<div className="view-container">
    <div className="section-header"><div><h2 className="section-title">🎯 Palpites</h2><p className="section-sub">{participante} · {tot}/{JOGOS.length} preenchidos</p></div>
      <div className="header-actions">{!temCustom&&<button className="btn-trocar-senha" onClick={()=>setView("trocar-senha")}>🔑 Criar senha</button>}<button className={`btn-save ${saved?"saved":""}`} onClick={salvar}>{saved?"✓ Salvo!":"💾 Salvar"}</button></div>
    </div>
    {!temCustom&&<div className="aviso-senha">🔒 <strong>Crie sua senha pessoal!</strong> Qualquer um que saiba seu número de camisa pode acessar sua conta.<button className="aviso-btn" onClick={()=>setView("trocar-senha")}>Criar senha agora →</button></div>}
    <div className="progress-bar"><div className="progress-fill" style={{width:`${(tot/JOGOS.length)*100}%`}}/></div>
    <div className="rodada-tabs">{rodadas.map(r=><button key={r} className={`rodada-tab ${rf===r?"active":""}`} onClick={()=>setRf(r)}>{icon(r)} {r}</button>)}</div>
    <div className="jogos-list">
      {jogos.map(j=>{
        const p=my[j.id]||{casa:"",fora:""},r=resultados[j.id];
        const pts=r?calcularPontos(p.casa,p.fora,r.casa,r.fora,j.rodada):null;
        const pode=podeApostar(j.hora),tempo=tempoRestante(j.hora),preen=p.casa!==""&&p.fora!=="";
        return (<div key={j.id} className={`jogo-card ${preen?"filled":""} ${!pode?"locked":""} ${pts!==null?`result-${pts>0?"hit":"miss"}`:""}`}>
          <div className="jogo-meta"><span className="jogo-data">{j.data}{j.hora?` · ${j.hora.slice(11,16)}h`:""}</span><span className="jogo-grupo">{j.grupo}</span>
            {!pode&&!r&&<span className="jogo-locked">🔒 Encerrado</span>}{pode&&tempo&&<span className="jogo-tempo">⏱ {tempo}</span>}
            {r&&<span className="jogo-resultado-badge">✅ {r.casa}×{r.fora}</span>}{pts!==null&&<span className={`jogo-pts ${pts>0?"pts-pos":"pts-zero"}`}>{pts>0?`+${pts}`:0} pts</span>}
          </div>
          <div className="jogo-body"><span className="jogo-time jogo-casa">{j.casa}</span>
            <div className="jogo-placar">
              <input className="placar-input" type="text" inputMode="numeric" maxLength={2} value={p.casa} onChange={e=>hp(j.id,"casa",e.target.value,j.hora)} placeholder="–" disabled={!pode}/>
              <span className="placar-x">×</span>
              <input className="placar-input" type="text" inputMode="numeric" maxLength={2} value={p.fora} onChange={e=>hp(j.id,"fora",e.target.value,j.hora)} placeholder="–" disabled={!pode}/>
            </div>
            <span className="jogo-time jogo-fora">{j.fora}</span>
          </div>
          {isAdmin&&<div className="jogo-resultado-admin"><span className="admin-label">⚙️ Manual:</span>
            <input className="placar-input placar-admin" type="text" inputMode="numeric" maxLength={2} value={r?.casa??""} onChange={e=>hr(j.id,"casa",e.target.value)} placeholder="–"/>
            <span className="placar-x">×</span>
            <input className="placar-input placar-admin" type="text" inputMode="numeric" maxLength={2} value={r?.fora??""} onChange={e=>hr(j.id,"fora",e.target.value)} placeholder="–"/>
          </div>}
        </div>);
      })}
    </div>
  </div>);
}

function AdminPanel({setView}){
  const [extras,setExtras]=useState(()=>load(K_EXT,[]));
  const [nome,setNome]=useState(""),[senha,setSenha]=useState(""),[err,setErr]=useState(""),[ok,setOk]=useState("");
  const todos=getParts();
  const add=()=>{const n=nome.trim(),s=senha.trim();if(!n){setErr("Digite o nome.");return;}if(!s){setErr("Digite a senha.");return;}if(todos.includes(n)){setErr("Esse nome já existe!");return;}const nv=[...extras,{nome:n,senha:s}];localStorage.setItem(K_EXT,JSON.stringify(nv));setExtras(nv);setNome("");setSenha("");setErr("");setOk(`✅ ${n} adicionado!`);setTimeout(()=>setOk(""),3000);};
  const rm=n=>{if(!window.confirm(`Remover ${n}?`))return;const nv=extras.filter(e=>e.nome!==n);localStorage.setItem(K_EXT,JSON.stringify(nv));setExtras(nv);};
  const reset=n=>{const c=load(K_SEN,{});delete c[n];localStorage.setItem(K_SEN,JSON.stringify(c));setOk(`🔑 Senha de ${n.split(" ")[0]} resetada!`);setTimeout(()=>setOk(""),3000);};
  return (<div className="view-container">
    <div className="section-header"><h2 className="section-title">⚙️ Painel Admin</h2><button className="btn-ghost" onClick={()=>setView("ranking")}>← Voltar</button></div>
    <div className="admin-card"><h3 className="admin-card-title">➕ Adicionar Participante</h3><div className="admin-form">
      <input className="select-input" type="text" placeholder="Nome completo" value={nome} onChange={e=>{setNome(e.target.value);setErr("");}}/>
      <input className="select-input" type="text" placeholder="Senha inicial" value={senha} onChange={e=>{setSenha(e.target.value);setErr("");}} onKeyDown={e=>e.key==="Enter"&&add()}/>
      {err&&<p className="error-msg">⚠️ {err}</p>}{ok&&<p className="sucesso-msg">{ok}</p>}
      <button className="btn-primary" onClick={add}>Adicionar</button>
    </div></div>
    {extras.length>0&&<div className="admin-card"><h3 className="admin-card-title">👥 Participantes Adicionados</h3><div className="admin-lista">
      {extras.map(e=><div key={e.nome} className="admin-item"><span className="admin-item-nome">{e.nome}</span><span className="admin-item-senha">senha: {e.senha}</span><button className="admin-item-btn" onClick={()=>rm(e.nome)}>🗑️ Remover</button></div>)}
    </div></div>}
    <div className="admin-card"><h3 className="admin-card-title">🔑 Resetar Senha</h3><p className="admin-card-sub">Quando alguém esquecer a senha. Volta para o padrão.</p><div className="admin-lista">
      {todos.map(n=>{const c=!!load(K_SEN,{})[n];return <div key={n} className="admin-item"><span className="admin-item-nome">{n}</span><span className={`admin-item-status ${c?"custom":"padrao"}`}>{c?"🔒 custom":"🔓 padrão"}</span>{c&&<button className="admin-item-btn reset" onClick={()=>reset(n)}>↺ Resetar</button>}</div>;})}
    </div></div>
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
  const [palpites,setPalpites]=useState(()=>load(K_PAL,{}));
  const [resultados,setResultados]=useState(()=>load(K_RES,{}));
  const [isAdmin,setIsAdmin]=useState(()=>localStorage.getItem(K_ADM)==="true");
  const [showAdmin,setShowAdmin]=useState(false);
  const [clicks,setClicks]=useState(0);
  const [ultima,setUltima]=useState(null);
  const [fetchStatus,setFetchStatus]=useState("");
  const ranking=getRanking(palpites,resultados);
  const fetchRes=useCallback(async()=>{
    const ag=Date.now(),ul=parseInt(localStorage.getItem(K_FET)||"0");
    if(ag-ul<FETCH_INT)return;
    setFetchStatus("🔄 Buscando resultados...");
    const nv=await buscarResultadosAPI();
    if(nv&&Object.keys(nv).length>0){setResultados(p=>{const m={...p,...nv};localStorage.setItem(K_RES,JSON.stringify(m));return m;});setUltima(new Date().toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"}));setFetchStatus(`✅ ${Object.keys(nv).length} resultados atualizados`);}else setFetchStatus("");
    localStorage.setItem(K_FET,String(ag));setTimeout(()=>setFetchStatus(""),4000);
  },[]);
  useEffect(()=>{fetchRes();const i=setInterval(fetchRes,FETCH_INT);return()=>clearInterval(i);},[fetchRes]);
  const logoClick=()=>{const n=clicks+1;setClicks(n);if(n>=5){setShowAdmin(true);setClicks(0);}setTimeout(()=>setClicks(0),3000);};
  if(showAdmin)return (<><Header view="admin" setView={()=>setShowAdmin(false)} participante={participante}/><AdminLogin setIsAdmin={setIsAdmin} setView={v=>{setShowAdmin(false);setView(v);}}/></>);
  return (<div className="app">
    <Header view={view} setView={setView} participante={participante}/>
    {fetchStatus&&<div className="fetch-banner">{fetchStatus}</div>}
    <main className="main">
      {view==="home"&&<Hero setView={setView} ranking={ranking}/>}
      {view==="login"&&<LoginView setParticipante={setParticipante} setView={setView} participante={participante}/>}
      {view==="trocar-senha"&&<TrocarSenha setView={setView}/>}
      {view==="ranking"&&<RankingView ranking={ranking} resultados={resultados} ultima={ultima}/>}
      {view==="admin-panel"&&isAdmin&&<AdminPanel setView={setView}/>}
      {(view==="palpites"&&participante)&&<PalpitesView participante={participante} palpites={palpites} setPalpites={setPalpites} resultados={resultados} isAdmin={isAdmin} setResultados={setResultados} setView={setView}/>}
      {(view==="palpites"&&!participante)&&<LoginView setParticipante={setParticipante} setView={setView} participante={participante}/>}
    </main>
    <footer className="footer">
      <span>Bolão do Toni · Copa 2026 {isAdmin&&<><span className="admin-badge" onClick={()=>setView("admin-panel")}>⚙️ Painel Admin</span><span className="admin-badge" style={{marginLeft:6}} onClick={()=>{localStorage.removeItem(K_ADM);setIsAdmin(false);}}>Sair</span></>}</span>
      <span onClick={logoClick} style={{cursor:"default",userSelect:"none"}}>🏆</span>
    </footer>
  </div>);
}
