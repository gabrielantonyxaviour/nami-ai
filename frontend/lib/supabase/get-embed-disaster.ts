import { Disaster } from "../type";
import { supabase } from "./supabase";

// Function to get a single disaster for embedding
export async function getEmbedDisaster(id: number) {
  const { data, error } = await supabase
    .from("nami_disasters")
    .select("*")
    .eq("id", id)
    .single();

  if (error) throw error;
  return data as Disaster;
}
