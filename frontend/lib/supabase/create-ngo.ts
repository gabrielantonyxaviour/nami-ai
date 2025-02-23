import { NGO } from "../type";
import { supabase } from "./supabase";

export async function createNGO(ngo: Omit<NGO, "id" | "created_at">) {
  const { data, error } = await supabase
    .from("nami_ngos")
    .insert([ngo])
    .select()
    .single();

  if (error) throw error;
  return data as NGO;
}
