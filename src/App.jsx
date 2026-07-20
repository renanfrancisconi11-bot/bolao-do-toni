import React, { useState, useEffect, useMemo } from "react";
import "./App.css";
import logo from "./logo.png";
import {
  carregarDadosDB, carregarSecretoDB, carregarFinanceiroDB, carregarConfigDB,
  salvarDadosDB, salvarSecretoDB, salvarFinanceiroDB, salvarConfigDB, supabase,
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
  { id: "pagar",    rotulo: "Pagar",        icone: "💸" },
];

const brl = (v) =>
  v === null || v === undefined || isNaN(v)
    ? "—"
    : v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const medalha = (i) => (i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : "");

// ============================================================
// SEGREDO: separa o que o grupo pode ver do que so o admin ve.
// O ranking/artilharia/menos vazado dos anos ocultos NAO entram
// no pacote publico - eles nem sao baixados por quem nao e admin.
// A aba Semanas continua aberta.
// ============================================================
function montarHall(anos) {
  return Object.values(anos)
    .sort((a, b) => b.ano - a.ano)
    .map((a) => ({ ano: a.ano, podio: (a.ranking || []).slice(0, 3).map((p) => ({ nome: p.nome, pontos: p.pontos })) }))
    .filter((h) => h.podio.length > 0);
}

export function dividirSegredo(dados, anosOcultos) {
  const ocultos = (anosOcultos || []).map(Number);
  const publico = { ...dados, anos: {}, anosOcultos: ocultos };
  const secreto = { anos: {} };
  delete publico.financeiro;

  Object.values(dados.anos).forEach((a) => {
    if (ocultos.includes(a.ano)) {
      publico.anos[a.ano] = {
        ano: a.ano, aba: a.aba, oculto: true,
        ranking: [], artilharia: [], menosVazado: [], semanas: a.semanas,
      };
      secreto.anos[a.ano] = {
        ano: a.ano, ranking: a.ranking, artilharia: a.artilharia, menosVazado: a.menosVazado,
      };
    } else {
      publico.anos[a.ano] = a;
    }
  });

  publico.hallDaFama = montarHall(publico.anos);
  return { publico, secreto, financeiro: dados.financeiro };
}

// Junta o secreto de volta (usado pelo admin e no botao "liberar")
function juntarSegredo(publico, secreto) {
  if (!publico || !secreto || !secreto.anos) return publico;
  const anos = { ...publico.anos };
  Object.values(secreto.anos).forEach((s) => {
    if (anos[s.ano]) anos[s.ano] = { ...anos[s.ano], ...s, oculto: false };
  });
  return { ...publico, anos, anosOcultos: [], hallDaFama: montarHall(anos) };
}

