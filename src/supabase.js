import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://roeccnuucpdmzzntvkxu.supabase.co";
const SUPABASE_KEY = "sb_publishable_4AC2R5FnzG0E6F-kivQU_g_6FsLNlrq";
export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// ============================================================
// Tabela: bdt_dados  (id TEXT, conteudo JSONB, atualizado_em)
//   id = "publico"    -> o que TODO MUNDO ve (semanas, uniformes, hall, anos liberados)
//   id = "secreto"    -> ranking/artilharia/menos vazado do ano em segredo
//   id = "financeiro" -> caixa/mensalidades
//   id = "config"     -> { anosOcultos: [2026] }
// As linhas "secreto" e "financeiro" so sao baixadas dentro do painel do admin.
// ============================================================

export async function lerDoc(id) {
  const { data, error } = await supabase
    .from("bdt_dados").select("conteudo, atualizado_em").eq("id", id).maybeSingle();
  if (error) { console.warn(`Erro ao carregar "${id}":`, error.message); return null; }
  if (!data || !data.conteudo) return null;
  return { ...data.conteudo, atualizadoEm: data.atualizado_em };
}

export async function gravarDoc(id, conteudo) {
  const { error } = await supabase.from("bdt_dados")
    .upsert({ id, conteudo, atualizado_em: new Date().toISOString() }, { onConflict: "id" });
  if (error) { console.warn(`Erro ao salvar "${id}":`, error.message); return error.message; }
  return null;
}

export const carregarDadosDB      = () => lerDoc("publico");
export const carregarSecretoDB    = () => lerDoc("secreto");
export const carregarFinanceiroDB = () => lerDoc("financeiro");
export const carregarConfigDB     = () => lerDoc("config");
export const salvarDadosDB        = (c) => gravarDoc("publico", c);
export const salvarSecretoDB      = (c) => gravarDoc("secreto", c);
export const salvarFinanceiroDB   = (c) => gravarDoc("financeiro", c);
export const salvarConfigDB       = (c) => gravarDoc("config", c);
