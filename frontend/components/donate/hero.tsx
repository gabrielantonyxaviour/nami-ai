"use client";
import Image from "next/image";
import { Button, buttonVariants } from "../ui/button";
import { Progress } from "../ui/progress";
import { Card, CardContent } from "../ui/card";
import { HardcodedDisaster } from "@/lib/type";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import {
  idToChain,
  idToChainInfo,
  idToTokenInfo,
  publicClients,
} from "@/lib/constants";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { baseSepolia, polygonAmoy, scrollSepolia, sepolia } from "viem/chains";
import { useEnvironmentStore } from "../context";
import {
  createPublicClient,
  createWalletClient,
  custom,
  erc20Abi,
  http,
  parseUnits,
  zeroAddress,
} from "viem";
import { Input } from "../ui/input";
import { useAccount } from "wagmi";
import { toast } from "@/hooks/use-toast";
import { useChainModal, useConnectModal } from "@rainbow-me/rainbowkit";
import { DynamicContextProvider } from "@dynamic-labs/sdk-react-core";
import { BitcoinWalletConnectors } from "@dynamic-labs/bitcoin";
import { SolanaWalletConnectors } from "@dynamic-labs/solana";
import BtcButton from "./btcButton";
import SolanaButton from "./solanaButton";
export default function DonateHero({
  disaster,
}: {
  disaster: HardcodedDisaster;
}) {
  const { openConnectModal } = useConnectModal();
  const { openChainModal } = useChainModal();
  const { address, chainId } = useAccount();
  const [selectedChainId, setSelectedChainId] = useState<number>(0);
  const [apply, setApply] = useState(false);
  const [openEvmPayModal, setOpenEvmPayModal] = useState(false);
  const params = useSearchParams();
  const [donateFundsAmount, setDonateFundsAmount] = useState("0");
  const [selectedTokenAddress, setSelectedTokenAddress] = useState<string>("");
  const { setOverallDonations, overallDonations } = useEnvironmentStore(
    (store) => store
  );
  const vaultAddress = "0xace8655DE7f2a1865DDd686CFcdD47447B86965C";

  useEffect(() => {
    const applyParam = params.get("apply")
      ? JSON.parse(params.get("apply") as string)
      : false;
    setApply(applyParam);
  }, [params]);

  return (
    <>
      <p className="nouns tracking-widest text-2xl">{disaster.title}</p>
      <div className="flex py-4  justify-between">
        <div className="w-[500px] h-[300px] overflow-hidden rounded-xl">
          <Image
            src={disaster.images[0]}
            alt="Zoomed Image"
            width={800}
            height={400}
            className="w-[800px] h-[400px] object-cover "
          />
        </div>
        <Card className="w-[47%] bg-[#F2F2F2]">
          <CardContent className="relative pt-8 pb-4 px-8 flex flex-col justify-between h-full">
            <div>
              <p className="nouns tracking-wider text-sm text-[#7C7C7A] pt-4 pb-2">{`$${disaster.totalRaisedInUSD.toLocaleString()} out of $${disaster.requiredFundsInUSD.toLocaleString()} raised`}</p>
              <Progress
                value={
                  (disaster.totalRaisedInUSD * 100) /
                  disaster.requiredFundsInUSD
                }
                className="h-2"
              />
            </div>

            <div className="flex space-x-3 justify-center">
              {Object.values(idToChainInfo)
                .sort((a, b) => a.id - b.id)
                .map((chainInfo) =>
                  apply ? (
                    <Image
                      key={chainInfo.id}
                      src={chainInfo.image}
                      width={32}
                      height={32}
                      className={
                        "select-none rounded-full pointer-events-none transition duration-200 ease-in-out opacity-40"
                      }
                      alt={chainInfo.name}
                    />
                  ) : (
                    <Image
                      key={chainInfo.id}
                      src={chainInfo.image}
                      width={32}
                      height={32}
                      className={
                        selectedChainId === chainInfo.chainId
                          ? "opacity-100 select-none rounded-full  transition duration-200 ease-in-out"
                          : "opacity-40 hover:opacity-80 hover:scale-110 cursor-pointer select-none rounded-full  transition duration-200 ease-in-out"
                      }
                      alt={chainInfo.name}
                      onClick={() => {
                        setSelectedChainId(chainInfo.chainId);
                      }}
                    />
                  )
                )}
              <Image
                key={11}
                src={`/chains/bitcoin.png`}
                width={32}
                height={32}
                className={
                  selectedChainId === 11
                    ? "opacity-100 select-none rounded-full  transition duration-200 ease-in-out"
                    : "opacity-40 hover:opacity-80 hover:scale-110 cursor-pointer select-none rounded-full  transition duration-200 ease-in-out"
                }
                alt={"Bitcoin"}
                onClick={() => {
                  setSelectedChainId(11);
                }}
              />
              <Image
                key={12}
                src={`/chains/solana.png`}
                width={32}
                height={32}
                className={
                  selectedChainId === 12
                    ? "opacity-100 select-none rounded-full  transition duration-200 ease-in-out"
                    : "opacity-40 hover:opacity-80 hover:scale-110 cursor-pointer select-none rounded-full  transition duration-200 ease-in-out"
                }
                alt={"Solana"}
                onClick={() => {
                  setSelectedChainId(12);
                }}
              />
            </div>
            <div>
              {apply ? (
                <Button
                  className="w-full flex justify-center items-center space-x-2 bg-[#6059C9] "
                  disabled
                >
                  <p className="nouns tracking-widest">Apply for Funding</p>
                </Button>
              ) : selectedChainId == 0 ? (
                <Button
                  className="w-full flex justify-center items-center space-x-2 bg-[#6059C9] "
                  disabled
                >
                  <p className="sen ">Connect Wallet</p>
                </Button>
              ) : selectedChainId == 11 ? (
                <DynamicContextProvider
                  settings={{
                    environmentId: process.env.NEXT_PUBLIC_DYNAMIC_BTC || "",
                    walletConnectors: [BitcoinWalletConnectors],
                  }}
                >
                  <BtcButton address={address || ""} />
                </DynamicContextProvider>
              ) : selectedChainId == 12 ? (
                <DynamicContextProvider
                  settings={{
                    environmentId: process.env.NEXT_PUBLIC_DYNAMIC_SOLANA || "",
                    walletConnectors: [SolanaWalletConnectors],
                  }}
                >
                  <SolanaButton address={address || ""} />
                </DynamicContextProvider>
              ) : (
                <Button
                  className="w-full flex justify-center items-center space-x-2 bg-[#6059C9] "
                  onClick={() => {
                    if (address) {
                      if (selectedChainId != chainId && openChainModal)
                        openChainModal();
                      else setOpenEvmPayModal(true);
                    }
                    if (openConnectModal) openConnectModal();
                  }}
                >
                  <p className="sen ">
                    {address != undefined ? "Donate Now" : "Connect Wallet"}
                  </p>
                </Button>
              )}
              <p className="text-[10px] sen text-center text-[#7c7c7a] pt-4">
                {disaster.vaultAddress}
              </p>
              <p className="text-[10px] sen text-center text-[#7c7c7a]">
                {disaster.subName}
              </p>
            </div>

            <Image
              src={"/airdrop.png"}
              width={100}
              height={100}
              alt="Airdrop"
              className="absolute -top-16 -right-12"
            />
          </CardContent>
        </Card>

        {openEvmPayModal && (
          <Dialog open={openEvmPayModal} onOpenChange={setOpenEvmPayModal}>
            <DialogContent className=" w-[500px] px-4 py-8">
              <p>Choose Token</p>
              <div className="flex space-x-3 justify-center">
                {idToTokenInfo[selectedChainId]
                  .sort((a: any, b: any) => a.id - b.id)
                  .map((tokenInfo: any) => (
                    <Image
                      key={tokenInfo.id}
                      src={tokenInfo.image}
                      width={32}
                      height={32}
                      className={
                        selectedTokenAddress === tokenInfo.address
                          ? "opacity-100 select-none rounded-full  transition duration-200 ease-in-out"
                          : "opacity-40 hover:opacity-80 hover:scale-110 cursor-pointer select-none rounded-full  transition duration-200 ease-in-out"
                      }
                      alt={tokenInfo.name}
                      onClick={() => {
                        setSelectedTokenAddress(tokenInfo.address);
                      }}
                    />
                  ))}
              </div>

              <p>Choose Amount</p>
              <div className="flex space-x-2 items-center">
                <Input
                  type="number"
                  value={donateFundsAmount}
                  onChange={(e) => {
                    setDonateFundsAmount(e.target.value);
                  }}
                ></Input>
                {idToTokenInfo[baseSepolia.id].filter(
                  (token: any) => token.address == selectedTokenAddress
                ).length > 0 && (
                  <p className="sen ">
                    {
                      idToTokenInfo[baseSepolia.id].filter(
                        (token: any) => token.address == selectedTokenAddress
                      )[0].name
                    }
                  </p>
                )}
              </div>
              <Button
                className="bg-primary"
                onClick={async () => {
                  const publicClient =
                    publicClients[selectedChainId] ||
                    createPublicClient({
                      chain: baseSepolia,
                      transport: http(),
                    });

                  const walletClient = createWalletClient({
                    chain:
                      selectedChainId == baseSepolia.id
                        ? baseSepolia
                        : selectedChainId == sepolia.id
                        ? sepolia
                        : selectedChainId == scrollSepolia.id
                        ? scrollSepolia
                        : polygonAmoy,
                    transport: custom(window.ethereum),
                  });
                  try {
                    console.log(selectedTokenAddress);
                    console.log(parseUnits(donateFundsAmount, 18));
                    console.log(address);
                    console.log(vaultAddress);
                    if (selectedTokenAddress == zeroAddress) {
                      await walletClient.sendTransaction({
                        account: address as `0x${string}`,
                        to: vaultAddress,
                        value: parseUnits(donateFundsAmount, 18),
                        chain: idToChain[selectedChainId],
                      });
                      setOverallDonations(parseInt(donateFundsAmount));
                      toast({
                        title: "Donation Successful",
                        description: "Thank you for your donation",
                      });
                      setOpenEvmPayModal(false);
                    } else {
                      const { request } = await publicClient.simulateContract({
                        account: address as `0x${string}`,
                        address: selectedTokenAddress,
                        abi: erc20Abi,
                        functionName: "transfer",
                        chain: idToChain[selectedChainId],
                        args: [vaultAddress, parseUnits(donateFundsAmount, 18)],
                      });
                      await walletClient.writeContract(request);
                      setOverallDonations(parseInt(donateFundsAmount));
                      toast({
                        title: "Donation Successful!",
                        description: "Thank you for your donation",
                      });
                      setOpenEvmPayModal(false);
                    }
                  } catch (e) {
                    console.log(e);
                    toast({
                      title: "Insufficient Funds",
                      description: "Please check your balance",
                    });
                  }
                }}
              >
                Donate now
              </Button>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </>
  );
}