function Trancado({ ano }) {
  return (
    <div className="bdt-trancado">
      <span className="bdt-trancado-ico">🔒</span>
      <span className="bdt-trancado-tit">Segredo até a festa</span>
      <span className="bdt-trancado-sub">
        A classificação de {ano} só é revelada na festa de fim de ano.
      </span>
    </div>
  );
}

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
function Home({ dados, setAba, setView, segredo }) {
  const anoAtual = dados?.anosDetalhados?.[0];
  const ano = anoAtual ? dados.anos[anoAtual] : null;
  // A TELA decide. Nao olha marca nenhuma dentro dos dados.
  const oculto = !!(segredo?.ativo && Number(anoAtual) === Number(segredo?.ano));
  const top3 = ano && !oculto ? ano.ranking.slice(0, 3) : [];
  const art = oculto ? null : ano?.artilharia?.[0];
  const ir = (a) => { setAba(a); setView("secao"); };

  // A última noite jogada é a manchete do site.
  const ultima = ano?.semanas?.length ? ano.semanas[ano.semanas.length - 1] : null;
  const acha = (rot) => ultima?.destaques?.find((d) => d.rotulo === rot)?.nome || null;
  const abacaxi = acha("Abacaxi");
  const separou = acha("Separou");
  const podio = ["1º", "2º", "3º"].map((r) => ({ rot: r, nome: acha(r) })).filter((x) => x.nome);

  return (
    <section className="hero">
      <div className="hero-bg"><div className="hero-orb hero-orb-1" /><div className="hero-orb hero-orb-2" /></div>
      <div className="hero-content">
        <span className="hero-badge anim anim-1">{anoAtual ? `TEMPORADA ${anoAtual}` : "BUTECO DO TONI"}</span>
        <h1 className="hero-title anim anim-1">
          TONI <span className="hero-title-accent">BALLON&apos;DOR</span>
        </h1>
        <p className="hero-sub anim anim-2">
          {ano
            ? `${ano.ranking.length ? ano.ranking.length + " jogadores · " : ""}${ano.semanas.length} noites jogadas`
            : "Nenhuma planilha importada ainda."}
        </p>

        {ultima && (
          <div className="noite anim anim-2">
            <div className="noite-esq">
              <div className="noite-topo">
                <span className="noite-eyebrow">Última noite</span>
                <span className="noite-num">{String(ultima.numero).padStart(2, "0")}</span>
                <span className="noite-data">{ultima.data}</span>
              </div>
              <div className="noite-lista">
                {podio.map((p, i) => (
                  <div key={p.rot} className="noite-linha">
                    <span className="noite-pos">{medalha(i)}</span>
                    <span className="noite-nome">{p.nome}</span>
                  </div>
                ))}
                {podio.length === 0 && <span className="card-sub">Sem destaques lançados nessa noite.</span>}
              </div>
            </div>
            {abacaxi && (
              <div className="noite-dir">
                <span className="noite-abacaxi-ico">🍍</span>
                <div>
                  <div className="noite-abacaxi-rot">Abacaxi</div>
                  <div className="noite-abacaxi-nome">{abacaxi}</div>
                </div>
              </div>
            )}
            {separou && (
              <div className="noite-sep">Times separados por <strong>{separou}</strong></div>
            )}
          </div>
        )}

        {oculto && (
          <div className="hero-podium hero-podium-lock anim anim-3">
            <span className="bdt-trancado-ico">🔒</span>
            <span className="bdt-trancado-tit">Classificação em segredo</span>
            <span className="bdt-trancado-sub">Só na festa de fim de ano.</span>
          </div>
        )}

        {top3.length > 0 && (
          <div className="hero-podium anim anim-3">
            {top3.map((p, i) => (
              <div key={p.nome} className="podium-item">
                <span className="podium-medal">{medalha(i)}</span>
                <span className="podium-name">{p.nome}</span>
                <span className="podium-pts">{p.pontos} pts</span>
              </div>
            ))}
          </div>
        )}

        <div className="hero-grid anim anim-3">
          <div className="card" onClick={() => ir("ranking")}>
            <span className="card-icon">🏆</span>
            <span className="card-title">Ranking</span>
            <span className="card-sub">{oculto ? "🔒 Segredo até a festa" : "Classificação da temporada"}</span>
          </div>
          <div className="card" onClick={() => ir("artilharia")}>
            <span className="card-icon">⚽</span>
            <span className="card-title">Artilharia</span>
            <span className="card-sub">{oculto ? "🔒 Segredo até a festa" : (art ? `${art.nome} · ${art.gols} gols` : "Goleadores")}</span>
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
          <div className="card" onClick={() => ir("pagar")}>
            <span className="card-icon">💸</span>
            <span className="card-title">Pagar</span>
            <span className="card-sub">Anuidade via PIX</span>
          </div>
        </div>
      </div>
    </section>
  );
}

