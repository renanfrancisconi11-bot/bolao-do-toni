import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://roeccnuucpdmzzntvkxu.supabase.co";
const SUPABASE_KEY = "sb_publishable_4AC2R5FnzG0E6F-kivQU_g_6FsLNlrq";
export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// ============================================================
// Tabela: bdt_dados  (id TEXT, conteudo JSONB, atualizado_em)
//   id = "publico"    -> ranking, artilharia, menos vazado, semanas, uniformes, hall
//   id = "financeiro" -> caixa/mensalidades (so carregado dentro do painel admin)
// ============================================================

async function ler(id) {
  const { data, error } = await supabase
    .from("bdt_dados").select("conteudo, atualizado_em").eq("id", id).maybeSingle();
  if (error) { console.warn(`Erro ao carregar "${id}":`, error.message); return null; }
  if (!data || !data.conteudo) return null;
  return { ...data.conteudo, atualizadoEm: data.atualizado_em };
}

async function gravar(id, conteudo) {
  const { error } = await supabase.from("bdt_dados")
    .upsert({ id, conteudo, atualizado_em: new Date().toISOString() }, { onConflict: "id" });
  if (error) { console.warn(`Erro ao salvar "${id}":`, error.message); return error.message; }
  return null;
}

export const carregarDadosDB      = () => ler("publico");
export const carregarFinanceiroDB = () => ler("financeiro");
export const salvarDadosDB        = (c) => gravar("publico", c);
export const salvarFinanceiroDB   = (c) => gravar("financeiro", c);
