import React, { useState, useEffect, useMemo } from "react";
import "./App.css";
import logo from "./logo.png";
import {
  carregarDadosDB, carregarFinanceiroDB, salvarDadosDB, salvarFinanceiroDB, supabase,
} from "./supabase";
import { lerPlanilha } from "./planilha";

const K_ADM = "bdt_admin";
const ADMIN_PWD = "bdt2026admin";

const ABAS = [
  { id: "ranking",  rotulo: "Ranking",      icone: "🏆" },
  { id: "artilharia", rotulo: "Artilharia", icone: "⚽" },
  { id: "vazado",   rotulo: "Menos Vazado", icone: "🧤" },
  { id: "semanas",  rotulo: "Semanas",      icone: "📅" },
  { id: "uniformes",rotulo: "Uniformes",    icone: "👕" },
  { id: "hall",     rotulo: "Hall da Fama", icone: "⭐" },
];

const brl = (v) =>
  v === null || v === undefined || isNaN(v)
    ? "—"
    : v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const medalha = (i) => (i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : "");

// ============================================================
// PECAS REUTILIZAVEIS
// ============================================================
function Vazio({ children }) {
  return <div className="bdt-vazio">{children}</div>;
}

function SeletorAno({ anos, ano, setAno }) {
  if (!anos || anos.length < 2) return null;
  return (
    <div className="rodada-tabs">
      {anos.map((a) => (
        <button key={a} className={`rodada-tab ${ano === a ? "active" : ""}`} onClick={() => setAno(a)}>
          {a}
        </button>
      ))}
    </div>
  );
}

function Secao({ titulo, sub, children }) {
  return (
    <div className="view-container">
      <div className="section-header">
        <h2 className="section-title">{titulo}</h2>
        {sub && <p className="section-sub">{sub}</p>}
      </div>
      {children}
    </div>
  );
}

// ============================================================
// CABECALHO
// ============================================================
function Header({ aba, setAba, setView }) {
  return (
    <header className="header">
      <div className="header-inner">
        <div className="logo" onClick={() => setView("home")}>
          <img src={logo} alt="BDT" className="logo-img" />
          <div>
            <span className="logo-text">BUTECO DO TONI</span>
            <span className="logo-sub">FUTEBOL SEMANAL</span>
          </div>
        </div>
      </div>
      <div className="bdt-nav">
        {ABAS.map((a) => (
          <button
            key={a.id}
            className={`bdt-nav-btn ${aba === a.id ? "active" : ""}`}
            onClick={() => { setAba(a.id); setView("secao"); }}
          >
            <span className="bdt-nav-ico">{a.icone}</span>
            {a.rotulo}
          </button>
        ))}
      </div>
    </header>
  );
}

// ============================================================
// HOME
// ============================================================
function Home({ dados, setAba, setView }) {
  const anoAtual = dados?.anosDetalhados?.[0];
  const ano = anoAtual ? dados.anos[anoAtual] : null;
  const top3 = ano ? ano.ranking.slice(0, 3) : [];
  const art = ano?.artilharia?.[0];
  const ir = (a) => { setAba(a); setView("secao"); };

  return (
    <section className="hero">
      <div className="hero-bg"><div className="hero-orb hero-orb-1" /><div className="hero-orb hero-orb-2" /></div>
      <div className="hero-content">
        <span className="hero-badge">{anoAtual ? `TEMPORADA ${anoAtual}` : "BUTECO DO TONI"}</span>
        <h1 className="hero-title">
          TONI <span className="hero-title-accent">BALLON&apos;DOR</span>
        </h1>
        <p className="hero-sub">
          {ano
            ? `${ano.ranking.length} jogadores · ${ano.semanas.length} semanas disputadas`
            : "Nenhuma planilha importada ainda."}
        </p>

        {top3.length > 0 && (
          <div className="hero-podium">
            {top3.map((p, i) => (
              <div key={p.nome} className="podium-item">
                <span className="podium-medal">{medalha(i)}</span>
                <span className="podium-name">{p.nome}</span>
                <span className="podium-pts">{p.pontos} pts</span>
              </div>
            ))}
          </div>
        )}

        <div className="hero-grid">
          <div className="card" onClick={() => ir("ranking")}>
            <span className="card-icon">🏆</span>
            <span className="card-title">Ranking</span>
            <span className="card-sub">Classificação da temporada</span>
          </div>
          <div className="card" onClick={() => ir("artilharia")}>
            <span className="card-icon">⚽</span>
            <span className="card-title">Artilharia</span>
            <span className="card-sub">{art ? `${art.nome} · ${art.gols} gols` : "Goleadores"}</span>
          </div>
          <div className="card" onClick={() => ir("semanas")}>
            <span className="card-icon">📅</span>
            <span className="card-title">Semanas</span>
            <span className="card-sub">Destaques de cada rodada</span>
          </div>
          <div className="card" onClick={() => ir("hall")}>
            <span className="card-icon">⭐</span>
            <span className="card-title">Hall da Fama</span>
            <span className="card-sub">Campeões desde 2018</span>
          </div>
        </div>
      </div>
    </section>
  );
}

