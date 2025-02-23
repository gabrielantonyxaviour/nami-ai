import { StarkDonation } from "../type";
import { supabase } from "./supabase";

export async function createDonation(
  donation: Omit<StarkDonation, "id" | "donated_at">
) {
  const { data, error } = await supabase
    .from("nami_stark_donations")
    .insert([donation])
    .select()
    .single();

  if (error) throw error;
  return data as StarkDonation;
}