// ============================================================
// RANKING
// ============================================================
function RankingView({ dados, ano, setAno, segredo }) {
  const a = dados?.anos?.[ano];
  const trancado = !!(segredo?.ativo && Number(ano) === Number(segredo?.ano));
  return (
    <Secao titulo="🏆 Ranking" sub={a && !trancado ? `Toni Ballon'Dor ${ano} · ${a.ranking.length} jogadores` : ""}>
      <SeletorAno anos={dados?.anosDetalhados} ano={ano} setAno={setAno} />
      {trancado ? <Trancado ano={ano} /> : !a ? <Vazio>Sem dados para {ano}.</Vazio> : (
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
function ListaGols({ dados, ano, setAno, campo, titulo, sub, rotuloGols, mostrarMedia, segredo }) {
  const a = dados?.anos?.[ano];
  const trancado = !!(segredo?.ativo && Number(ano) === Number(segredo?.ano));
  const lista = trancado ? [] : (a?.[campo] || []);
  return (
    <Secao titulo={titulo} sub={sub}>
      <SeletorAno anos={dados?.anosDetalhados} ano={ano} setAno={setAno} />
      {trancado ? <Trancado ano={ano} /> : lista.length === 0 ? <Vazio>Sem dados de {titulo.toLowerCase()} para {ano}.</Vazio> : (
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
      {mostrarMedia && lista.length > 0 && !trancado && (
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
function HallView({ dados, segredo }) {
  const hall = (dados?.hallDaFama || []).filter(
    (h) => !(segredo?.ativo && Number(h.ano) === Number(segredo?.ano))
  );
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
// PAGAR — pagina publica de PIX.
// Nao mostra quem pagou e quem nao pagou: so a chave e o valor.
// Tudo aqui e configurado pelo admin, nada vem da planilha.
// ============================================================
function PagarView({ pix }) {
  const [copiado, setCopiado] = useState("");

  const copiar = async (texto, qual) => {
    try {
      await navigator.clipboard.writeText(texto);
    } catch {
      const t = document.createElement("textarea");
      t.value = texto; document.body.appendChild(t); t.select();
      document.execCommand("copy"); document.body.removeChild(t);
    }
    setCopiado(qual);
    setTimeout(() => setCopiado(""), 2200);
  };

  const temAlgo = pix?.chave || pix?.qr || pix?.codigo;

  return (
    <Secao titulo="💸 Pagar" sub="Anuidade do Buteco do Toni">
      {!temAlgo ? (
        <Vazio>O admin ainda não cadastrou os dados de pagamento.</Vazio>
      ) : (
        <div className="pix-wrap">
          <div className="pix-qr">
            {pix.qr ? (
              <img className="pix-qr-img" src={pix.qr} alt="QR Code do PIX" />
            ) : (
              <div className="pix-qr-vazio">
                <span style={{ fontSize: 30 }}>📱</span>
                <span>Sem QR Code. Use a chave ao lado.</span>
              </div>
            )}
            {pix.valor && (
              <div style={{ textAlign: "center" }}>
                <div className="pix-valor-rot">Valor</div>
                <div className="pix-valor">{pix.valor}</div>
              </div>
            )}
          </div>

          <div>
            {pix.chave && (
              <div className="pix-bloco">
                <span className="bdt-label">Chave PIX</span>
                <div className="pix-chave">{pix.chave}</div>
                <button className="btn-primary" onClick={() => copiar(pix.chave, "chave")}>
                  Copiar chave
                </button>
                {copiado === "chave" && <span className="pix-copiado">Copiado</span>}
              </div>
            )}

            {pix.codigo && (
              <div className="pix-bloco">
                <span className="bdt-label">PIX copia e cola</span>
                <div className="pix-chave">{pix.codigo.slice(0, 90)}{pix.codigo.length > 90 ? "…" : ""}</div>
                <button className="btn-secondary" onClick={() => copiar(pix.codigo, "codigo")}>
                  Copiar código
                </button>
                {copiado === "codigo" && <span className="pix-copiado">Copiado</span>}
              </div>
            )}

            {pix.obs && (
              <div className="pix-bloco">
                <span className="bdt-label">Observações</span>
                <div className="pix-obs">{pix.obs}</div>
              </div>
            )}

            <p className="bdt-nota">
              Depois de pagar, mande o comprovante para o organizador. Esta página não registra
              pagamento — quem controla isso é a planilha.
            </p>
          </div>
        </div>
      )}
    </Secao>
  );
}

function PixForm({ pix, salvarPix, setView, ocupado }) {
  const [f, setF] = useState({ chave: "", valor: "", codigo: "", obs: "", qr: "", ...(pix || {}) });
  const [erro, setErro] = useState("");
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  const lerImagem = (file) => {
    if (!file) return;
    if (file.size > 400000) { setErro("Imagem muito grande. Use uma abaixo de 400 KB."); return; }
    const r = new FileReader();
    r.onload = () => { setErro(""); setF((a) => ({ ...a, qr: r.result })); };
    r.readAsDataURL(file);
  };

  return (
    <Secao titulo="💸 Dados de pagamento" sub="Aparece na aba Pagar, para todo mundo">
      {erro && <div className="error-msg">{erro}</div>}
      <div className="bdt-form">
        <div>
          <span className="bdt-label">Chave PIX</span>
          <input className="bdt-campo" value={f.chave} onChange={set("chave")}
            placeholder="CPF, celular, e-mail ou chave aleatória" />
        </div>
        <div>
          <span className="bdt-label">Valor</span>
          <input className="bdt-campo" value={f.valor} onChange={set("valor")} placeholder="R$ 250,00" />
        </div>
        <div>
          <span className="bdt-label">PIX copia e cola (opcional)</span>
          <textarea className="bdt-campo" value={f.codigo} onChange={set("codigo")}
            placeholder="Cole aqui o código que o banco gera" />
        </div>
        <div>
          <span className="bdt-label">Observações (opcional)</span>
          <textarea className="bdt-campo" value={f.obs} onChange={set("obs")}
            placeholder="Ex: mande o comprovante no grupo" />
        </div>
        <div>
          <span className="bdt-label">QR Code (opcional)</span>
          <label className="bdt-drop">
            <span className="bdt-drop-ico">{f.qr ? "✅" : "🖼️"}</span>
            <span className="bdt-drop-txt">{f.qr ? "Trocar imagem" : "Escolher imagem do QR"}</span>
            <span className="bdt-drop-sub">Salve o QR pelo app do banco. Até 400 KB.</span>
            <input type="file" accept="image/*" style={{ display: "none" }}
              onChange={(e) => lerImagem(e.target.files[0])} />
          </label>
          {f.qr && (
            <div style={{ marginTop: 12, display: "flex", gap: 10, alignItems: "center" }}>
              <img src={f.qr} alt="Prévia" style={{ width: 84, height: 84, objectFit: "contain",
                background: "#fff", borderRadius: 8, padding: 5 }} />
              <button className="btn-secondary" onClick={() => setF({ ...f, qr: "" })}>Remover</button>
            </div>
          )}
        </div>
        <div className="hero-actions">
          <button className="btn-primary" disabled={ocupado} onClick={() => salvarPix(f)}>
            {ocupado ? "Salvando..." : "Salvar"}
          </button>
          <button className="btn-secondary" onClick={() => setView("admin")}>Voltar</button>
        </div>
      </div>
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
function ImportarView({ setView, aoImportar, anosOcultos }) {
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
    const { publico, secreto, financeiro } = dividirSegredo(previa, anosOcultos);
    const e1 = await salvarDadosDB(publico);
    const e2 = await salvarSecretoDB(secreto);
    const e3 = await salvarFinanceiroDB(financeiro);
    if (e1 || e2 || e3) { setErro("Erro ao salvar: " + (e1 || e2 || e3)); setEtapa("conferir"); return; }
    aoImportar(publico, secreto, financeiro);
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

          {(anosOcultos || []).length > 0 && (
            <div className="bdt-alerta">
              🔒 Ranking, artilharia e menos vazado de {anosOcultos.join(", ")} vão para a área
              secreta — o grupo não recebe esses números. A aba Semanas continua aberta.
            </div>
          )}

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

function AdminPanel({ setView, dados, liberado, anoSecreto, vazando, alternarSegredo, ocupado }) {
  const anoAlvo = anoSecreto;
  const oculto = !liberado;
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
        <div className="card" onClick={() => setView("pix")}>
          <span className="card-icon">💸</span>
          <span className="card-title">Dados do PIX</span>
          <span className="card-sub">Chave, valor e QR da aba Pagar</span>
        </div>
      </div>

      {anoAlvo && vazando > 0 && (
        <div className="bdt-alerta" style={{ marginTop: 16 }}>
          ⚠️ <strong>O pacote público ainda carrega os números de {anoAlvo}</strong> ({vazando} linhas
          entre ranking e artilharia). As telas já estão escondendo, mas o dado continua sendo baixado
          pelo navegador de quem entra no site — quem abrir o F12 consegue ler.
          {oculto && " Clique em \"Reprocessar agora\" abaixo para limpar. Não precisa da planilha."}
        </div>
      )}

      {anoAlvo && vazando === 0 && oculto && (
        <div className="bdt-alerta bdt-alerta-info" style={{ marginTop: 16 }}>
          ✅ Pacote público limpo: nenhuma linha de ranking ou artilharia de {anoAlvo} está sendo
          enviada para o grupo.
        </div>
      )}

      {anoAlvo && (
        <div className={`bdt-segredo ${oculto ? "fechado" : "aberto"}`}>
          <div className="bdt-segredo-txt">
            <span className="bdt-segredo-tit">{oculto ? "🔒" : "🔓"} Classificação {anoAlvo}</span>
            <span className="bdt-segredo-sub">
              {oculto
                ? "Ranking, artilharia e menos vazado escondidos do grupo. Só a aba Semanas está aberta."
                : "LIBERADO — todo mundo está vendo a pontuação de " + anoAlvo + "."}
            </span>
          </div>
          <div className="hero-actions">
            {oculto && vazando > 0 && (
              <button className="btn-primary" disabled={ocupado}
                onClick={() => alternarSegredo(true)}>
                {ocupado ? "Limpando..." : "Reprocessar agora"}
              </button>
            )}
            <button
              className={oculto && vazando === 0 ? "btn-primary" : "btn-secondary"}
              disabled={ocupado}
              onClick={() => {
                const msg = oculto
                  ? `Liberar a classificação de ${anoAlvo} para TODO o grupo? Isso revela a pontuação na hora.`
                  : `Esconder de novo a classificação de ${anoAlvo}?`;
                if (window.confirm(msg)) alternarSegredo(!oculto);
              }}
            >
              {ocupado ? "Salvando..." : oculto ? "Liberar na festa 🎉" : "Esconder de novo"}
            </button>
          </div>
        </div>
      )}
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
  const [secreto, setSecreto] = useState(null);
  const [config, setConfig] = useState(null);
  const [financeiro, setFinanceiro] = useState(null);
  const [ocupado, setOcupado] = useState(false);
  const [carregando, setCarregando] = useState(true);
  const [isAdmin, setIsAdmin] = useState(() => localStorage.getItem(K_ADM) === "true");
  const [ano, setAno] = useState(null);
  const [toques, setToques] = useState(0);

  useEffect(() => {
    let ativo = true;
    async function carregar() {
      const [d, c] = await Promise.all([carregarDadosDB(), carregarConfigDB()]);
      if (!ativo) return;
      setDados(d);
      setConfig(c);
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
    if (!isAdmin) return;
    if (!financeiro) carregarFinanceiroDB().then((f) => f && setFinanceiro(f));
    if (!secreto) carregarSecretoDB().then((s) => s && setSecreto(s));
  }, [isAdmin, financeiro, secreto]);

  // FONTE UNICA DA VERDADE. So fica aberto se config.liberado for
  // exatamente true. Sem config, config quebrada, banco fora do ar:
  // tudo isso resulta em FECHADO.
  const liberado = config?.liberado === true;
  const anoSecreto = dados?.anosDetalhados?.[0] ?? null;
  const anosOcultos = useMemo(
    () => (liberado || anoSecreto === null ? [] : [Number(anoSecreto)]),
    [liberado, anoSecreto]
  );

  // A TELA decide sozinha. Nao pergunta nada aos dados.
  const segredo = useMemo(
    () => ({ ativo: !liberado && !isAdmin, ano: anoSecreto }),
    [liberado, isAdmin, anoSecreto]
  );

  // Diagnostico: o pacote publico ainda carrega a pontuacao?
  const vazando = (dados?.anos?.[anoSecreto]?.ranking?.length || 0)
                + (dados?.anos?.[anoSecreto]?.artilharia?.length || 0);

  // O admin ve tudo: junta o secreto de volta so na tela dele
  const dadosVisiveis = useMemo(
    () => (isAdmin && secreto ? juntarSegredo(dados, secreto) : dados),
    [isAdmin, secreto, dados]
  );

  // Reprocessa o que ja esta no banco. Nao precisa da planilha.
  async function alternarSegredo(esconder) {
    setOcupado(true);
    try {
      const completo = juntarSegredo(dados, secreto) || dados;
      const alvo = esconder && anoSecreto !== null ? [Number(anoSecreto)] : [];
      const { publico, secreto: novoSecreto } = dividirSegredo(completo, alvo);
      const e1 = await salvarDadosDB(publico);
      const e2 = await salvarSecretoDB(novoSecreto);
      // preserva o resto da config (dados do PIX) em vez de sobrescrever
      const novaConfig = { ...(config || {}), liberado: !esconder };
      const e3 = await salvarConfigDB(novaConfig);
      if (e1 || e2 || e3) { window.alert("Erro ao salvar: " + (e1 || e2 || e3)); return; }
      setDados({ ...publico, atualizadoEm: dados?.atualizadoEm });
      setSecreto(novoSecreto);
      setConfig(novaConfig);
    } finally {
      setOcupado(false);
    }
  }

  const logoClick = () => {
    const n = toques + 1;
    setToques(n);
    if (n >= 5) { setToques(0); setView(isAdmin ? "admin" : "admin-login"); }
    setTimeout(() => setToques(0), 3000);
  };

  async function salvarPix(pix) {
    setOcupado(true);
    try {
      const novaConfig = { ...(config || {}), pix };
      const e = await salvarConfigDB(novaConfig);
      if (e) { window.alert("Erro ao salvar: " + e); return; }
      setConfig(novaConfig);
      setView("admin");
    } finally { setOcupado(false); }
  }

  const aoImportar = (pub, sec, fin) => {
    setDados({ ...pub, atualizadoEm: new Date().toISOString() });
    setSecreto(sec);
    setFinanceiro(fin);
    setAno(pub?.anosDetalhados?.[0] ?? null);
  };

  const semDados = !carregando && !dados;

  return (
    <div className="app">
      <Header aba={aba} setAba={setAba} setView={setView} />
      <main className="main">
        {carregando && <Vazio>Carregando...</Vazio>}

        {semDados && view === "secao" && aba === "pagar" && <PagarView pix={config?.pix} />}

        {semDados && aba !== "pagar" && view !== "importar" && view !== "admin-login" && view !== "admin" && (
          <Secao titulo="Nada importado ainda" sub="O site fica vazio até a primeira planilha subir.">
            <p className="bdt-nota">
              Se você é o admin: toque 5 vezes no troféu no rodapé, entre e use “Importar planilha”.
            </p>
          </Secao>
        )}

        {!carregando && dados && view === "home" && <Home dados={dadosVisiveis} setAba={setAba} setView={setView} segredo={segredo} />}

        {!carregando && dados && view === "secao" && (
          <>
            {aba === "ranking" && <RankingView dados={dadosVisiveis} ano={ano} setAno={setAno} segredo={segredo} />}
            {aba === "artilharia" && (
              <ListaGols dados={dadosVisiveis} ano={ano} setAno={setAno} campo="artilharia"
                titulo="⚽ Artilharia" sub={`Goleadores de ${ano}`} rotuloGols="Gols" mostrarMedia={false} segredo={segredo} />
            )}
            {aba === "vazado" && (
              <ListaGols dados={dadosVisiveis} ano={ano} setAno={setAno} campo="menosVazado"
                titulo="🧤 Menos Vazado" sub={`Goleiros de ${ano}`} rotuloGols="Sofridos" mostrarMedia segredo={segredo} />
            )}
            {aba === "semanas" && <SemanasView dados={dadosVisiveis} ano={ano} setAno={setAno} />}
            {aba === "uniformes" && <UniformesView dados={dadosVisiveis} />}
            {aba === "hall" && <HallView dados={dadosVisiveis} segredo={segredo} />}
            {aba === "pagar" && <PagarView pix={config?.pix} />}
          </>
        )}

        {view === "admin-login" && <AdminLogin setIsAdmin={setIsAdmin} setView={setView} />}
        {view === "admin" && isAdmin && <AdminPanel setView={setView} dados={dados} liberado={liberado} anoSecreto={anoSecreto} vazando={vazando} alternarSegredo={alternarSegredo} ocupado={ocupado} />}
        {view === "importar" && isAdmin && <ImportarView setView={setView} aoImportar={aoImportar} anosOcultos={anosOcultos} />}
        {view === "caixa" && isAdmin && <CaixaView financeiro={financeiro} setView={setView} />}
        {view === "pix" && isAdmin && <PixForm pix={config?.pix} salvarPix={salvarPix} setView={setView} ocupado={ocupado} />}
      </main>

      <footer className="footer">
        <span>
          Buteco do Toni
          {dados?.atualizadoEm && ` · atualizado em ${new Date(dados.atualizadoEm).toLocaleDateString("pt-BR")}`}
          {isAdmin && (
            <>
              <span className="admin-badge" onClick={() => setView("admin")}>⚙️ Admin</span>
              <span className="admin-badge" style={{ marginLeft: 6 }}
                onClick={() => { localStorage.removeItem(K_ADM); setIsAdmin(false); setFinanceiro(null); setSecreto(null); setView("home"); }}>
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
