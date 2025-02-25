import React from "react";
import { Button } from "../ui/button";
import { useDynamicContext } from "@dynamic-labs/sdk-react-core";

export default function BtcButton({
  address,
}: {
  address: string;
}): JSX.Element {
  const { setShowAuthFlow } = useDynamicContext();
  return (
    <Button
      className="w-full flex justify-center items-center space-x-2 bg-[#6059C9] "
      onClick={() => setShowAuthFlow(true)}
    >
      <p className="sen ">
        {address != undefined ? "Donate Now" : "Connect Wallet"}
      </p>
    </Button>
  );
}
