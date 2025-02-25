"use client";

import {
  disasters,
  GET_DISASTERS_BY_ADDRESS_QUERY,
  GET_DISASTERS_QUERY,
  graphClient,
} from "@/lib/constants";
import Image from "next/image";

import { useEffect, useState } from "react";

import DonateHero from "./hero";
import DonateBody from "./body";
import DonationTable from "./donations-table";

import { gql } from "@apollo/client";
import { usePathname, useSearchParams } from "next/navigation";
import ApplyForm from "./apply-form";
import ClaimsTab from "./claims-tab";

export default function Donate({ id }: { id: string }) {
  const disaster = disasters.find((disaster) => disaster.id === parseInt(id));
  const [showSwapModalPopover, setShowSwapModalPopover] = useState(false);
  const [donationData, setDonationData] = useState([]);
  const pathname = usePathname();

  useEffect(() => {
    (async function () {
      try {
        // const data = await graphClient.query({
        //   query: GET_DISASTERS_BY_ADDRESS_QUERY,
        //   variables: {
        //     vault: "0x0429A2Da7884CA14E53142988D5845952fE4DF6a", // TODO: Change this to disasterId
        //     to: "0x0429A2Da7884CA14E53142988D5845952fE4DF6a",
        //     tokenSymbol: null,
        //     chain: null,
        //   },
        // });
        // console.log(data);
        // setDonationData(data.data.disasters);
      } catch (e) {
        console.log(e);
      }
    })();
  }, [id]);
  const params = useSearchParams();
  const [apply, setApply] = useState(false);
  useEffect(() => {
    const applyParam = params.get("apply")
      ? JSON.parse(params.get("apply") as string)
      : false;
    setApply(applyParam);
  }, [params]);

  return disaster ? (
    <div className="w-[1000px] h-full mx-auto pt-6">
      <DonateHero disaster={disaster} />
      <div className="flex flex-col pt-6">
        <DonateBody disaster={disaster} />
        {pathname.split("/")[1] == "donate" ? (
          <>
            <DonationTable apply={apply} id={id} />
            <ClaimsTab id={id} />
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
