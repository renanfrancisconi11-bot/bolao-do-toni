import { useState, useEffect } from "react";
import logo from "./logo.png";
import { PARTICIPANTES, SENHAS, JOGOS, MULTIPLICADORES, calcularPontos, podeApostar, tempoRestante } from "./jogos";
import "./App.css";

const KEY_PALPITES   = "bolao_palpites";
const KEY_RESULTADOS = "bolao_resultados";
const KEY_SESSION    = "bolao_session";
const KEY_ADMIN      = "bolao_admin";
const ADMIN_PWD      = "bdt2026admin";

function loadStorage(key, def) {
  try { return JSON.parse(localStorage.getItem(key)) ?? def; } catch { return def; }
}

function getRodadaIcon(r) {
  return {Grupos:"⚽",Oitavas:"⚡",Quartas:"🔥",Semifinal:"💥","3º Lugar":"🥉",Final:"🏆"}[r]||"⚽";
}

function getRankingData(palpites, resultados) {
  return PARTICIPANTES.map(nome => {
    let total=0,exatos=0,acertos=0;
    JOGOS.forEach(j => {
      const pal=palpites[nome]?.[j.id];
      const res=resultados[j.id];
      if(!pal||!res) return;
      const pts=calcularPontos(pal.casa,pal.fora,res.casa,res.fora,j.rodada);
      if(pts===null) return;
      total+=pts;
      const m=MULTIPLICADORES[j.rodada]||1;
      if(pts===3*m) exatos++;
      if(pts>0) acertos++;
    });
    return {nome,total,exatos,acertos};
  }).sort((a,b)=>b.total-a.total||b.exatos-a.exatos||a.nome.localeCompare(b.nome));
}

// ── Header ───────────────────────────────────────────────────────────────────
function Header({view,setView,participante,setParticipante}) {
  return (
    <header className="header">
      <div className="header-inner">
        <div className="logo" onClick={()=>setView("home")}>
          <img src={logo} alt="BDT" className="logo-img"/>
          <div>
            <span className="logo-text">BOLÃO DO TONI</span>
            <span className="logo-sub">COPA DO MUNDO 2026</span>
          </div>
        </div>
        <nav className="nav">
          <button className={`nav-btn ${view==="ranking"?"active":""}`} onClick={()=>setView("ranking")}>Ranking</button>
          {participante && <button className={`nav-btn ${view==="palpites"?"active":""}`} onClick={()=>setView("palpites")}>Palpites</button>}
          <button className={`nav-btn nav-btn-user ${participante?"logged":""}`} onClick={()=>setView("login")}>
            {participante ? `👤 ${participante.split(" ")[0]}` : "Entrar"}
          </button>
        </nav>
      </div>
    </header>
  );
}