// ============================================================
// RANKING
// ============================================================
function RankingView({ dados, ano, setAno }) {
  const a = dados?.anos?.[ano];
  return (
    <Secao titulo="🏆 Ranking" sub={a ? `Toni Ballon'Dor ${ano} · ${a.ranking.length} jogadores` : ""}>
      <SeletorAno anos={dados?.anosDetalhados} ano={ano} setAno={setAno} />
      {!a ? <Vazio>Sem dados para {ano}.</Vazio> : (
        <div className="ranking-table">
          <div className="ranking-header">
            <span>#</span><span>Jogador</span><span>V / D</span><span>J</span><span>Pts</span>
          </div>
          {a.ranking.map((p, i) => (
            <div key={p.nome + i} className={`ranking-row ${i < 3 ? `rank-${i + 1}` : ""}`}>
              <span className="rank-pos">{medalha(i) || p.pos}</span>
              <span className="rank-name">{p.nome}</span>
              <span className="rank-extra">{p.scouts || "—"}</span>
              <span className="rank-extra">{p.jogos ?? "—"}</span>
              <span className="rank-pts">{p.pontos}</span>
            </div>
          ))}
        </div>
      )}
    </Secao>
  );
}

// ============================================================
// ARTILHARIA / MENOS VAZADO
// ============================================================
function ListaGols({ dados, ano, setAno, campo, titulo, sub, rotuloGols, mostrarMedia }) {
  const a = dados?.anos?.[ano];
  const lista = a?.[campo] || [];
  return (
    <Secao titulo={titulo} sub={sub}>
      <SeletorAno anos={dados?.anosDetalhados} ano={ano} setAno={setAno} />
      {lista.length === 0 ? <Vazio>Sem dados de {titulo.toLowerCase()} para {ano}.</Vazio> : (
        <div className="ranking-table">
          <div className="ranking-header">
            <span>#</span><span>Jogador</span>
            {mostrarMedia && <span>J</span>}
            {mostrarMedia && <span>Méd</span>}
            <span>{rotuloGols}</span>
          </div>
          {lista.map((p, i) => (
            <div key={p.nome + i} className={`ranking-row ${i < 3 ? `rank-${i + 1}` : ""}`}>
              <span className="rank-pos">{medalha(i) || p.pos}</span>
              <span className="rank-name">{p.nome}</span>
              {mostrarMedia && <span className="rank-extra">{p.jogos ?? "—"}</span>}
              {mostrarMedia && <span className="rank-extra">{p.media ?? "—"}</span>}
              <span className="rank-pts">{p.gols}</span>
            </div>
          ))}
        </div>
      )}
      {mostrarMedia && lista.length > 0 && (
        <p className="bdt-nota">
          A planilha ordena esta lista do jeito que está lá. Quem jogou pouco aparece bem colocado
          com poucos gols sofridos — olhe a coluna de jogos antes de tirar conclusão.
        </p>
      )}
    </Secao>
  );
}

