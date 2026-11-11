import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "./supabase";

// ============================================================
// ENQUETES — votação dos prêmios do ano
// Os votos ficam no Supabase numa tabela que o site NÃO lê.
// Tudo passa pelas funções do arquivo supabase/enquetes.sql.
// ============================================================

// Fim da votação: 21/11/2026 às 23h59 (horário de Brasília).
// O banco também bloqueia depois desse horário.
const FIM = new Date("2026-11-21T23:59:59-03:00");
const encerrou = () => Date.now() > FIM.getTime();

const K_EU = "bdt_enquete_eu2";       // nome que este aparelho escolheu
const K_PIN = "bdt_enquete_pin2";     // senha (número da camisa) desse nome
const K_SENHA = "bdt_enquete_senha";  // senha dos votos (só na sessão do admin)

async function rpc(nome, args) {
  const { data, error } = await supabase.rpc(nome, args || {});
  if (error) return { erro: error.message };
  return { data };
}

function useEnquetes() {
  const [enquetes, setEnquetes] = useState(null);
  const [votaram, setVotaram] = useState([]); // [{enquete_id, eleitor}]
  const [erro, setErro] = useState(null);

  const carregar = useCallback(async () => {
    const { data, error } = await supabase
      .from("bdt_enquetes").select("*").order("ordem", { ascending: true });
    if (error) { setErro(error.message); setEnquetes([]); return; }
    setEnquetes(data || []);
    const q = await rpc("bdt_quem_votou");
    if (!q.erro) setVotaram(q.data || []);
  }, []);

  useEffect(() => {
    carregar();
    const t = setInterval(carregar, 30000);
    return () => clearInterval(t);
  }, [carregar]);

  return { enquetes, votaram, erro, carregar };
}

const agrupar = (linhas) => {
  const r = {};
  (linhas || []).forEach((l) => { (r[l.enquete_id] = r[l.enquete_id] || []).push(l); });
  return r;
};

function Barras({ linhas, total }) {
  if (!linhas || linhas.length === 0) return <div className="enq-vazio">Nenhum voto ainda.</div>;
  const max = Math.max(...linhas.map((l) => Number(l.votos)));
  return (
    <div className="enq-barras">
      {linhas.map((l, i) => {
        const v = Number(l.votos);
        const lider = v === max;
        return (
          <div key={l.candidato} className={`enq-barra ${lider ? "lider" : ""}`}>
            <div className="enq-barra-topo">
              <span>{lider ? "🏆 " : `${i + 1}. `}{l.candidato}</span>
              <span className="enq-barra-num">{v} voto{v === 1 ? "" : "s"}{total ? ` · ${Math.round((v / total) * 100)}%` : ""}</span>
            </div>
            <div className="enq-barra-trilho"><div className="enq-barra-fill" style={{ width: `${(v / max) * 100}%` }} /></div>
          </div>
        );
      })}
    </div>
  );
}

