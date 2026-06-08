import { useState, useEffect, useCallback } from "react";
import logo from "./logo.png";
import { PARTICIPANTES as PARTICIPANTES_BASE, SENHAS as SENHAS_BASE, JOGOS, MULTIPLICADORES, calcularPontos, podeApostar, tempoRestante } from "./jogos";
import { buscarResultadosAPI } from "./api";
import "./App.css";

const KEY_PALPITES      = "bolao_palpites";
const KEY_RESULTADOS    = "bolao_resultados";
const KEY_SESSION       = "bolao_session";
const KEY_ADMIN         = "bolao_admin";
const KEY_LAST_FETCH    = "bolao_last_fetch";
const KEY_MINHAS_SENS   = "bolao_minhas_senhas";
const KEY_EXTRA_PARTS   = "bolao_extra_participantes"; // [{nome, senha}]
const ADMIN_PWD         = "bdt2026admin";
const FETCH_INTERVAL    = 5 * 60 * 1000;

function loadStorage(key, def) {
  try { return JSON.parse(localStorage.getItem(key)) ?? def; } catch { return def; }
}

// Lista completa de participantes (base + extras adicionados pelo admin)
function getParticipantes() {
  const extras = loadStorage(KEY_EXTRA_PARTS, []);
  return [...PARTICIPANTES_BASE, ...extras.map(e => e.nome)];
}

// Verifica senha: custom > extra > base
function verificarSenha(nome, senhaDigitada) {
  const customs = loadStorage(KEY_MINHAS_SENS, {});
  if (customs[nome]) return customs[nome] === senhaDigitada;
  const extras = loadStorage(KEY_EXTRA_PARTS, []);
  const extra = extras.find(e => e.nome === nome);
  if (extra) return extra.senha === senhaDigitada;
  return SENHAS_BASE[nome] === senhaDigitada;
}

function getRodadaIcon(r) {
  return {Grupos:"⚽",Oitavas:"⚡",Quartas:"🔥",Semifinal:"💥","3º Lugar":"🥉",Final:"🏆"}[r]||"⚽";
}