// ============================================================
// SEMANAS
// ============================================================
const COR_DESTAQUE = { "1º": "d1", "2º": "d2", "3º": "d3", Abacaxi: "dx", Separou: "ds" };

function SemanasView({ dados, ano, setAno }) {
  const a = dados?.anos?.[ano];
  const semanas = useMemo(() => [...(a?.semanas || [])].reverse(), [a]);
  return (
    <Secao titulo="📅 Semanas" sub={a ? `${semanas.length} rodadas em ${ano} · da mais recente para a mais antiga` : ""}>
      <SeletorAno anos={dados?.anosDetalhados} ano={ano} setAno={setAno} />
      {semanas.length === 0 ? <Vazio>Nenhuma semana lançada em {ano}.</Vazio> : (
        <div className="bdt-semanas">
          {semanas.map((s) => (
            <div key={s.numero} className="bdt-semana">
              <div className="bdt-semana-topo">
                <span className="bdt-semana-num">Semana {String(s.numero).padStart(2, "0")}</span>
                <span className="bdt-semana-data">{s.data}</span>
              </div>
              <div className="bdt-semana-lista">
                {s.destaques.map((d) => (
                  <div key={d.rotulo} className={`bdt-destaque ${COR_DESTAQUE[d.rotulo] || ""}`}>
                    <span className="bdt-destaque-rot">{d.rotulo}</span>
                    <span className="bdt-destaque-nome">{d.nome}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </Secao>
  );
}

// ============================================================
// UNIFORMES
// ============================================================
function UniformesView({ dados }) {
  const u = dados?.uniformes;
  const [busca, setBusca] = useState("");
  const lista = (u?.jogadores || []).filter((j) =>
    (j.nome + " " + j.numero).toLowerCase().includes(busca.toLowerCase())
  );
  return (
    <Secao titulo="👕 Uniformes" sub={`${u?.jogadores?.length || 0} jogadores cadastrados`}>
      <input
        className="placar-input bdt-busca"
        placeholder="Buscar por nome ou número..."
        value={busca}
        onChange={(e) => setBusca(e.target.value)}
      />
      {lista.length === 0 ? <Vazio>Nada encontrado.</Vazio> : (
        <div className="ranking-table">
          <div className="ranking-header">
            <span>Nº</span><span>Jogador</span><span>Camisa</span><span>Calção</span>
          </div>
          {lista.map((j, i) => (
            <div key={j.nome + i} className="ranking-row">
              <span className="rank-pos">{j.numero}</span>
              <span className="rank-name">{j.nome}</span>
              <span className="rank-extra">{j.camisa || "—"}</span>
              <span className="rank-extra">{j.calcao || "—"}</span>
            </div>
          ))}
        </div>
      )}
      {(u?.estoque || []).length > 0 && (
        <>
          <h3 className="bdt-sub">Estoque</h3>
          <div className="hero-grid">
            {u.estoque.map((e) => (
              <div key={e.titulo} className="card bdt-card-estatico">
                <span className="card-title">{e.titulo}</span>
                {e.itens.map((it) => <span key={it} className="card-sub">{it}</span>)}
              </div>
            ))}
          </div>
        </>
      )}
    </Secao>
  );
}

// ============================================================
// HALL DA FAMA
// ============================================================
function HallView({ dados }) {
  const hall = dados?.hallDaFama || [];
  const titulos = useMemo(() => {
    const c = {};
    hall.forEach((h) => { if (h.podio[0]) c[h.podio[0].nome] = (c[h.podio[0].nome] || 0) + 1; });
    return Object.entries(c).sort((a, b) => b[1] - a[1]);
  }, [hall]);

  return (
    <Secao titulo="⭐ Hall da Fama" sub={`Campeões do Toni Ballon'Dor · ${hall.length} temporadas`}>
      {titulos.length > 0 && (
        <div className="bdt-titulos">
          {titulos.map(([nome, n]) => (
            <span key={nome} className="bdt-titulo-chip">
              {nome} <strong>{n}×</strong>
            </span>
          ))}
        </div>
      )}
      {hall.length === 0 ? <Vazio>Sem dados importados.</Vazio> : (
        <div className="bdt-semanas">
          {hall.map((h) => (
            <div key={h.ano} className="bdt-semana">
              <div className="bdt-semana-topo">
                <span className="bdt-semana-num">{h.ano}</span>
              </div>
              <div className="bdt-semana-lista">
                {h.podio.map((p, i) => (
                  <div key={p.nome + i} className={`bdt-destaque d${i + 1}`}>
                    <span className="bdt-destaque-rot">{medalha(i)}</span>
                    <span className="bdt-destaque-nome">{p.nome}</span>
                    <span className="bdt-destaque-pts">{p.pontos} pts</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
      <p className="bdt-nota">
        De 2018 a 2023 a planilha guarda só pontos e nome, então esses anos aparecem apenas aqui.
        O sistema de pontos mudou em 2024 (era 20/10/5, virou 5/3/2) — não dá para comparar
        pontuação entre as épocas.
      </p>
    </Secao>
  );
}

// ============================================================
// CAIXA (SO ADMIN)
// ============================================================
function CaixaView({ financeiro, setView }) {
  const anos = Object.keys(financeiro || {}).filter((k) => /^\d{4}$/.test(k)).sort((a, b) => b - a);
  const [ano, setAno] = useState(anos[0]);
  const f = financeiro?.[ano];

  if (!anos.length) {
    return (
      <Secao titulo="💰 Caixa" sub="Visível só para o admin">
        <Vazio>Nenhum financeiro importado ainda.</Vazio>
        <button className="btn-secondary" onClick={() => setView("admin")}>Voltar ao painel</button>
      </Secao>
    );
  }

  return (
    <Secao titulo="💰 Caixa" sub="Visível só para o admin">
      <SeletorAno anos={anos} ano={ano} setAno={setAno} />

      {(f?.conferencia || []).map((c, i) => (
        <div key={i} className="bdt-alerta">⚠️ {c}</div>
      ))}

      <div className="hero-grid">
        <div className="card bdt-card-estatico">
          <span className="card-title">{brl(f?.emCaixa)}</span>
          <span className="card-sub">Em caixa (conforme a planilha)</span>
        </div>
        <div className="card bdt-card-estatico">
          <span className="card-title">{brl(f?.totalCreditos)}</span>
          <span className="card-sub">Créditos</span>
        </div>
        <div className="card bdt-card-estatico">
          <span className="card-title">{brl(f?.totalDebitos)}</span>
          <span className="card-sub">Débitos</span>
        </div>
      </div>

      <h3 className="bdt-sub">Pagamentos ({f?.pessoas?.length || 0})</h3>
      <div className="ranking-table">
        <div className="ranking-header">
          <span>Jogador</span>
          {(f?.colunasPagamento || []).map((c) => <span key={c}>{c}</span>)}
          <span>Total</span>
        </div>
        {(f?.pessoas || []).map((p, i) => (
          <div key={p.nome + i} className="ranking-row">
            <span className="rank-name">{p.nome}</span>
            {(f.colunasPagamento || []).map((c, j) => {
              const pg = p.pagamentos[j];
              return (
                <span key={c} className={`rank-extra ${pg?.valor ? "bdt-ok" : "bdt-pend"}`}>
                  {pg?.valor ? brl(pg.valor) : (pg?.marca || "—")}
                </span>
              );
            })}
            <span className="rank-pts">{brl(p.total)}</span>
          </div>
        ))}
      </div>

      <h3 className="bdt-sub">Saídas ({f?.debitos?.length || 0})</h3>
      <div className="ranking-table">
        {(f?.debitos || []).map((d, i) => (
          <div key={i} className="ranking-row">
            <span className="rank-name">{d.descricao || "—"}</span>
            <span className="rank-pts">{brl(d.valor)}</span>
          </div>
        ))}
      </div>

      <button className="btn-secondary" onClick={() => setView("admin")}>Voltar ao painel</button>
    </Secao>
  );
}

// ============================================================
// IMPORTAR PLANILHA (SO ADMIN)
// ============================================================
function ImportarView({ setView, aoImportar }) {
  const [etapa, setEtapa] = useState("escolher"); // escolher | lendo | conferir | salvando | pronto
  const [erro, setErro] = useState("");
  const [previa, setPrevia] = useState(null);
  const [arquivo, setArquivo] = useState("");

  async function lerArquivo(file) {
    if (!file) return;
    setErro(""); setArquivo(file.name); setEtapa("lendo");
    try {
      const XLSX = await import("xlsx");
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array", cellDates: true });
      const d = lerPlanilha(wb, XLSX);
      if (!Object.keys(d.anos).length) {
        setErro('Não achei nenhuma aba no formato "2026 AWARDS". Conferiu se é a planilha certa?');
        setEtapa("escolher"); return;
      }
      setPrevia(d); setEtapa("conferir");
    } catch (e) {
      setErro("Não consegui ler o arquivo: " + e.message);
      setEtapa("escolher");
    }
  }

  async function publicar() {
    setEtapa("salvando");
    const { financeiro, ...publico } = previa;
    const e1 = await salvarDadosDB(publico);
    const e2 = await salvarFinanceiroDB(financeiro);
    if (e1 || e2) { setErro("Erro ao salvar: " + (e1 || e2)); setEtapa("conferir"); return; }
    aoImportar(publico, financeiro);
    setEtapa("pronto");
  }

  if (etapa === "pronto") {
    return (
      <Secao titulo="✅ Importado" sub={arquivo}>
        <div className="sucesso-banner">Planilha publicada. Todo mundo já está vendo os dados novos.</div>
        <button className="btn-primary" onClick={() => setView("home")}>Ver o site</button>
      </Secao>
    );
  }

  return (
    <Secao titulo="📥 Importar planilha" sub="A planilha continua sendo a fonte da verdade. O site só espelha ela.">
      {erro && <div className="error-msg">{erro}</div>}

      {etapa === "escolher" && (
        <>
          <label className="bdt-drop">
            <span className="bdt-drop-ico">📄</span>
            <span className="bdt-drop-txt">Escolher o arquivo Buteco_do_Toni.xlsx</span>
            <span className="bdt-drop-sub">Toque aqui para selecionar</span>
            <input
              type="file"
              accept=".xlsx,.xlsm,.xls"
              style={{ display: "none" }}
              onChange={(e) => lerArquivo(e.target.files[0])}
            />
          </label>
          <p className="bdt-nota">
            Nada é publicado antes de você conferir. O passo seguinte mostra o que foi entendido
            do arquivo e só então aparece o botão de publicar.
          </p>
        </>
      )}

      {etapa === "lendo" && <Vazio>Lendo {arquivo}...</Vazio>}

      {(etapa === "conferir" || etapa === "salvando") && previa && (
        <>
          <div className="bdt-alerta bdt-alerta-info">
            Confira antes de publicar. Se algum número estiver estranho, cancele — provavelmente
            a estrutura da planilha mudou.
          </div>

          {previa.avisos.map((a, i) => <div key={i} className="bdt-alerta">⚠️ {a}</div>)}

          <div className="ranking-table">
            <div className="ranking-header"><span>Ano</span><span>Ranking</span><span>Artilharia</span><span>Semanas</span><span>Campeão</span></div>
            {Object.values(previa.anos).sort((a, b) => b.ano - a.ano).map((a) => (
              <div key={a.ano} className="ranking-row">
                <span className="rank-pos">{a.ano}</span>
                <span className="rank-extra">{a.ranking.length}</span>
                <span className="rank-extra">{a.artilharia.length || "—"}</span>
                <span className="rank-extra">{a.semanas.length}</span>
                <span className="rank-name">{a.ranking[0]?.nome || "—"}</span>
              </div>
            ))}
          </div>

          <h3 className="bdt-sub">Financeiro</h3>
          <div className="ranking-table">
            <div className="ranking-header"><span>Ano</span><span>Pessoas</span><span>Em caixa</span></div>
            {Object.keys(previa.financeiro).sort((a, b) => b - a).map((y) => (
              <div key={y} className="ranking-row">
                <span className="rank-pos">{y}</span>
                <span className="rank-extra">{previa.financeiro[y].pessoas.length}</span>
                <span className="rank-pts">{brl(previa.financeiro[y].emCaixa)}</span>
              </div>
            ))}
          </div>
          {Object.values(previa.financeiro).flatMap((f) => f.conferencia).map((c, i) => (
            <div key={i} className="bdt-alerta">⚠️ {c}</div>
          ))}

          <h3 className="bdt-sub">Uniformes</h3>
          <p className="bdt-nota">{previa.uniformes.jogadores.length} jogadores com número e tamanho.</p>

          <div className="hero-actions">
            <button className="btn-primary" onClick={publicar} disabled={etapa === "salvando"}>
              {etapa === "salvando" ? "Publicando..." : "Confirmar e publicar"}
            </button>
            <button className="btn-secondary" onClick={() => { setPrevia(null); setEtapa("escolher"); }}>
              Cancelar
            </button>
          </div>
        </>
      )}
    </Secao>
  );
}

// ============================================================
// ADMIN
// ============================================================
function AdminLogin({ setIsAdmin, setView }) {
  const [pwd, setPwd] = useState("");
  const [err, setErr] = useState(false);
  const go = () => {
    if (pwd === ADMIN_PWD) { localStorage.setItem(K_ADM, "true"); setIsAdmin(true); setView("admin"); }
    else { setErr(true); setTimeout(() => setErr(false), 2000); }
  };
  return (
    <Secao titulo="⚙️ Admin">
      <div className="login-card">
        <input className="placar-input" type="password" placeholder="Senha" value={pwd}
          onChange={(e) => setPwd(e.target.value)} onKeyDown={(e) => e.key === "Enter" && go()} />
        {err && <div className="error-msg">Senha incorreta</div>}
        <button className="btn-primary btn-full" onClick={go}>Entrar</button>
      </div>
    </Secao>
  );
}

function AdminPanel({ setView, dados }) {
  return (
    <Secao titulo="⚙️ Painel do admin" sub={dados?.atualizadoEm ? `Última importação: ${new Date(dados.atualizadoEm).toLocaleString("pt-BR")}` : "Nada importado ainda"}>
      <div className="hero-grid">
        <div className="card" onClick={() => setView("importar")}>
          <span className="card-icon">📥</span>
          <span className="card-title">Importar planilha</span>
          <span className="card-sub">Atualiza o site com o .xlsx</span>
        </div>
        <div className="card" onClick={() => setView("caixa")}>
          <span className="card-icon">💰</span>
          <span className="card-title">Caixa</span>
          <span className="card-sub">Mensalidades e saídas</span>
        </div>
      </div>
      <p className="bdt-nota">
        O financeiro fica numa linha separada do banco e só é baixado aqui dentro — não vai junto
        com os dados que o grupo carrega. Ainda assim, quem souber mexer na API do Supabase
        consegue chegar nele: a proteção é contra curiosidade, não contra alguém determinado.
      </p>
    </Secao>
  );
}

// ============================================================
// APP
// ============================================================
export default function App() {
  const [view, setView] = useState("home");
  const [aba, setAba] = useState("ranking");
  const [dados, setDados] = useState(null);
  const [financeiro, setFinanceiro] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [isAdmin, setIsAdmin] = useState(() => localStorage.getItem(K_ADM) === "true");
  const [ano, setAno] = useState(null);
  const [toques, setToques] = useState(0);

  useEffect(() => {
    let ativo = true;
    async function carregar() {
      const d = await carregarDadosDB();
      if (!ativo) return;
      setDados(d);
      setCarregando(false);
      setAno((atual) => atual ?? d?.anosDetalhados?.[0] ?? null);
    }
    carregar();
    const ch = supabase.channel("bdt")
      .on("postgres_changes", { event: "*", schema: "public", table: "bdt_dados" }, () => carregar())
      .subscribe();
    return () => { ativo = false; supabase.removeChannel(ch); };
  }, []);

  useEffect(() => {
    if (isAdmin && !financeiro) carregarFinanceiroDB().then((f) => f && setFinanceiro(f));
  }, [isAdmin, financeiro]);

  const logoClick = () => {
    const n = toques + 1;
    setToques(n);
    if (n >= 5) { setToques(0); setView(isAdmin ? "admin" : "admin-login"); }
    setTimeout(() => setToques(0), 3000);
  };

  const aoImportar = (pub, fin) => {
    setDados({ ...pub, atualizadoEm: new Date().toISOString() });
    setFinanceiro(fin);
    setAno(pub?.anosDetalhados?.[0] ?? null);
  };

  const semDados = !carregando && !dados;

  return (
    <div className="app">
      <Header aba={aba} setAba={setAba} setView={setView} />
      <main className="main">
        {carregando && <Vazio>Carregando...</Vazio>}

        {semDados && view !== "importar" && view !== "admin-login" && view !== "admin" && (
          <Secao titulo="Nada importado ainda" sub="O site fica vazio até a primeira planilha subir.">
            <p className="bdt-nota">
              Se você é o admin: toque 5 vezes no troféu no rodapé, entre e use “Importar planilha”.
            </p>
          </Secao>
        )}

        {!carregando && dados && view === "home" && <Home dados={dados} setAba={setAba} setView={setView} />}

        {!carregando && dados && view === "secao" && (
          <>
            {aba === "ranking" && <RankingView dados={dados} ano={ano} setAno={setAno} />}
            {aba === "artilharia" && (
              <ListaGols dados={dados} ano={ano} setAno={setAno} campo="artilharia"
                titulo="⚽ Artilharia" sub={`Goleadores de ${ano}`} rotuloGols="Gols" mostrarMedia={false} />
            )}
            {aba === "vazado" && (
              <ListaGols dados={dados} ano={ano} setAno={setAno} campo="menosVazado"
                titulo="🧤 Menos Vazado" sub={`Goleiros de ${ano}`} rotuloGols="Sofridos" mostrarMedia />
            )}
            {aba === "semanas" && <SemanasView dados={dados} ano={ano} setAno={setAno} />}
            {aba === "uniformes" && <UniformesView dados={dados} />}
            {aba === "hall" && <HallView dados={dados} />}
          </>
        )}

        {view === "admin-login" && <AdminLogin setIsAdmin={setIsAdmin} setView={setView} />}
        {view === "admin" && isAdmin && <AdminPanel setView={setView} dados={dados} />}
        {view === "importar" && isAdmin && <ImportarView setView={setView} aoImportar={aoImportar} />}
        {view === "caixa" && isAdmin && <CaixaView financeiro={financeiro} setView={setView} />}
      </main>

      <footer className="footer">
        <span>
          Buteco do Toni
          {dados?.atualizadoEm && ` · atualizado em ${new Date(dados.atualizadoEm).toLocaleDateString("pt-BR")}`}
          {isAdmin && (
            <>
              <span className="admin-badge" onClick={() => setView("admin")}>⚙️ Admin</span>
              <span className="admin-badge" style={{ marginLeft: 6 }}
                onClick={() => { localStorage.removeItem(K_ADM); setIsAdmin(false); setFinanceiro(null); setView("home"); }}>
                Sair
              </span>
            </>
          )}
        </span>
        <span onClick={logoClick} style={{ cursor: "default", userSelect: "none" }}>🏆</span>
      </footer>
    </div>
  );
}
