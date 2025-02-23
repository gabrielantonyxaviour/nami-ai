interface Disaster {
  id: number;
  created_at: string;
  title: string | null;
  description: string | null;
  funds_needed: number | null;
  sources: string[] | null;
  location: string | null;
  tweet_url: string | null;
  type: string | null;
  funds_raised: number | null;
}

interface NGO {
  id: number;
  created_at: string;
  name: string | null;
  image: string | null;
  description: string | null;
  location: string | null;
}

interface StarkDonation {
  id: number;
  donated_at: string;
  disaster_id: number | null;
  chain: number | null;
  token: string | null;
  amount: number | null;
  usd_amount: number | null;
}

interface StarkClaim {
  id: number;
  claimed_at: string;
  ngo: number | null;
  disaster: number | null;
  amount: number | null;
  tweet_url: string | null;
  ngo_details?: NGO;
}

interface HardcodedDisaster {
  id: number;
  title: string;
  images: string[];
  coordinates: {
    lat: number;
    lng: number;
  };
  description: string;
  attestationId: string;
  createdAt: string;
  totalRaisedInUSD: number;
  requiredFundsInUSD: number;
  vaultAddress: string;
  subName: string;
}

export type { Disaster, NGO, StarkDonation, StarkClaim, HardcodedDisaster };
