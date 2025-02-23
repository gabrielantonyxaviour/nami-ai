import { Disaster, NGO, StarkClaim } from "../type";
import { supabase } from "./supabase";

export async function createClaim(
  claim: Omit<StarkClaim, "id" | "claimed_at">
) {
  const { data, error } = await supabase
    .from("nami_stark_claims")
    .insert([claim])
    .select(
      `
      *,
      ngo_details:nami_ngos(*),
      disaster_details:nami_disasters(*)
    `
    )
    .single();

  if (error) throw error;
  return data as StarkClaim & {
    ngo_details: NGO;
    disaster_details: Disaster;
  };
}
