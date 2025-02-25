"use client";

import { disasters } from "@/lib/constants";
import Image from "next/image";

import { useEffect, useState } from "react";

import DonateHero from "./hero";
import DonateBody from "./body";
import DonationTable from "./donations-table";
import { usePathname, useSearchParams } from "next/navigation";
import ApplyForm from "./apply-form";
import ClaimsTab from "./claims-tab";
import {
  Disaster,
  HardcodedDisaster,
  NGO,
  StarkClaim,
  StarkDonation,
} from "@/lib/type";

export default function Donate({ id }: { id: string }) {
  const disaster = disasters.find(
    (disaster) => disaster.id === parseInt(id) % 4
  );
  const [showSwapModalPopover, setShowSwapModalPopover] = useState(false);
  const [donationData, setDonationData] = useState([]);
  const [fetchedDisaster, setFetchedDisaster] =
    useState<HardcodedDisaster | null>(null);
  const [donations, setDonations] = useState<StarkDonation[] | null>(null);
  const [claims, setClaims] = useState<
    (StarkClaim & { ngo_details: NGO })[] | null
  >(null);
  const pathname = usePathname();

  useEffect(() => {
    (async function () {
      try {
        const response = await fetch("/api/supabase/disasters/" + id);
        const { disaster: d, claims, donations } = await response.json();

        setFetchedDisaster({
          id: d.id,
          title: d.title,
          images: [
            [
              "/disasters/bangkok.png",
              "/disasters/brazil.png",
              "/disasters/tokyo.png",
              "/disasters/vietnam.png",
            ][Math.floor(Math.random() * 4)],
          ],
          coordinates: {
            lat: 13.7563,
            lng: 100.5018,
          },
          description: d.description,
          attestationId: "onchain_evm_84532_0xb23",
          createdAt: d.created_at,
          totalRaisedInUSD: d.funds_raised,
          requiredFundsInUSD: d.funds_needed,
          vaultAddress: d.vault_address,
          subName: d.sub_name,
        });
        setClaims(claims);
        setDonations(donations);
      } catch (e) {
        console.log(e);
      }
    })();
  }, [id]);
  const params = useSearchParams();

  return disaster ? (
    <div className="w-[1000px] h-full mx-auto pt-6">
      <DonateHero disaster={fetchedDisaster ? fetchedDisaster : disaster} />
      <div className="flex flex-col pt-6">
        <DonateBody disaster={fetchedDisaster ? fetchedDisaster : disaster} />
        {pathname.split("/")[1] == "donate" ? (
          <>
            <DonationTable id={id} donations={donations || []} />
            <ClaimsTab id={id} claims={claims || []} />
          </>
        ) : (
          <ApplyForm id={id} />
        )}
      </div>
    </div>
  ) : (
    <div className="flex flex-col items-center justify-center h-screen w-screen space-y-4">
      <Image src="/loading.gif" width={200} height={200} alt="loading" />
      <p className="text-xl sen">Loading</p>
    </div>
  );
}