// ============================================================
// TELA DO GRUPO
// ============================================================
export function EnquetesView() {
  const { enquetes, votaram, erro, carregar } = useEnquetes();
  const ler = (k) => { try { return localStorage.getItem(k) || ""; } catch { return ""; } };
  const [eu, setEu] = useState(() => (ler(K_EU) && ler(K_PIN) ? ler(K_EU) : ""));
  const [pin, setPin] = useState(() => ler(K_PIN));
  const [quase, setQuase] = useState("");      // nome escolhido, esperando a senha
  const [pinDig, setPinDig] = useState("");
  const [pinErro, setPinErro] = useState("");
  const [conferindo, setConferindo] = useState(false);
  const [trocando, setTrocando] = useState(false);   // formulário de trocar senha aberto
  const [novaPin, setNovaPin] = useState("");
  const [novaPin2, setNovaPin2] = useState("");
  const [trocaMsg, setTrocaMsg] = useState("");
  const [escolha, setEscolha] = useState({});
  const [enviando, setEnviando] = useState(null);
  const [msg, setMsg] = useState({});
  const [publico, setPublico] = useState({});

  const temPublico = (enquetes || []).some((e) => e.resultado_publico);
  useEffect(() => {
    if (!temPublico) return;
    rpc("bdt_resultado_publico").then((r) => !r.erro && setPublico(agrupar(r.data)));
  }, [temPublico, votaram.length]);

  const nomes = enquetes?.[0]?.candidatos || [];
  const jaVotou = (id, nome) => votaram.some((v) => v.enquete_id === id && v.eleitor === nome);
  const quantos = (id) => votaram.filter((v) => v.enquete_id === id).length;

  function escolherEu(nome, senha) {
    setEu(nome); setPin(senha || "");
    try {
      if (nome) { localStorage.setItem(K_EU, nome); localStorage.setItem(K_PIN, senha); }
      else { localStorage.removeItem(K_EU); localStorage.removeItem(K_PIN); }
    } catch {}
    setEscolha({}); setMsg({}); setQuase(""); setPinDig(""); setPinErro("");
  }

  async function trocarSenha() {
    setTrocaMsg("");
    if (novaPin.trim() !== novaPin2.trim()) { setTrocaMsg("As duas senhas não são iguais."); return; }
    const r = await rpc("bdt_trocar_pin", { p_eleitor: eu, p_pin_atual: pin, p_pin_novo: novaPin.trim() });
    if (r.erro) { setTrocaMsg("Erro: " + r.erro); return; }
    if (r.data !== "ok") { setTrocaMsg(r.data); return; }
    const nova = novaPin.trim();
    setPin(nova);
    try { localStorage.setItem(K_PIN, nova); } catch {}
    setNovaPin(""); setNovaPin2(""); setTrocando(false);
    setTrocaMsg("✅ Senha trocada! Guarde a nova senha.");
  }

  async function entrar() {
    if (!quase || pinDig.trim() === "") return;
    setConferindo(true); setPinErro("");
    const r = await rpc("bdt_conferir_pin", { p_eleitor: quase, p_pin: pinDig.trim() });
    setConferindo(false);
    if (r.erro) { setPinErro("Erro: " + r.erro); return; }
    if (r.data === true) escolherEu(quase, pinDig.trim());
    else setPinErro("Senha errada. A senha é o número da sua camisa.");
  }

  async function votar(e) {
    const alvo = escolha[e.id];
    if (!alvo) return;
    if (!window.confirm(`${e.pergunta}\n\nVotar em ${alvo}?\nDepois de confirmar não dá pra trocar.`)) return;
    setEnviando(e.id);
    const r = await rpc("bdt_votar", { p_enquete: e.id, p_eleitor: eu, p_candidato: alvo, p_pin: pin });
    setEnviando(null);
    if (typeof r.data === "string" && r.data.startsWith("Senha errada")) {
      escolherEu("");
      window.alert("Sua senha mudou. Entre de novo com a senha atual.");
      return;
    }
    const texto = r.erro ? "Erro: " + r.erro : r.data === "ok" ? "✅ Voto registrado!" : r.data;
    setMsg((m) => ({ ...m, [e.id]: texto }));
    carregar();
  }

  if (enquetes === null) return <Casca><div className="bdt-vazio">Carregando...</div></Casca>;
  if (erro) return (
    <Casca>
      <div className="bdt-alerta">Não consegui carregar as enquetes ({erro}). Se você é o admin: o SQL das enquetes já foi rodado no Supabase?</div>
    </Casca>
  );
  if (enquetes.length === 0) return <Casca><div className="bdt-vazio">Nenhuma enquete no momento.</div></Casca>;

  return (
    <Casca>
      <div className="enq-eu">
        <label className="enq-eu-rot" htmlFor="enq-eu">Quem é você?</label>
        {eu ? (
          <div className="enq-eu-linha">
            <span className="enq-eu-nome">👤 {eu}</span>
            <div className="hero-actions" style={{ flexWrap: "wrap" }}>
              <button className="btn-secondary enq-btn-peq" onClick={() => { setTrocando(!trocando); setTrocaMsg(""); }}>
                {trocando ? "Cancelar" : "Trocar senha"}
              </button>
              <button className="btn-secondary enq-btn-peq" onClick={() => {
                if (window.confirm("Sair deste nome? Vai precisar da senha para entrar de novo.")) escolherEu("");
              }}>Sair</button>
            </div>
          </div>
        ) : (
          <div className="enq-votar">
            <select id="enq-eu" className="enq-select" value={quase}
              onChange={(ev) => { setQuase(ev.target.value); setPinErro(""); }}>
              <option value="">Selecione o seu nome...</option>
              {nomes.map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
            {quase && (
              <>
                <input className="enq-select" type="password" inputMode="numeric" autoComplete="off"
                  placeholder="Senha: número da sua camisa" value={pinDig}
                  onChange={(ev) => setPinDig(ev.target.value)} onKeyDown={(ev) => ev.key === "Enter" && entrar()} />
                <button className="btn-primary" disabled={!pinDig.trim() || conferindo} onClick={entrar}>
                  {conferindo ? "Conferindo..." : "Entrar"}
                </button>
              </>
            )}
            {pinErro && <div className="error-msg">{pinErro}</div>}
          </div>
        )}
        {eu && trocando && (
          <div className="enq-votar" style={{ marginTop: 10 }}>
            <input className="enq-select" type="password" autoComplete="new-password" placeholder="Senha nova (mínimo 4 caracteres)"
              value={novaPin} onChange={(ev) => setNovaPin(ev.target.value)} />
            <input className="enq-select" type="password" autoComplete="new-password" placeholder="Repita a senha nova"
              value={novaPin2} onChange={(ev) => setNovaPin2(ev.target.value)} onKeyDown={(ev) => ev.key === "Enter" && trocarSenha()} />
            <button className="btn-primary" disabled={!novaPin.trim() || !novaPin2.trim()} onClick={trocarSenha}>Salvar senha nova</button>
          </div>
        )}
        {trocaMsg && <div className="enq-msg" style={{ marginTop: 8 }}>{trocaMsg}</div>}
        <p className="enq-aviso">Voto secreto: ninguém vê em quem você votou. Escolha o SEU nome e digite a senha (no começo é o número da sua camisa — depois de entrar, troque por uma só sua). Cada nome vota uma vez em cada enquete.</p>
      </div>

      <div className="enq-lista">
        {enquetes.map((e) => {
          const votou = eu && jaVotou(e.id, eu);
          const res = publico[e.id];
          const total = (res || []).reduce((s, l) => s + Number(l.votos), 0);
          return (
            <div key={e.id} className={`enq-card ${votou ? "feito" : ""}`}>
              <div className="enq-card-topo">
                <span className="enq-card-tit">{e.pergunta}</span>
                <span className={`enq-tag ${e.aberta && !encerrou() ? "aberta" : "fechada"}`}>{e.aberta && !encerrou() ? "Aberta" : "Encerrada"}</span>
              </div>
              <span className="card-sub">{quantos(e.id)} de {e.candidatos.length} já votaram</span>

              {e.resultado_publico ? (
                <Barras linhas={res} total={total} />
              ) : !eu ? (
                <div className="enq-vazio">Escolha seu nome lá em cima para votar.</div>
              ) : votou ? (
                <div className="enq-ok">✅ Você já votou. Resultado só na festa 🎉</div>
              ) : !e.aberta || encerrou() ? (
                <div className="enq-vazio">Votação encerrada.</div>
              ) : (
                <div className="enq-votar">
                  <select className="enq-select" value={escolha[e.id] || ""}
                    onChange={(ev) => setEscolha((s) => ({ ...s, [e.id]: ev.target.value }))}>
                    <option value="">Escolha um nome...</option>
                    {e.candidatos.filter((n) => n !== eu).map((n) => <option key={n} value={n}>{n}</option>)}
                  </select>
                  <button className="btn-primary" disabled={!escolha[e.id] || enviando === e.id} onClick={() => votar(e)}>
                    {enviando === e.id ? "Enviando..." : "Votar"}
                  </button>
                </div>
              )}
              {msg[e.id] && <div className="enq-msg">{msg[e.id]}</div>}
            </div>
          );
        })}
      </div>
    </Casca>
  );
}

function Casca({ children, titulo = "🗳️ Enquetes", sub = "Prêmios do ano — vote nos destaques do Buteco" }) {
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
// TELA DO ADMIN
// ============================================================
export function EnquetesAdmin({ setView }) {
  const { enquetes, votaram, carregar } = useEnquetes();
  const [senha, setSenha] = useState(() => { try { return sessionStorage.getItem(K_SENHA) || ""; } catch { return ""; } });
  const [digitada, setDigitada] = useState("");
  const [resultado, setResultado] = useState(null);
  const [erro, setErro] = useState(null);
  const [ocupado, setOcupado] = useState(false);

  const buscar = useCallback(async (s) => {
    const r = await rpc("bdt_resultado_admin", { p_senha: s });
    if (r.erro) {
      setErro(r.erro.includes("senha") ? "Senha dos votos incorreta." : r.erro);
      setSenha(""); try { sessionStorage.removeItem(K_SENHA); } catch {}
      return;
    }
    setErro(null); setResultado(agrupar(r.data));
    setSenha(s); try { sessionStorage.setItem(K_SENHA, s); } catch {}
  }, []);

  useEffect(() => { if (senha) buscar(senha); }, [senha, buscar, votaram.length]);

  async function acao(id, aberta, pub, pergunta) {
    if (pergunta && !window.confirm(pergunta)) return;
    setOcupado(true);
    const r = await rpc("bdt_admin_enquete", { p_senha: senha, p_enquete: id, p_aberta: aberta, p_publico: pub });
    setOcupado(false);
    if (r.erro || r.data !== "ok") window.alert(r.erro || r.data);
    carregar();
  }

  const [resetNome, setResetNome] = useState("");
  async function resetarSenha() {
    if (!resetNome) return;
    if (!window.confirm(`Voltar a senha de ${resetNome} para o número da camisa?`)) return;
    const r = await rpc("bdt_admin_resetar_pin", { p_senha: senha, p_eleitor: resetNome });
    window.alert(r.erro ? "Erro: " + r.erro : r.data === "ok" ? `Pronto: a senha de ${resetNome} voltou a ser o número da camisa.` : r.data);
    if (!r.erro && r.data === "ok") setResetNome("");
  }

  async function apagarVoto(id, eleitor) {
    if (!window.confirm(`Apagar o voto de ${eleitor}? Ele vai poder votar de novo.`)) return;
    const r = await rpc("bdt_admin_apagar_voto", { p_senha: senha, p_enquete: id, p_eleitor: eleitor });
    if (r.erro || r.data !== "ok") window.alert(r.erro || r.data);
    carregar();
  }

  const voltar = <button className="btn-secondary" onClick={() => setView("admin")}>Voltar ao painel</button>;

  if (!senha) return (
    <Casca titulo="🗳️ Resultado das enquetes" sub="Precisa da senha dos votos (é diferente da senha do admin)">
      <div className="login-card">
        <input className="enq-select" type="password" placeholder="Senha dos votos" value={digitada}
          onChange={(e) => setDigitada(e.target.value)} onKeyDown={(e) => e.key === "Enter" && buscar(digitada)} />
        {erro && <div className="error-msg">{erro}</div>}
        <button className="btn-primary btn-full" onClick={() => buscar(digitada)}>Ver resultado</button>
        {voltar}
      </div>
    </Casca>
  );

  return (
    <Casca titulo="🗳️ Resultado das enquetes" sub="Só você vê isso. O grupo vê apenas quem já votou.">
      <div className="hero-actions" style={{ marginBottom: 16, flexWrap: "wrap" }}>
        <button className="btn-primary" disabled={ocupado}
          onClick={() => acao("*", null, true, "Liberar o resultado das 4 enquetes para TODO o grupo?")}>Liberar todas na festa 🎉</button>
        <button className="btn-secondary" disabled={ocupado}
          onClick={() => acao("*", false, null, "Encerrar a votação de todas as enquetes?")}>Encerrar todas</button>
        {voltar}
      </div>
      {erro && <div className="bdt-alerta">{erro}</div>}
      <div className="enq-eu">
        <span className="enq-eu-rot">🔑 Voltar senha para o número da camisa</span>
        <div className="enq-votar">
          <select className="enq-select" value={resetNome} onChange={(ev) => setResetNome(ev.target.value)}>
            <option value="">Escolha o nome...</option>
            {(enquetes?.[0]?.candidatos || []).map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
          <button className="btn-secondary" disabled={!resetNome} onClick={resetarSenha}>Voltar senha</button>
        </div>
        <p className="enq-aviso">Use quando alguém esquecer a senha que criou, ou se alguém trocou a senha no lugar dele.</p>
      </div>
      <div className="enq-lista">
        {(enquetes || []).map((e) => {
          const linhas = resultado?.[e.id] || [];
          const total = linhas.reduce((s, l) => s + Number(l.votos), 0);
          const quem = votaram.filter((v) => v.enquete_id === e.id).map((v) => v.eleitor);
          const faltam = e.candidatos.filter((n) => !quem.includes(n));
          return (
            <div key={e.id} className="enq-card">
              <div className="enq-card-topo">
                <span className="enq-card-tit">{e.pergunta}</span>
                <span className={`enq-tag ${e.aberta ? "aberta" : "fechada"}`}>{e.aberta ? "Aberta" : "Encerrada"}</span>
                {e.resultado_publico && <span className="enq-tag aberta">Liberada</span>}
              </div>
              <span className="card-sub">{total} votos · faltam {faltam.length}</span>
              <Barras linhas={linhas} total={total} />
              <div className="hero-actions" style={{ marginTop: 12, flexWrap: "wrap" }}>
                <button className="btn-secondary enq-btn-peq" disabled={ocupado} onClick={() => acao(e.id, !e.aberta, null)}>
                  {e.aberta ? "Encerrar votação" : "Reabrir votação"}
                </button>
                <button className="btn-secondary enq-btn-peq" disabled={ocupado}
                  onClick={() => acao(e.id, null, !e.resultado_publico,
                    e.resultado_publico ? null : `Liberar o resultado de "${e.pergunta}" para o grupo?`)}>
                  {e.resultado_publico ? "Esconder resultado" : "Liberar resultado"}
                </button>
              </div>
              <details className="enq-det">
                <summary>Quem já votou ({quem.length})</summary>
                <div className="enq-chips">
                  {quem.map((n) => (
                    <span key={n} className="enq-chip" title="Clique para apagar o voto" onClick={() => apagarVoto(e.id, n)}>{n} ✕</span>
                  ))}
                </div>
              </details>
              <details className="enq-det">
                <summary>Faltam votar ({faltam.length})</summary>
                <div className="enq-chips">{faltam.map((n) => <span key={n} className="enq-chip mudo">{n}</span>)}</div>
              </details>
            </div>
          );
        })}
      </div>
    </Casca>
  );
}
