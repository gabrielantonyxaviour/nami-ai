import { Disaster } from "../type";
import { supabase } from "./supabase";

// Function to get all disasters
export async function getDisasters() {
  const { data, error } = await supabase
    .from("nami_disasters")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data as Disaster[];
}
