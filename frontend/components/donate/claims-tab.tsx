import { NGO, StarkClaim } from "@/lib/type";

export default function ClaimsTab({
  id,
  claims,
}: {
  id: string;
  claims: (StarkClaim & { ngo_details: NGO })[];
}) {
  return (
    <div className="w-full">
      <p className="nouns tracking-widest text-lg pb-4 pt-8 ">NGO Claims</p>
    </div>
  );
}
