import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://roeccnuucpdmzzntvkxu.supabase.co";
const SUPABASE_KEY = "sb_publishable_4AC2R5FnzG0E6F-kivQU_g_6FsLNlrq";
export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

export async function salvarPalpiteDB(participante, jogoId, casa, fora) {
  const { error } = await supabase.from("palpites")
    .upsert({ participante, jogo_id: jogoId, casa, fora, updated_at: new Date().toISOString() },
             { onConflict: "participante,jogo_id" });
  if (error) console.warn("Erro ao salvar palpite:", error.message);
  return !error;
}
export async function carregarPalpitesDB() {
  const { data, error } = await supabase.from("palpites").select("*");
  if (error) { console.warn("Erro ao carregar palpites:", error.message); return {}; }
  const palpites = {};
  data.forEach(p => {
    if (!palpites[p.participante]) palpites[p.participante] = {};
    palpites[p.participante][p.jogo_id] = { casa: p.casa ?? "", fora: p.fora ?? "" };
  });
  return palpites;
}
export async function salvarResultadoDB(jogoId, casa, fora) {
  const { error } = await supabase.from("resultados")
    .upsert({ jogo_id: jogoId, casa, fora, updated_at: new Date().toISOString() },
             { onConflict: "jogo_id" });
  if (error) console.warn("Erro ao salvar resultado:", error.message);
  return !error;
}
export async function carregarResultadosDB() {
  const { data, error } = await supabase.from("resultados").select("*");
  if (error) { console.warn("Erro ao carregar resultados:", error.message); return {}; }
  const resultados = {};
  data.forEach(r => { resultados[r.jogo_id] = { casa: r.casa ?? "", fora: r.fora ?? "" }; });
  return resultados;
}
export async function salvarSenhaDB(participante, senha) {
  const { error } = await supabase.from("senhas")
    .upsert({ participante, senha, updated_at: new Date().toISOString() },
             { onConflict: "participante" });
  if (error) console.warn("Erro ao salvar senha:", error.message);
  return !error;
}
export async function carregarSenhasDB() {
  const { data, error } = await supabase.from("senhas").select("*");
  if (error) { console.warn("Erro ao carregar senhas:", error.message); return {}; }
  const senhas = {};
  data.forEach(s => { senhas[s.participante] = s.senha; });
  return senhas;
}
export async function resetarSenhaDB(participante) {
  const { error } = await supabase.from("senhas").delete().eq("participante", participante);
  if (error) console.warn("Erro ao resetar senha:", error.message);
  return !error;
}