function getRankingData(palpites, resultados) {
  const participantes = getParticipantes();
  return participantes.map(nome => {
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

// ── Header ────────────────────────────────────────────────────────────────────
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
          {participante&&<button className={`nav-btn ${view==="palpites"?"active":""}`} onClick={()=>setView("palpites")}>Palpites</button>}
          <button className={`nav-btn nav-btn-user ${participante?"logged":""}`} onClick={()=>setView("login")}>
            {participante?`👤 ${participante.split(" ")[0]}`:"Entrar"}
          </button>
        </nav>
      </div>
    </header>
  );
}

// ── Hero ──────────────────────────────────────────────────────────────────────
function Hero({setView,ranking}) {
  const top3=ranking.slice(0,3);
  const total=getParticipantes().length;
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
        <p className="hero-sub">{total} participantes · 102 jogos · palpite até 1h antes de cada jogo</p>
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
  const participantes = getParticipantes();

  function handleLogin() {
    if(!selected){setErr("Selecione seu nome.");return;}
    if(!senha){setErr("Digite sua senha.");return;}
    if(!verificarSenha(selected,senha)){setErr("Senha incorreta! Fale com o Toni.");return;}
    localStorage.setItem(KEY_SESSION,JSON.stringify({nome:selected}));
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
        <p className="card-sub">Selecione seu nome e digite sua senha</p>
        <select className="select-input" value={selected} onChange={e=>{setSelected(e.target.value);setErr("");}}>
          <option value="">— Selecione seu nome —</option>
          {participantes.map(n=><option key={n} value={n}>{n}</option>)}
        </select>
        <input className="select-input" type="password" placeholder="Sua senha"
          value={senha} onChange={e=>{setSenha(e.target.value);setErr("");}}
          onKeyDown={e=>e.key==="Enter"&&handleLogin()}/>
        {err&&<p className="error-msg">⚠️ {err}</p>}
        <button className="btn-primary btn-full" onClick={handleLogin} disabled={!selected||!senha}>
          Entrar →
        </button>
        {participante&&<button className="btn-ghost btn-full" onClick={handleLogout}>Sair ({participante.split(" ")[0]})</button>}
        <p className="senha-hint">Senha padrão = número da sua camisa · <span className="link-trocar" onClick={()=>setView("trocar-senha")}>Trocar senha</span></p>
      </div>
    </div>
  );
}

// ── Trocar Senha ──────────────────────────────────────────────────────────────
function TrocarSenhaView({setView}) {
  const [selected,setSelected]=useState("");
  const [senhaAtual,setSenhaAtual]=useState("");
  const [novaSenha,setNovaSenha]=useState("");
  const [confirmar,setConfirmar]=useState("");
  const [err,setErr]=useState("");
  const [sucesso,setSucesso]=useState(false);
  const participantes = getParticipantes();

  function handleTrocar() {
    if(!selected){setErr("Selecione seu nome.");return;}
    if(!senhaAtual){setErr("Digite sua senha atual.");return;}
    if(!verificarSenha(selected,senhaAtual)){setErr("Senha atual incorreta!");return;}
    if(novaSenha.length<3){setErr("Nova senha precisa ter pelo menos 3 caracteres.");return;}
    if(novaSenha!==confirmar){setErr("As senhas não coincidem.");return;}
    const customs=loadStorage(KEY_MINHAS_SENS,{});
    customs[selected]=novaSenha;
    localStorage.setItem(KEY_MINHAS_SENS,JSON.stringify(customs));
    setSucesso(true);
    setTimeout(()=>setView("login"),2500);
  }

  if(sucesso) return (
    <div className="view-container">
      <div className="card login-card">
        <div className="card-icon">✅</div>
        <h2 className="card-title">Senha alterada!</h2>
        <p className="card-sub">Sua nova senha foi salva. Redirecionando...</p>
      </div>
    </div>
  );

  return (
    <div className="view-container">
      <div className="card login-card">
        <img src={logo} alt="BDT" className="login-logo"/>
        <h2 className="card-title">🔑 Trocar Senha</h2>
        <p className="card-sub">Escolha uma senha pessoal para proteger sua conta</p>
        <select className="select-input" value={selected} onChange={e=>{setSelected(e.target.value);setErr("");}}>
          <option value="">— Selecione seu nome —</option>
          {participantes.map(n=><option key={n} value={n}>{n}</option>)}
        </select>
        <input className="select-input" type="password" placeholder="Senha atual (número da camisa)"
          value={senhaAtual} onChange={e=>{setSenhaAtual(e.target.value);setErr("");}}/>
        <div className="divider-line"/>
        <input className="select-input" type="password" placeholder="Nova senha (mínimo 3 caracteres)"
          value={novaSenha} onChange={e=>{setNovaSenha(e.target.value);setErr("");}}/>
        <input className="select-input" type="password" placeholder="Confirmar nova senha"
          value={confirmar} onChange={e=>{setConfirmar(e.target.value);setErr("");}}
          onKeyDown={e=>e.key==="Enter"&&handleTrocar()}/>
        {err&&<p className="error-msg">⚠️ {err}</p>}
        <button className="btn-primary btn-full" onClick={handleTrocar}
          disabled={!selected||!senhaAtual||!novaSenha||!confirmar}>
          Salvar nova senha
        </button>
        <button className="btn-ghost btn-full" onClick={()=>setView("login")}>← Voltar</button>
        <p className="senha-hint">⚠️ Guarde bem sua nova senha!</p>
      </div>
    </div>
  );
}

// ── Ranking ───────────────────────────────────────────────────────────────────
function RankingView({ranking,resultados,ultimaAtualizacao}) {
  const jogosApurados=Object.keys(resultados).length;
  return (
    <div className="view-container">
      <div className="section-header">
        <div>
          <h2 className="section-title">🏅 Ranking</h2>
          {ultimaAtualizacao&&<p className="section-sub">Atualizado às {ultimaAtualizacao} · {jogosApurados} jogos apurados</p>}
        </div>
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
function PalpitesView({participante,palpites,setPalpites,resultados,isAdmin,setResultados,setView}) {
  const [rodadaFiltro,setRodadaFiltro]=useState("Grupos");
  const [saved,setSaved]=useState(false);
  const customs=loadStorage(KEY_MINHAS_SENS,{});
  const temSenhaCustom=!!customs[participante];
  const rodadas=[...new Set(JOGOS.map(j=>j.rodada))];
  const jogosFiltrados=JOGOS.filter(j=>j.rodada===rodadaFiltro);
  const myPal=palpites[participante]||{};
  const totalPreenchidos=JOGOS.filter(j=>{const p=myPal[j.id];return p&&p.casa!==""&&p.fora!=="";}).length;

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
    setSaved(true); setTimeout(()=>setSaved(false),3000);
  }

  return (
    <div className="view-container">
      <div className="section-header">
        <div>
          <h2 className="section-title">🎯 Palpites</h2>
          <p className="section-sub">{participante} · {totalPreenchidos}/{JOGOS.length} preenchidos</p>
        </div>
        <div className="header-actions">
          {!temSenhaCustom&&(
            <button className="btn-trocar-senha" onClick={()=>setView("trocar-senha")}>🔑 Criar senha</button>
          )}
          <button className={`btn-save ${saved?"saved":""}`} onClick={salvar}>
            {saved?"✓ Salvo!":"💾 Salvar"}
          </button>
        </div>
      </div>
      {!temSenhaCustom&&(
        <div className="aviso-senha">
          🔒 <strong>Crie sua senha pessoal!</strong> Qualquer pessoa que saiba seu número de camisa pode acessar sua conta.
          <button className="aviso-btn" onClick={()=>setView("trocar-senha")}>Criar senha agora →</button>
        </div>
      )}
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
                {res&&<span className="jogo-resultado-badge">✅ {res.casa}×{res.fora}</span>}
                {pts!==null&&<span className={`jogo-pts ${pts>0?"pts-pos":"pts-zero"}`}>{pts>0?`+${pts}`:0} pts</span>}
              </div>
              <div className="jogo-body">
                <span className="jogo-time jogo-casa">{jogo.casa}</span>
                <div className="jogo-placar">
                  <input className="placar-input" type="text" inputMode="numeric" maxLength={2}
                    value={pal.casa} onChange={e=>handlePalpite(jogo.id,"casa",e.target.value,jogo.hora)} placeholder="–" disabled={!pode}/>
                  <span className="placar-x">×</span>
                  <input className="placar-input" type="text" inputMode="numeric" maxLength={2}
                    value={pal.fora} onChange={e=>handlePalpite(jogo.id,"fora",e.target.value,jogo.hora)} placeholder="–" disabled={!pode}/>
                </div>
                <span className="jogo-time jogo-fora">{jogo.fora}</span>
              </div>
              {isAdmin&&(
                <div className="jogo-resultado-admin">
                  <span className="admin-label">⚙️ Manual:</span>
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

// ── Admin Panel ───────────────────────────────────────────────────────────────
function AdminPanel({setView}) {
  const [extras, setExtras] = useState(()=>loadStorage(KEY_EXTRA_PARTS,[]));
  const [novoNome, setNovoNome] = useState("");
  const [novaSenha, setNovaSenha] = useState("");
  const [err, setErr] = useState("");
  const [sucesso, setSucesso] = useState("");

  const todosParticipantes = getParticipantes();

  function adicionarParticipante() {
    const nome = novoNome.trim();
    const senha = novaSenha.trim();
    if(!nome){setErr("Digite o nome.");return;}
    if(!senha){setErr("Digite a senha.");return;}
    if(todosParticipantes.includes(nome)){setErr("Esse nome já existe!");return;}
    const novos = [...extras, {nome, senha}];
    localStorage.setItem(KEY_EXTRA_PARTS, JSON.stringify(novos));
    setExtras(novos);
    setNovoNome(""); setNovaSenha(""); setErr("");
    setSucesso(`✅ ${nome} adicionado com sucesso!`);
    setTimeout(()=>setSucesso(""),3000);
  }

  function removerParticipante(nome) {
    if(!window.confirm(`Remover ${nome}?`)) return;
    const novos = extras.filter(e=>e.nome!==nome);
    localStorage.setItem(KEY_EXTRA_PARTS, JSON.stringify(novos));
    setExtras(novos);
  }

  function resetarSenha(nome) {
    const customs = loadStorage(KEY_MINHAS_SENS, {});
    delete customs[nome];
    localStorage.setItem(KEY_MINHAS_SENS, JSON.stringify(customs));
    setSucesso(`🔑 Senha de ${nome.split(" ")[0]} resetada para o padrão!`);
    setTimeout(()=>setSucesso(""),3000);
  }

  return (
    <div className="view-container">
      <div className="section-header">
        <h2 className="section-title">⚙️ Painel Admin</h2>
        <button className="btn-ghost" onClick={()=>setView("ranking")}>← Voltar</button>
      </div>

      {/* Adicionar participante */}
      <div className="admin-card">
        <h3 className="admin-card-title">➕ Adicionar Participante</h3>
        <div className="admin-form">
          <input className="select-input" type="text" placeholder="Nome completo"
            value={novoNome} onChange={e=>{setNovoNome(e.target.value);setErr("");}}/>
          <input className="select-input" type="text" placeholder="Senha inicial (ex: número da camisa)"
            value={novaSenha} onChange={e=>{setNovaSenha(e.target.value);setErr("");}}
            onKeyDown={e=>e.key==="Enter"&&adicionarParticipante()}/>
          {err&&<p className="error-msg">⚠️ {err}</p>}
          {sucesso&&<p className="sucesso-msg">{sucesso}</p>}
          <button className="btn-primary" onClick={adicionarParticipante}>Adicionar</button>
        </div>
      </div>

      {/* Lista de participantes extras */}
      {extras.length > 0 && (
        <div className="admin-card">
          <h3 className="admin-card-title">👥 Participantes Adicionados por Você</h3>
          <div className="admin-lista">
            {extras.map(e=>(
              <div key={e.nome} className="admin-item">
                <span className="admin-item-nome">{e.nome}</span>
                <span className="admin-item-senha">senha: {e.senha}</span>
                <button className="admin-item-btn" onClick={()=>removerParticipante(e.nome)}>🗑️ Remover</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Lista completa com reset de senha */}
      <div className="admin-card">
        <h3 className="admin-card-title">🔑 Resetar Senha de Participante</h3>
        <p className="admin-card-sub">Use para quando alguém esquecer a senha. Volta para o padrão (número da camisa).</p>
        <div className="admin-lista">
          {todosParticipantes.map(nome=>{
            const customs=loadStorage(KEY_MINHAS_SENS,{});
            const temCustom=!!customs[nome];
            return (
              <div key={nome} className="admin-item">
                <span className="admin-item-nome">{nome}</span>
                <span className={`admin-item-status ${temCustom?"custom":"padrao"}`}>
                  {temCustom?"🔒 senha custom":"🔓 senha padrão"}
                </span>
                {temCustom&&(
                  <button className="admin-item-btn reset" onClick={()=>resetarSenha(nome)}>↺ Resetar</button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── Admin Login ───────────────────────────────────────────────────────────────
function AdminLogin({setIsAdmin,setView}) {
  const [pwd,setPwd]=useState(""); const [err,setErr]=useState(false);
  function login() {
    if(pwd===ADMIN_PWD){localStorage.setItem(KEY_ADMIN,"true");setIsAdmin(true);setView("admin-panel");}
    else{setErr(true);setTimeout(()=>setErr(false),2000);}
  }
  return (
    <div className="view-container">
      <div className="card login-card">
        <div className="card-icon">⚙️</div>
        <h2 className="card-title">Área do Organizador</h2>
        <input className="select-input" type="password" placeholder="Senha do organizador"
          value={pwd} onChange={e=>setPwd(e.target.value)} onKeyDown={e=>e.key==="Enter"&&login()}/>
        {err&&<p className="error-msg">Senha incorreta</p>}
        <button className="btn-primary btn-full" onClick={login}>Entrar</button>
      </div>
    </div>
  );
}

// ── App ───────────────────────────────────────────────────────────────────────
export default function App() {
  const [view,setView]=useState("home");
  const [participante,setParticipante]=useState(()=>{
    const s=loadStorage(KEY_SESSION,null); return s?.nome||null;
  });
  const [palpites,setPalpites]=useState(()=>loadStorage(KEY_PALPITES,{}));
  const [resultados,setResultados]=useState(()=>loadStorage(KEY_RESULTADOS,{}));
  const [isAdmin,setIsAdmin]=useState(()=>localStorage.getItem(KEY_ADMIN)==="true");
  const [showAdmin,setShowAdmin]=useState(false);
  const [logoClicks,setLogoClicks]=useState(0);
  const [ultimaAtualizacao,setUltimaAtualizacao]=useState(null);
  const [fetchStatus,setFetchStatus]=useState("");

  const ranking=getRankingData(palpites,resultados);

  const fetchResultados=useCallback(async()=>{
    const agora=Date.now();
    const ultimo=parseInt(localStorage.getItem(KEY_LAST_FETCH)||"0");
    if(agora-ultimo<FETCH_INTERVAL) return;
    setFetchStatus("🔄 Buscando resultados...");
    const novos=await buscarResultadosAPI();
    if(novos&&Object.keys(novos).length>0){
      setResultados(prev=>{
        const merged={...prev,...novos};
        localStorage.setItem(KEY_RESULTADOS,JSON.stringify(merged));
        return merged;
      });
      const hora=new Date().toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"});
      setUltimaAtualizacao(hora);
      setFetchStatus(`✅ ${Object.keys(novos).length} resultados atualizados`);
    } else { setFetchStatus(""); }
    localStorage.setItem(KEY_LAST_FETCH,String(agora));
    setTimeout(()=>setFetchStatus(""),4000);
  },[]);

  useEffect(()=>{
    fetchResultados();
    const interval=setInterval(fetchResultados,FETCH_INTERVAL);
    return()=>clearInterval(interval);
  },[fetchResultados]);

  function handleLogoClick(){
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
      {fetchStatus&&<div className="fetch-banner">{fetchStatus}</div>}
      <main className="main">
        {view==="home"&&<Hero setView={setView} ranking={ranking}/>}
        {view==="login"&&<LoginView setParticipante={setParticipante} setView={setView} participante={participante}/>}
        {view==="trocar-senha"&&<TrocarSenhaView setView={setView}/>}
        {view==="ranking"&&<RankingView ranking={ranking} resultados={resultados} ultimaAtualizacao={ultimaAtualizacao}/>}
        {view==="admin-panel"&&isAdmin&&<AdminPanel setView={setView}/>}
        {(view==="palpites"&&participante)&&(
          <PalpitesView participante={participante} palpites={palpites} setPalpites={setPalpites}
            resultados={resultados} isAdmin={isAdmin} setResultados={setResultados} setView={setView}/>
        )}
        {(view==="palpites"&&!participante)&&<LoginView setParticipante={setParticipante} setView={setView} participante={participante}/>}
      </main>
      <footer className="footer">
        <span>
          Bolão do Toni · Copa 2026
          {isAdmin&&(
            <>
              <span className="admin-badge" onClick={()=>setView("admin-panel")}>⚙️ Painel Admin</span>
              <span className="admin-badge" style={{marginLeft:6}} onClick={()=>{localStorage.removeItem(KEY_ADMIN);setIsAdmin(false);}}>Sair</span>
            </>
          )}
        </span>
        <span onClick={handleLogoClick} style={{cursor:"default",userSelect:"none"}}>🏆</span>
      </footer>
    </div>
  );
}
