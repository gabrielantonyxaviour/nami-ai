import { Disaster, NGO, StarkClaim, StarkDonation } from "../type";
import { supabase } from "./supabase";

export async function getPageDisaster(id: number) {
  // Get disaster details
  const { data: disaster, error: disasterError } = await supabase
    .from("nami_disasters")
    .select("*")
    .eq("id", id)
    .single();

  if (disasterError) throw disasterError;

  // Get all claims for this disaster
  const { data: claims, error: claimsError } = await supabase
    .from("nami_stark_claims")
    .select(
      `
        *,
        ngo_details:nami_ngos(*)
      `
    )
    .eq("disaster", id);

  if (claimsError) throw claimsError;

  // Get all donations for this disaster
  const { data: donations, error: donationsError } = await supabase
    .from("nami_stark_donations")
    .select("*")
    .eq("disaster_id", id);

  if (donationsError) throw donationsError;

  return {
    disaster: disaster as Disaster,
    claims: claims as (StarkClaim & { ngo_details: NGO })[],
    donations: donations as StarkDonation[],
  };
}
