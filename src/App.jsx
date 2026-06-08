import { useState, useEffect, useCallback } from "react";
import { PARTICIPANTES, JOGOS, MULTIPLICADORES, calcularPontos } from "./jogos";
import "./App.css";

// ─── Storage keys ─────────────────────────────────────────────────────────────
const KEY_PALPITES   = "bolao_palpites";    // { nome: { jogoId: {casa,fora} } }
const KEY_RESULTADOS = "bolao_resultados";  // { jogoId: {casa,fora} }
const KEY_ADMIN      = "bolao_admin";       // bool

// ─── Utils ───────────────────────────────────────────────────────────────────
function loadStorage(key, def) {
  try { return JSON.parse(localStorage.getItem(key)) ?? def; } catch { return def; }
}

function getRodadaLabel(rodada) {
  const icons = { Grupos:"⚽", Oitavas:"⚡", Quartas:"🔥", Semifinal:"💥", "3º Lugar":"🥉", Final:"🏆" };
  return icons[rodada] || "⚽";
}

function getRankingData(palpites, resultados) {
  return PARTICIPANTES.map(nome => {
    let total = 0, exatos = 0, acertos = 0, jogados = 0;
    JOGOS.forEach(j => {
      const pal = palpites[nome]?.[j.id];
      const res = resultados[j.id];
      if (!pal || !res) return;
      const pts = calcularPontos(pal.casa, pal.fora, res.casa, res.fora, j.rodada);
      if (pts === null) return;
      jogados++;
      total += pts;
      const m = MULTIPLICADORES[j.rodada] || 1;
      if (pts === 3 * m) exatos++;
      if (pts > 0) acertos++;
    });
    return { nome, total, exatos, acertos, jogados };
  }).sort((a, b) => b.total - a.total || b.exatos - a.exatos || a.nome.localeCompare(b.nome));
}

// ─── Components ──────────────────────────────────────────────────────────────

function Header({ view, setView, participante, setParticipante }) {
  return (
    <header className="header">
      <div className="header-inner">
        <div className="logo" onClick={() => setView("home")}>
          <span className="logo-icon">🏆</span>
          <span className="logo-text">BOLÃO<span className="logo-year">2026</span></span>
        </div>
        <nav className="nav">
          <button className={`nav-btn ${view==="ranking"?"active":""}`} onClick={() => setView("ranking")}>Ranking</button>
          {participante && (
            <button className={`nav-btn ${view==="palpites"?"active":""}`} onClick={() => setView("palpites")}>Meus Palpites</button>
          )}
          <button className={`nav-btn nav-btn-user ${participante?"logged":""}`} onClick={() => setView("login")}>
            {participante ? `👤 ${participante.split(" ")[0]}` : "Entrar"}
          </button>
        </nav>
      </div>
    </header>
  );
}