// ── Hero ─────────────────────────────────────────────────────────────────────
function Hero({setView,ranking}) {
  const top3 = ranking.slice(0,3);
  return (
    <section className="hero">
      <div className="hero-bg">
        <div className="hero-orb hero-orb-1"/>
        <div className="hero-orb hero-orb-2"/>
        <div className="hero-grid"/>
      </div>
      <div className="hero-content">
        <div className="hero-badge">🇧🇷 🇺🇸 🇨🇦 🇲🇽 · 11 JUN – 19 JUL 2026</div>
        <h1 className="hero-title">
          BOLÃO<br/>
          <span className="hero-title-accent">DO TONI</span><br/>
          <span className="hero-title-blue">2026</span>
        </h1>
        <p className="hero-sub">42 participantes · 102 jogos · palpite até 1h antes de cada jogo</p>
        <div className="hero-actions">
          <button className="btn-primary" onClick={()=>setView("ranking")}>Ver Ranking</button>
          <button className="btn-secondary" onClick={()=>setView("login")}>Fazer Palpites</button>
        </div>
      </div>
      {top3.length>0&&top3[0].total>0&&(
        <div className="hero-podium">
          <div className="podium-label">Liderando agora</div>
          {top3.map((p,i)=>(
            <div key={p.nome} className="podium-item">
              <span className="podium-medal">{["🥇","🥈","🥉"][i]}</span>
              <span className="podium-name">{p.nome.split(" ")[0]}</span>
              <span className="podium-pts">{p.total}pts</span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

// ── Login ─────────────────────────────────────────────────────────────────────
function LoginView({setParticipante,setView,participante}) {
  const [selected,setSelected]=useState("");
  const [senha,setSenha]=useState("");
  const [err,setErr]=useState("");

  function handleLogin() {
    if(!selected){setErr("Selecione seu nome.");return;}
    if(!senha){setErr("Digite sua senha.");return;}
    if(SENHAS[selected]!==senha){setErr("Senha incorreta! Fale com o organizador.");return;}
    localStorage.setItem(KEY_SESSION, JSON.stringify({nome:selected}));
    setParticipante(selected);
    setView("palpites");
  }

  function handleLogout() {
    localStorage.removeItem(KEY_SESSION);
    setParticipante(null);
    setView("home");
  }

  return (
    <div className="view-container">
      <div className="card login-card">
        <img src={logo} alt="BDT" className="login-logo"/>
        <h2 className="card-title">Entrar no Bolão</h2>
        <p className="card-sub">Selecione seu nome e digite sua senha para acessar seus palpites</p>
        <select className="select-input" value={selected} onChange={e=>{setSelected(e.target.value);setErr("");}}>
          <option value="">— Selecione seu nome —</option>
          {PARTICIPANTES.map(n=><option key={n} value={n}>{n}</option>)}
        </select>
        <input
          className="select-input"
          type="password"
          placeholder="Sua senha"
          value={senha}
          onChange={e=>{setSenha(e.target.value);setErr("");}}
          onKeyDown={e=>e.key==="Enter"&&handleLogin()}
        />
        {err&&<p className="error-msg">⚠️ {err}</p>}
        <button className="btn-primary btn-full" onClick={handleLogin} disabled={!selected||!senha}>
          Entrar e fazer palpites →
        </button>
        {participante&&<button className="btn-ghost btn-full" onClick={handleLogout}>Sair ({participante.split(" ")[0]})</button>}
        <p className="senha-hint">Não sabe sua senha? Fale com o Toni 😄</p>
      </div>
    </div>
  );
}

// ── Ranking ───────────────────────────────────────────────────────────────────
function RankingView({ranking,resultados}) {
  const jogosApurados=Object.keys(resultados).length;
  return (
    <div className="view-container">
      <div className="section-header">
        <h2 className="section-title">🏅 Ranking</h2>
        <span className="section-badge">{jogosApurados} jogos apurados</span>
      </div>
      <div className="ranking-table">
        <div className="ranking-header">
          <span>Pos</span><span>Participante</span><span>Pts</span>
          <span className="hide-mobile">Exatos</span>
          <span className="hide-mobile">Acertos</span>
        </div>
        {ranking.map((p,i)=>(
          <div key={p.nome} className={`ranking-row rank-${i<3?i+1:"rest"}`}>
            <span className="rank-pos">{i===0?"🥇":i===1?"🥈":i===2?"🥉":i+1}</span>
            <span className="rank-name">{p.nome}</span>
            <span className="rank-pts">{p.total}</span>
            <span className="rank-extra hide-mobile">{p.exatos}</span>
            <span className="rank-extra hide-mobile">{p.acertos}</span>
          </div>
        ))}
      </div>
      <div className="pontuacao-legenda">
        <h3>Sistema de Pontuação</h3>
        <div className="legenda-grid">
          {Object.entries(MULTIPLICADORES).map(([fase,m])=>(
            <div key={fase} className="legenda-item">
              <span className="legenda-fase">{getRodadaIcon(fase)} {fase}</span>
              <span className="legenda-pts">
                <span className="pts-exact">{3*m}pts</span> exato ·
                <span className="pts-saldo"> {2*m}pts</span> saldo ·
                <span className="pts-winner"> {1*m}pts</span> vencedor
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Palpites ──────────────────────────────────────────────────────────────────
function PalpitesView({participante,palpites,setPalpites,resultados,isAdmin,setResultados}) {
  const [rodadaFiltro,setRodadaFiltro]=useState("Grupos");
  const [saved,setSaved]=useState(false);
  const [now,setNow]=useState(new Date());

  useEffect(()=>{
    const t=setInterval(()=>setNow(new Date()),30000);
    return ()=>clearInterval(t);
  },[]);

  const rodadas=[...new Set(JOGOS.map(j=>j.rodada))];
  const jogosFiltrados=JOGOS.filter(j=>j.rodada===rodadaFiltro);
  const myPal=palpites[participante]||{};
  const totalPreenchidos=JOGOS.filter(j=>{
    const p=myPal[j.id];
    return p&&p.casa!==""&&p.fora!=="";
  }).length;

  function handlePalpite(jogoId,campo,valor,jogoHora) {
    if(!podeApostar(jogoHora)) return;
    const v=valor.replace(/[^0-9]/g,"").slice(0,2);
    setPalpites(prev=>{
      const next={...prev,[participante]:{...prev[participante],[jogoId]:{...prev[participante]?.[jogoId],[campo]:v}}};
      localStorage.setItem(KEY_PALPITES,JSON.stringify(next));
      return next;
    });
    setSaved(false);
  }

  function handleResultado(jogoId,campo,valor) {
    const v=valor.replace(/[^0-9]/g,"").slice(0,2);
    setResultados(prev=>{
      const next={...prev,[jogoId]:{...prev[jogoId],[campo]:v}};
      localStorage.setItem(KEY_RESULTADOS,JSON.stringify(next));
      return next;
    });
  }

  function salvar() {
    localStorage.setItem(KEY_PALPITES,JSON.stringify(palpites));
    setSaved(true);
    setTimeout(()=>setSaved(false),3000);
  }

  return (
    <div className="view-container">
      <div className="section-header">
        <div>
          <h2 className="section-title">🎯 Palpites</h2>
          <p className="section-sub">{participante} · {totalPreenchidos}/{JOGOS.length} preenchidos</p>
        </div>
        <button className={`btn-save ${saved?"saved":""}`} onClick={salvar}>
          {saved?"✓ Salvo!":"💾 Salvar"}
        </button>
      </div>

      <div className="progress-bar">
        <div className="progress-fill" style={{width:`${(totalPreenchidos/JOGOS.length)*100}%`}}/>
      </div>

      <div className="rodada-tabs">
        {rodadas.map(r=>(
          <button key={r} className={`rodada-tab ${rodadaFiltro===r?"active":""}`} onClick={()=>setRodadaFiltro(r)}>
            {getRodadaIcon(r)} {r}
          </button>
        ))}
      </div>

      <div className="jogos-list">
        {jogosFiltrados.map(jogo=>{
          const pal=myPal[jogo.id]||{casa:"",fora:""};
          const res=resultados[jogo.id];
          const pts=res?calcularPontos(pal.casa,pal.fora,res.casa,res.fora,jogo.rodada):null;
          const pode=podeApostar(jogo.hora);
          const tempo=tempoRestante(jogo.hora);
          const preenchido=pal.casa!==""&&pal.fora!=="";

          return (
            <div key={jogo.id} className={`jogo-card ${preenchido?"filled":""} ${!pode?"locked":""} ${pts!==null?`result-${pts>0?"hit":"miss"}`:""}`}>
              <div className="jogo-meta">
                <span className="jogo-data">{jogo.data} · {jogo.hora.slice(11,16)}h</span>
                <span className="jogo-grupo">{jogo.grupo}</span>
                {!pode&&!res&&<span className="jogo-locked">🔒 Encerrado</span>}
                {pode&&tempo&&<span className="jogo-tempo">⏱ {tempo}</span>}
                {pts!==null&&(
                  <span className={`jogo-pts ${pts>0?"pts-pos":"pts-zero"}`}>
                    {pts>0?`+${pts}`:0} pts
                  </span>
                )}
              </div>
              <div className="jogo-body">
                <span className="jogo-time jogo-casa">{jogo.casa}</span>
                <div className="jogo-placar">
                  <input
                    className="placar-input"
                    type="text" inputMode="numeric" maxLength={2}
                    value={pal.casa}
                    onChange={e=>handlePalpite(jogo.id,"casa",e.target.value,jogo.hora)}
                    placeholder="–"
                    disabled={!pode}
                  />
                  <span className="placar-x">×</span>
                  <input
                    className="placar-input"
                    type="text" inputMode="numeric" maxLength={2}
                    value={pal.fora}
                    onChange={e=>handlePalpite(jogo.id,"fora",e.target.value,jogo.hora)}
                    placeholder="–"
                    disabled={!pode}
                  />
                </div>
                <span className="jogo-time jogo-fora">{jogo.fora}</span>
              </div>
              {isAdmin&&(
                <div className="jogo-resultado-admin">
                  <span className="admin-label">⚙️ Resultado:</span>
                  <input className="placar-input placar-admin" type="text" inputMode="numeric" maxLength={2}
                    value={res?.casa??""} onChange={e=>handleResultado(jogo.id,"casa",e.target.value)} placeholder="–"/>
                  <span className="placar-x">×</span>
                  <input className="placar-input placar-admin" type="text" inputMode="numeric" maxLength={2}
                    value={res?.fora??""} onChange={e=>handleResultado(jogo.id,"fora",e.target.value)} placeholder="–"/>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Admin Login ───────────────────────────────────────────────────────────────
function AdminLogin({setIsAdmin,setView}) {
  const [pwd,setPwd]=useState("");
  const [err,setErr]=useState(false);
  function handleLogin() {
    if(pwd===ADMIN_PWD){localStorage.setItem(KEY_ADMIN,"true");setIsAdmin(true);setView("ranking");}
    else{setErr(true);setTimeout(()=>setErr(false),2000);}
  }
  return (
    <div className="view-container">
      <div className="card login-card">
        <div className="card-icon">⚙️</div>
        <h2 className="card-title">Área do Organizador</h2>
        <input className="select-input" type="password" placeholder="Senha do organizador"
          value={pwd} onChange={e=>setPwd(e.target.value)} onKeyDown={e=>e.key==="Enter"&&handleLogin()}/>
        {err&&<p className="error-msg">Senha incorreta</p>}
        <button className="btn-primary btn-full" onClick={handleLogin}>Entrar</button>
      </div>
    </div>
  );
}

// ── App ───────────────────────────────────────────────────────────────────────
export default function App() {
  const [view,setView]=useState("home");
  const [participante,setParticipante]=useState(()=>{
    const s=loadStorage(KEY_SESSION,null);
    return s?.nome||null;
  });
  const [palpites,setPalpites]=useState(()=>loadStorage(KEY_PALPITES,{}));
  const [resultados,setResultados]=useState(()=>loadStorage(KEY_RESULTADOS,{}));
  const [isAdmin,setIsAdmin]=useState(()=>localStorage.getItem(KEY_ADMIN)==="true");
  const [showAdmin,setShowAdmin]=useState(false);
  const [logoClicks,setLogoClicks]=useState(0);

  const ranking=getRankingData(palpites,resultados);

  function handleLogoClick() {
    const n=logoClicks+1; setLogoClicks(n);
    if(n>=5){setShowAdmin(true);setLogoClicks(0);}
    setTimeout(()=>setLogoClicks(0),3000);
  }

  if(showAdmin) return (
    <>
      <Header view="admin" setView={()=>setShowAdmin(false)} participante={participante} setParticipante={setParticipante}/>
      <AdminLogin setIsAdmin={setIsAdmin} setView={v=>{setShowAdmin(false);setView(v);}}/>
    </>
  );

  return (
    <div className="app">
      <Header view={view} setView={setView} participante={participante} setParticipante={setParticipante}/>
      <main className="main">
        {view==="home"&&<Hero setView={setView} ranking={ranking}/>}
        {view==="login"&&<LoginView setParticipante={setParticipante} setView={setView} participante={participante}/>}
        {view==="ranking"&&<RankingView ranking={ranking} resultados={resultados}/>}
        {(view==="palpites"&&participante)&&(
          <PalpitesView participante={participante} palpites={palpites} setPalpites={setPalpites}
            resultados={resultados} isAdmin={isAdmin} setResultados={setResultados}/>
        )}
        {(view==="palpites"&&!participante)&&<LoginView setParticipante={setParticipante} setView={setView} participante={participante}/>}
      </main>
      <footer className="footer">
        <span>Bolão do Toni · Copa 2026{isAdmin&&<span className="admin-badge" onClick={()=>{localStorage.removeItem(KEY_ADMIN);setIsAdmin(false);}}>⚙️ Admin (sair)</span>}</span>
        <span onClick={handleLogoClick} style={{cursor:"default",userSelect:"none"}}>🏆</span>
      </footer>
    </div>
  );
}
