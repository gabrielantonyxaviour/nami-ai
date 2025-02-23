import { Disaster, NGO, StarkClaim } from "../type";
import { supabase } from "./supabase";

// Function to get an NGO with all its claims
export async function getNGO(id: number) {
  // Get NGO details
  const { data: ngo, error: ngoError } = await supabase
    .from("nami_ngos")
    .select("*")
    .eq("id", id)
    .single();

  if (ngoError) throw ngoError;

  // Get all claims for this NGO
  const { data: claims, error: claimsError } = await supabase
    .from("nami_stark_claims")
    .select(
      `
      *,
      disaster_details:nami_disasters(*)
    `
    )
    .eq("ngo", id);

  if (claimsError) throw claimsError;

  return {
    ngo: ngo as NGO,
    claims: claims as (StarkClaim & { disaster_details: Disaster })[],
  };
}