function Hero({ setView, ranking }) {
  const top3 = ranking.slice(0, 3);
  return (
    <section className="hero">
      <div className="hero-bg">
        <div className="hero-orb hero-orb-1" />
        <div className="hero-orb hero-orb-2" />
        <div className="hero-grid" />
      </div>
      <div className="hero-content">
        <div className="hero-badge">🇺🇸 🇨🇦 🇲🇽 · 11 JUN – 19 JUL 2026</div>
        <h1 className="hero-title">COPA DO<br/>MUNDO<br/><span className="hero-title-accent">2026</span></h1>
        <p className="hero-sub">Bolão do grupo — 102 jogos, 42 participantes</p>
        <div className="hero-actions">
          <button className="btn-primary" onClick={() => setView("ranking")}>Ver Ranking</button>
          <button className="btn-secondary" onClick={() => setView("login")}>Fazer Palpites</button>
        </div>
      </div>
      {top3.length > 0 && top3[0].total > 0 && (
        <div className="hero-podium">
          <div className="podium-label">Liderando agora</div>
          {top3.map((p, i) => (
            <div key={p.nome} className={`podium-item podium-${i+1}`}>
              <span className="podium-medal">{["🥇","🥈","🥉"][i]}</span>
              <span className="podium-name">{p.nome.split(" ")[0]}</span>
              <span className="podium-pts">{p.total} pts</span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function LoginView({ setParticipante, setView, participante }) {
  const [selected, setSelected] = useState(participante || "");

  function handleLogin() {
    if (!selected) return;
    setParticipante(selected);
    setView("palpites");
  }

  function handleLogout() {
    setParticipante(null);
    setView("home");
  }

  return (
    <div className="view-container">
      <div className="card login-card">
        <div className="card-icon">👤</div>
        <h2 className="card-title">Quem é você?</h2>
        <p className="card-sub">Selecione seu nome para acessar seus palpites</p>
        <select
          className="select-input"
          value={selected}
          onChange={e => setSelected(e.target.value)}
        >
          <option value="">— Selecione seu nome —</option>
          {PARTICIPANTES.map(n => (
            <option key={n} value={n}>{n}</option>
          ))}
        </select>
        <button className="btn-primary btn-full" onClick={handleLogin} disabled={!selected}>
          Entrar e preencher palpites →
        </button>
        {participante && (
          <button className="btn-ghost btn-full" onClick={handleLogout}>
            Sair ({participante.split(" ")[0]})
          </button>
        )}
      </div>
    </div>
  );
}

function RankingView({ ranking, resultados }) {
  const jogosComResultado = Object.keys(resultados).length;

  return (
    <div className="view-container">
      <div className="section-header">
        <h2 className="section-title">🏅 Ranking</h2>
        <span className="section-badge">{jogosComResultado} jogos apurados</span>
      </div>

      <div className="ranking-table">
        <div className="ranking-header">
          <span>Pos</span>
          <span>Participante</span>
          <span>Pts</span>
          <span className="hide-mobile">Exatos</span>
          <span className="hide-mobile">Acertos</span>
        </div>
        {ranking.map((p, i) => (
          <div
            key={p.nome}
            className={`ranking-row rank-${i < 3 ? i+1 : "rest"}`}
          >
            <span className="rank-pos">
              {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : i + 1}
            </span>
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
          {Object.entries(MULTIPLICADORES).map(([fase, m]) => (
            <div key={fase} className="legenda-item">
              <span className="legenda-fase">{getRodadaLabel(fase)} {fase}</span>
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

function PalpitesView({ participante, palpites, setPalpites, resultados, isAdmin, setResultados }) {
  const [rodadaFiltro, setRodadaFiltro] = useState("Grupos");
  const [saved, setSaved] = useState(false);

  const rodadas = [...new Set(JOGOS.map(j => j.rodada))];
  const jogosFiltrados = JOGOS.filter(j => j.rodada === rodadaFiltro);

  function handlePalpite(jogoId, campo, valor) {
    const v = valor.replace(/[^0-9]/g, "").slice(0, 2);
    setPalpites(prev => {
      const next = {
        ...prev,
        [participante]: {
          ...prev[participante],
          [jogoId]: {
            ...prev[participante]?.[jogoId],
            [campo]: v
          }
        }
      };
      localStorage.setItem(KEY_PALPITES, JSON.stringify(next));
      return next;
    });
    setSaved(false);
  }

  function handleResultado(jogoId, campo, valor) {
    const v = valor.replace(/[^0-9]/g, "").slice(0, 2);
    setResultados(prev => {
      const next = { ...prev, [jogoId]: { ...prev[jogoId], [campo]: v } };
      localStorage.setItem(KEY_RESULTADOS, JSON.stringify(next));
      return next;
    });
  }

  function salvarTudo() {
    localStorage.setItem(KEY_PALPITES, JSON.stringify(palpites));
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  const myPal = palpites[participante] || {};
  const totalPreenchidos = JOGOS.filter(j => {
    const p = myPal[j.id];
    return p && p.casa !== "" && p.fora !== "";
  }).length;

  return (
    <div className="view-container">
      <div className="section-header">
        <div>
          <h2 className="section-title">🎯 Palpites</h2>
          <p className="section-sub">{participante} · {totalPreenchidos}/{JOGOS.length} preenchidos</p>
        </div>
        <button className={`btn-save ${saved?"saved":""}`} onClick={salvarTudo}>
          {saved ? "✓ Salvo!" : "💾 Salvar"}
        </button>
      </div>

      <div className="progress-bar">
        <div className="progress-fill" style={{width:`${(totalPreenchidos/JOGOS.length)*100}%`}} />
      </div>

      <div className="rodada-tabs">
        {rodadas.map(r => (
          <button
            key={r}
            className={`rodada-tab ${rodadaFiltro===r?"active":""}`}
            onClick={() => setRodadaFiltro(r)}
          >
            {getRodadaLabel(r)} {r}
          </button>
        ))}
      </div>

      <div className="jogos-list">
        {jogosFiltrados.map(jogo => {
          const pal = myPal[jogo.id] || { casa: "", fora: "" };
          const res = resultados[jogo.id];
          const pts = res ? calcularPontos(pal.casa, pal.fora, res.casa, res.fora, jogo.rodada) : null;
          const preenchido = pal.casa !== "" && pal.fora !== "";

          return (
            <div key={jogo.id} className={`jogo-card ${preenchido?"filled":""} ${pts !== null ? `result-${pts > 0 ? "hit":"miss"}`:""}`}>
              <div className="jogo-meta">
                <span className="jogo-data">{jogo.data}</span>
                <span className="jogo-grupo">Grupo {jogo.grupo}</span>
                {pts !== null && (
                  <span className={`jogo-pts ${pts>0?"pts-pos":"pts-zero"}`}>
                    {pts > 0 ? `+${pts}` : "0"} pts
                  </span>
                )}
              </div>
              <div className="jogo-body">
                <span className="jogo-time jogo-casa">{jogo.casa}</span>
                <div className="jogo-placar">
                  <input
                    className="placar-input"
                    type="text"
                    inputMode="numeric"
                    maxLength={2}
                    value={pal.casa}
                    onChange={e => handlePalpite(jogo.id, "casa", e.target.value)}
                    placeholder="–"
                  />
                  <span className="placar-x">×</span>
                  <input
                    className="placar-input"
                    type="text"
                    inputMode="numeric"
                    maxLength={2}
                    value={pal.fora}
                    onChange={e => handlePalpite(jogo.id, "fora", e.target.value)}
                    placeholder="–"
                  />
                </div>
                <span className="jogo-time jogo-fora">{jogo.fora}</span>
              </div>
              {isAdmin && (
                <div className="jogo-resultado-admin">
                  <span className="admin-label">⚙️ Resultado real:</span>
                  <input
                    className="placar-input placar-admin"
                    type="text" inputMode="numeric" maxLength={2}
                    value={res?.casa ?? ""}
                    onChange={e => handleResultado(jogo.id, "casa", e.target.value)}
                    placeholder="–"
                  />
                  <span className="placar-x">×</span>
                  <input
                    className="placar-input placar-admin"
                    type="text" inputMode="numeric" maxLength={2}
                    value={res?.fora ?? ""}
                    onChange={e => handleResultado(jogo.id, "fora", e.target.value)}
                    placeholder="–"
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function AdminLogin({ setIsAdmin, setView }) {
  const [pwd, setPwd] = useState("");
  const [err, setErr] = useState(false);
  // Senha simples — mude para a que quiser
  const ADMIN_PWD = "copa2026admin";

  function handleLogin() {
    if (pwd === ADMIN_PWD) {
      localStorage.setItem(KEY_ADMIN, "true");
      setIsAdmin(true);
      setView("ranking");
    } else {
      setErr(true);
      setTimeout(() => setErr(false), 2000);
    }
  }

  return (
    <div className="view-container">
      <div className="card login-card">
        <div className="card-icon">⚙️</div>
        <h2 className="card-title">Área Admin</h2>
        <p className="card-sub">Somente o organizador acessa aqui para inserir resultados</p>
        <input
          className="select-input"
          type="password"
          placeholder="Senha do organizador"
          value={pwd}
          onChange={e => setPwd(e.target.value)}
          onKeyDown={e => e.key === "Enter" && handleLogin()}
        />
        {err && <p className="error-msg">Senha incorreta</p>}
        <button className="btn-primary btn-full" onClick={handleLogin}>Entrar como Admin</button>
      </div>
    </div>
  );
}

// ─── App ─────────────────────────────────────────────────────────────────────
export default function App() {
  const [view, setView]               = useState("home");
  const [participante, setParticipante] = useState(null);
  const [palpites, setPalpites]       = useState(() => loadStorage(KEY_PALPITES, {}));
  const [resultados, setResultados]   = useState(() => loadStorage(KEY_RESULTADOS, {}));
  const [isAdmin, setIsAdmin]         = useState(() => localStorage.getItem(KEY_ADMIN) === "true");
  const [showAdminLogin, setShowAdminLogin] = useState(false);

  const ranking = getRankingData(palpites, resultados);

  // Secret admin access: click logo 5x
  const [logoClicks, setLogoClicks] = useState(0);
  function handleLogoClick() {
    const n = logoClicks + 1;
    setLogoClicks(n);
    if (n >= 5) { setShowAdminLogin(true); setLogoClicks(0); }
    setTimeout(() => setLogoClicks(0), 3000);
  }

  if (showAdminLogin) return (
    <>
      <Header view="admin" setView={() => setShowAdminLogin(false)} participante={participante} setParticipante={setParticipante} />
      <AdminLogin setIsAdmin={setIsAdmin} setView={v => { setShowAdminLogin(false); setView(v); }} />
    </>
  );

  return (
    <div className="app">
      <Header
        view={view}
        setView={setView}
        participante={participante}
        setParticipante={setParticipante}
      />
      <main className="main">
        {view === "home" && (
          <>
            <Hero setView={setView} ranking={ranking} />
          </>
        )}
        {view === "login" && (
          <LoginView
            setParticipante={setParticipante}
            setView={setView}
            participante={participante}
          />
        )}
        {view === "ranking" && (
          <RankingView ranking={ranking} resultados={resultados} />
        )}
        {view === "palpites" && participante && (
          <PalpitesView
            participante={participante}
            palpites={palpites}
            setPalpites={setPalpites}
            resultados={resultados}
            isAdmin={isAdmin}
            setResultados={setResultados}
          />
        )}
        {view === "palpites" && !participante && (
          <LoginView setParticipante={setParticipante} setView={setView} participante={participante} />
        )}
      </main>
      <footer className="footer">
        <span>Bolão Copa 2026 · {isAdmin && <span className="admin-badge" onClick={() => { localStorage.removeItem(KEY_ADMIN); setIsAdmin(false); }}>⚙️ Admin (sair)</span>}</span>
        <span onClick={handleLogoClick} style={{cursor:"default", userSelect:"none"}}>🏆</span>
      </footer>
    </div>
  );
}
