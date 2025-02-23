"use client";

import { disasters, idToChain } from "@/lib/constants";
import Image from "next/image";
import { Button, buttonVariants } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { idToChainInfo, idToTokenInfo, publicClients } from "@/lib/constants";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { baseSepolia, polygonAmoy, scrollSepolia, sepolia } from "viem/chains";
import { useEnvironmentStore } from "@/components/context";
import {
  createPublicClient,
  createWalletClient,
  custom,
  erc20Abi,
  formatUnits,
  http,
  parseUnits,
  zeroAddress,
} from "viem";
import { Input } from "@/components/ui/input";
import { useAccount, useSwitchChain } from "wagmi";
import { toast } from "@/hooks/use-toast";
import {
  ConnectButton,
  useChainModal,
  useConnectModal,
} from "@rainbow-me/rainbowkit";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function Donate({
  params,
}: {
  params: {
    id: string;
  };
}) {
  const disaster = disasters.find(
    (disaster) => disaster.id === parseInt(params.id)
  );
  const { openConnectModal } = useConnectModal();
  const { openChainModal } = useChainModal();
  const { address, chainId } = useAccount();
  const [selectedChainId, setSelectedChainId] = useState<number>(0);
  const [openBasePayModal, setOpenBasePayModal] = useState(false);
  const [apply, setApply] = useState(false);
  const searchParams = useSearchParams();
  const [openEvmPayModal, setOpenEvmPayModal] = useState(false);
  const [donateFundsAmount, setDonateFundsAmount] = useState("0");
  const [selectedTokenAddress, setSelectedTokenAddress] = useState<string>("");
  const { switchChainAsync } = useSwitchChain();
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<
    "crypto" | "fiat" | null
  >(null);
  const { setOverallDonations, overallDonations } = useEnvironmentStore(
    (store) => store
  );
  const vaultAddress = "0xace8655DE7f2a1865DDd686CFcdD47447B86965C";

  // Add these at the top of your component
  const [tokenBalances, setTokenBalances] = useState<{ [key: string]: string }>(
    {}
  );
  const [txHash, setTxHash] = useState<string>("");

  useEffect(() => {
    console.log(disaster);
    console.log(params.id);
  }, []);

  // Add this useEffect to fetch balances when chain or address changes
  useEffect(() => {
    const fetchBalances = async () => {
      if (!selectedChainId || !address) return;

      const publicClient = publicClients[selectedChainId];
      const newBalances: { [key: string]: string } = {};

      for (const token of idToTokenInfo[selectedChainId] || []) {
        try {
          if (token.address === zeroAddress) {
            // Fetch native token balance
            const balance = await publicClient.getBalance({
              address: address as `0x${string}`,
            });
            newBalances[token.address] = formatUnits(balance, 18);
          } else {
            // Fetch ERC20 token balance
            const balance = await publicClient.readContract({
              address: token.address as `0x${string}`,
              abi: erc20Abi,
              functionName: "balanceOf",
              args: [address],
            });
            newBalances[token.address] = formatUnits(
              balance,
              token.decimals || 18
            );
          }
        } catch (e) {
          console.error(`Error fetching balance for token ${token.name}:`, e);
          newBalances[token.address] = "0";
        }
      }

      setTokenBalances(newBalances);
    };

    fetchBalances();
  }, [selectedChainId, address]);

  // Update the Select component
  useEffect(() => {
    const applyParam = searchParams.get("apply")
      ? JSON.parse(searchParams.get("apply") as string)
      : false;
    setApply(applyParam);
  }, [params]);
  return disaster ? (
    <div className="w-full h-full mx-auto p-6 sen bg-[#F5EFE0]">
      <>
        <div className="flex flex-col space-y-4 py-4 max-w-[1000px] max-h-[950px]">
          <div className="flex items-center justify-between">
            <Image
              src={"/logo.png"}
              height={40}
              width={40}
              alt="logo"
              className="rounded-full"
            />
            {address && <ConnectButton />}
          </div>
          <div className="w-full h-[250px] overflow-hidden rounded-xl">
            <Image
              src={disaster.images[0]}
              alt="Zoomed Image"
              width={800}
              height={400}
              className="w-full h-full object-cover"
            />
          </div>
          <p className="nouns tracking-widest text-xl">{disaster.title}</p>
          <p className="text-sm text-[#7C7C7A]">{disaster.description}</p>
          <Card className="w-full bg-[#F2F2F2]">
            <CardContent className="relative pt-6 pb-4 px-6 flex flex-col space-y-4">
              <div>
                <p className="nouns tracking-wider text-sm text-[#7C7C7A] pb-2">{`$${
                  apply == true
                    ? disaster.totalRaisedInUSD.toLocaleString()
                    : overallDonations.toString()
                } out of $${disaster.requiredFundsInUSD.toLocaleString()} raised`}</p>
                <Progress
                  value={
                    (disaster.totalRaisedInUSD * 100) /
                    disaster.requiredFundsInUSD
                  }
                  className="h-2"
                />
              </div>

              <div className="flex flex-col space-y-4">
                {/* Chain Selection via Images */}
                {selectedPaymentMethod == "crypto" && (
                  <div className="flex space-x-2 justify-center">
                    {Object.values(idToChainInfo)
                      .sort((a, b) => a.id - b.id)
                      .map((chainInfo) =>
                        apply ? (
                          <Image
                            key={chainInfo.id}
                            src={chainInfo.image}
                            width={24}
                            height={24}
                            className="select-none rounded-full pointer-events-none transition opacity-40"
                            alt={chainInfo.name}
                          />
                        ) : (
                          <Image
                            key={chainInfo.id}
                            src={chainInfo.image}
                            width={24}
                            height={24}
                            className={
                              selectedChainId === chainInfo.chainId
                                ? "opacity-100 select-none rounded-full transition"
                                : "opacity-40 hover:opacity-80 hover:scale-110 cursor-pointer select-none rounded-full transition"
                            }
                            alt={chainInfo.name}
                            onClick={() => {
                              setSelectedChainId(chainInfo.chainId);
                              setSelectedTokenAddress(""); // Reset selected token
                              setTokenBalances({}); // Reset token balances
                              setDonateFundsAmount("0"); // Optionally reset the amount
                            }}
                          />
                        )
                      )}
                  </div>
                )}

                {/* Amount and Token Selection */}

                <div className="flex flex-col space-y-4">
                  {selectedPaymentMethod == "crypto" && (
                    <div className="flex space-x-2">
                      <Input
                        type="number"
                        placeholder="Enter amount"
                        className="w-3/5"
                        value={donateFundsAmount}
                        disabled={
                          selectedTokenAddress === "" || selectedChainId == 0
                        }
                        onChange={(e) => setDonateFundsAmount(e.target.value)}
                      />
                      <Select
                        value={selectedTokenAddress}
                        onValueChange={setSelectedTokenAddress}
                      >
                        <SelectTrigger
                          className="h-10 px-3 py-2 w-2/5 flex items-center justify-between"
                          disabled={selectedChainId == 0}
                        >
                          <SelectValue placeholder="Select Token">
                            {selectedTokenAddress && (
                              <div className="flex items-center justify-between ">
                                <div className="flex items-center space-x-3">
                                  <Image
                                    src={
                                      idToTokenInfo[selectedChainId]?.find(
                                        (token: any) =>
                                          token.address === selectedTokenAddress
                                      )?.image
                                    }
                                    width={24}
                                    height={24}
                                    alt="Token"
                                    className="rounded-full"
                                  />
                                  <div className="font-medium">
                                    {
                                      idToTokenInfo[selectedChainId]?.find(
                                        (token: any) =>
                                          token.address === selectedTokenAddress
                                      )?.name
                                    }
                                  </div>
                                </div>
                                {/* TODO: used absolute right-16 to align the balance to the right of the token name  because the issue with Justify*/}
                                {/* <div className="text-base text-primary tabular-nums">
                                  {tokenBalances[selectedTokenAddress]
                                    ? parseFloat(
                                        tokenBalances[selectedTokenAddress]
                                      ).toLocaleString(undefined, {
                                        minimumFractionDigits: 2,
                                        maximumFractionDigits: 6,
                                      })
                                    : "0.00"}
                                </div> */}
                              </div>
                            )}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent className="p-1">
                          {idToTokenInfo[selectedChainId]
                            ?.sort((a: any, b: any) => a.id - b.id)
                            .map((tokenInfo: any) => (
                              <SelectItem
                                key={tokenInfo.id}
                                value={tokenInfo.address}
                                className="focus:bg-primary/10 hover:bg-primary/5 rounded-md cursor-pointer "
                              >
                                <div className="flex items-center justify-between w-full gap-2 py-1.5 px-1">
                                  <div className="flex items-center space-x-3">
                                    <Image
                                      src={tokenInfo.image}
                                      width={28}
                                      height={28}
                                      alt={tokenInfo.name}
                                      className="rounded-full"
                                    />
                                    <span className="font-medium">
                                      {tokenInfo.name}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <div className="text-sm text-primary tabular-nums">
                                      {tokenBalances[tokenInfo.address]
                                        ? parseFloat(
                                            tokenBalances[tokenInfo.address]
                                          ).toLocaleString(undefined, {
                                            minimumFractionDigits: 2,
                                            maximumFractionDigits: 6,
                                          })
                                        : "0.00"}
                                    </div>
                                  </div>
                                </div>
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {/* Payment Method Selection */}
                  {!address ? (
                    <Button
                      className="bg-primary w-full"
                      onClick={openConnectModal}
                    >
                      Connect Wallet
                    </Button>
                  ) : !selectedPaymentMethod ? (
                    <div className="flex space-x-2">
                      <Button
                        className="w-1/2 outline outline-primary"
                        variant="outline"
                        onClick={() => setSelectedPaymentMethod("fiat")}
                      >
                        Fiat
                      </Button>
                      <Button
                        className="w-1/2"
                        onClick={() => setSelectedPaymentMethod("crypto")}
                      >
                        Crypto
                      </Button>
                    </div>
                  ) : selectedPaymentMethod === "crypto" ? (
                    chainId !== selectedChainId ? (
                      <Button
                        className="bg-primary w-full"
                        disabled={selectedChainId == 0}
                        onClick={async () => {
                          if (!selectedChainId) return;
                          await switchChainAsync({
                            chainId: selectedChainId as
                              | 11155111
                              | 84532
                              | 80002
                              | 534351,
                          });
                        }}
                      >
                        Switch Network
                      </Button>
                    ) : (
                      <Button
                        className="bg-primary w-full"
                        disabled={
                          !selectedTokenAddress ||
                          !donateFundsAmount ||
                          parseFloat(donateFundsAmount) <= 0
                        }
                        onClick={async () => {
                          try {
                            const publicClient = publicClients[selectedChainId];
                            const walletClient = createWalletClient({
                              chain: idToChain[selectedChainId],
                              transport: custom(window.ethereum),
                            });
                            let hash: `0x${string}`;

                            if (selectedTokenAddress === zeroAddress) {
                              hash = await walletClient.sendTransaction({
                                account: address as `0x${string}`,
                                to: vaultAddress as `0x${string}`,
                                value: parseUnits(donateFundsAmount, 18),
                                chain: idToChain[selectedChainId],
                              });
                            } else {
                              const { request } =
                                await publicClient.simulateContract({
                                  account: address as `0x${string}`,
                                  address:
                                    selectedTokenAddress as `0x${string}`,
                                  abi: erc20Abi,
                                  functionName: "transfer",
                                  args: [
                                    vaultAddress,
                                    parseUnits(donateFundsAmount, 18),
                                  ],
                                });
                              hash = await walletClient.writeContract(request);
                            }

                            setTxHash(hash); // Store the hash
                            setOverallDonations(parseInt(donateFundsAmount));

                            toast({
                              title: "Donation Successful!",
                              description: `Thank you for your donation. Check your transaction here: ${hash}`,
                            });
                          } catch (e) {
                            console.error(e);
                            toast({
                              title: "Transaction Failed",
                              description:
                                "Please check your balance and try again",
                              variant: "destructive",
                            });
                          }
                        }}
                      >
                        Donate now
                      </Button>
                    )
                  ) : (
                    <Button
                      className="bg-primary w-full "
                      onClick={() => {
                        // Handle fiat payment logic here
                      }}
                    >
                      Pay with Card
                    </Button>
                  )}
                </div>
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
        </div>
      </>
    </div>
  ) : (
    <div className="flex flex-col items-center justify-center h-screen w-screen space-y-4">
      <Image src="/loading.gif" width={200} height={200} alt="loading" />
      <p className="text-xl sen">Loading</p>
    </div>
  );
}
