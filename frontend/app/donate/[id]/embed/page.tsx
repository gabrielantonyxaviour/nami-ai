"use client";
import { useEnvironmentStore } from "@/components/context";
import { disasters, idToChain } from "@/lib/constants";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent } from "@/components/ui/card";
import { idToChainInfo, idToTokenInfo, publicClients } from "@/lib/constants";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  createWalletClient,
  custom,
  erc20Abi,
  formatUnits,
  parseUnits,
  zeroAddress,
} from "viem";
import {
  Connection,
  PublicKey,
  SystemProgram,
  TransactionMessage,
  VersionedTransaction,
} from "@solana/web3.js";
import { Input } from "@/components/ui/input";
import { useAccount, useDisconnect, useSwitchChain } from "wagmi";
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
import {
  DynamicWidget,
  useIsLoggedIn,
  useWalletOptions,
} from "@dynamic-labs/sdk-react-core";
import { useDynamicContext } from "@dynamic-labs/sdk-react-core";
import { isBitcoinWallet } from "@dynamic-labs/bitcoin";
import { isSolanaWallet } from "@dynamic-labs/solana";

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
  const { address, chainId, isConnected } = useAccount();
  const { disconnect } = useDisconnect();
  const [selectedChainId, setSelectedChainId] = useState<number>(0);
  const [selectedNetwork, setSelectedNetwork] = useState<number>(0);
  const [apply, setApply] = useState(false);
  const searchParams = useSearchParams();
  const [donateFundsAmount, setDonateFundsAmount] = useState("0");
  const [selectedTokenAddress, setSelectedTokenAddress] = useState<string>("");
  const { switchChainAsync } = useSwitchChain();
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<
    "crypto" | "fiat" | null
  >(null);
  const { setOverallDonations, overallDonations } = useEnvironmentStore(
    (store: any) => store
  );
  const vaultAddress = "0xace8655DE7f2a1865DDd686CFcdD47447B86965C";
  const bitcoinAddress = "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh";
  const solanaAddress = "5YNmS1R9nNSCDzb5a7mMJ1dwK9uHeAAF4CmPEwKgVWc8";
  const {
    primaryWallet,
    setShowAuthFlow,
    handleLogOut,
    user,
    networkConfigurations,
  } = useDynamicContext();
  const isLoggedIn = useIsLoggedIn();
  const { walletOptions, selectWalletOption } = useWalletOptions();

  // State variables
  const [tokenBalances, setTokenBalances] = useState<{ [key: string]: string }>(
    {}
  );
  const [txHash, setTxHash] = useState<string>("");
  const [connectedWalletType, setConnectedWalletType] = useState<string>("");

  // Reset everything on initial load
  useEffect(() => {
    console.log(disaster);
    console.log(params.id);

    if (isLoggedIn) handleLogOut();
    if (address) disconnect();
  }, []);

  // Clean up when wallet disconnects
  useEffect(() => {
    if (!isConnected && !primaryWallet) {
      // Reset everything when wallet is disconnected
      setSelectedPaymentMethod(null);
      setSelectedTokenAddress("");
      setDonateFundsAmount("0");
      setConnectedWalletType("");
    }
  }, [isConnected, primaryWallet]);

  // Detect wallet type when primaryWallet changes
  useEffect(() => {
    if (primaryWallet) {
      if (isBitcoinWallet(primaryWallet)) {
        setConnectedWalletType("bitcoin");
        setSelectedNetwork(2);
        // Don't auto-select payment method so user can choose fiat or crypto
        // setSelectedPaymentMethod("crypto");
      } else if (isSolanaWallet(primaryWallet)) {
        setConnectedWalletType("solana");
        setSelectedNetwork(3);
        // Don't auto-select payment method so user can choose fiat or crypto
        // setSelectedPaymentMethod("crypto");
      }
      console.log("Connected wallet type:", connectedWalletType);
      console.log("Primary wallet:", primaryWallet);
    } else {
      // Clear wallet type when wallet is disconnected
      setConnectedWalletType("");
    }
  }, [primaryWallet]);

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

  // Update the apply parameter from URL
  useEffect(() => {
    const applyParam = searchParams.get("apply")
      ? JSON.parse(searchParams.get("apply") as string)
      : false;
    setApply(applyParam);
  }, [params, searchParams]);

  // Handle Bitcoin transaction
  const sendBitcoinTransaction = async () => {
    try {
      if (!primaryWallet || !isBitcoinWallet(primaryWallet)) {
        throw new Error("Bitcoin wallet not connected");
      }

      // Amount in satoshis (1 BTC = 100,000,000 satoshis)
      const amountInSatoshis = Math.floor(
        parseFloat(donateFundsAmount) * 100000000
      );

      // Send Bitcoin using the Dynamic SDK Bitcoin wallet connector
      const transactionId = await primaryWallet.sendBitcoin({
        recipientAddress: bitcoinAddress,
        amount: BigInt(amountInSatoshis),
      });

      setTxHash(transactionId || "");
      setOverallDonations(parseInt(donateFundsAmount));

      toast({
        title: "Bitcoin Donation Successful!",
        description: `Thank you for your donation. Transaction ID: ${transactionId}`,
      });
    } catch (error) {
      console.error("Bitcoin transaction error:", error);
      toast({
        title: "Transaction Failed",
        description: "Please check your balance and try again",
        variant: "destructive",
      });
    }
  };

  // Handle Solana transaction
  const sendSolanaTransaction = async () => {
    try {
      if (!primaryWallet || !isSolanaWallet(primaryWallet)) {
        throw new Error("Solana wallet not connected");
      }

      // Get Solana connection
      const connection = await primaryWallet.getConnection();

      // Create public keys
      const fromKey = new PublicKey(primaryWallet.address);
      const toKey = new PublicKey(solanaAddress);

      // Convert amount to lamports (1 SOL = 1,000,000,000 lamports)
      const amountInLamports = Math.floor(
        parseFloat(donateFundsAmount) * 1000000000
      );

      // Create transfer instruction
      const instructions = [
        SystemProgram.transfer({
          fromPubkey: fromKey,
          lamports: amountInLamports,
          toPubkey: toKey,
        }),
      ];

      // Get latest blockhash
      const blockhash = await connection.getLatestBlockhash();

      // Create versioned transaction message
      const messageV0 = new TransactionMessage({
        instructions,
        payerKey: fromKey,
        recentBlockhash: blockhash.blockhash,
      }).compileToV0Message();

      // Create versioned transaction
      const transferTransaction = new VersionedTransaction(messageV0);

      // Get signer from wallet
      const signer = await primaryWallet.getSigner();

      // Sign and send transaction
      const result = await signer.signAndSendTransaction(transferTransaction);

      setTxHash(result.signature || "");
      setOverallDonations(parseInt(donateFundsAmount));

      toast({
        title: "Solana Donation Successful!",
        description: `Thank you for your donation. Transaction signature: ${result.signature}`,
      });
    } catch (error) {
      console.error("Solana transaction error:", error);
      toast({
        title: "Transaction Failed",
        description: "Please check your balance and try again",
        variant: "destructive",
      });
    }
  };

  // Handle EVM transaction
  const sendEvmTransaction = async () => {
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
        const { request } = await publicClient.simulateContract({
          account: address as `0x${string}`,
          address: selectedTokenAddress as `0x${string}`,
          abi: erc20Abi,
          functionName: "transfer",
          args: [vaultAddress, parseUnits(donateFundsAmount, 18)],
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
        description: "Please check your balance and try again",
        variant: "destructive",
      });
    }
  };

  // Handle fiat payment (placeholder for now)
  const handleFiatPayment = () => {
    toast({
      title: "Fiat Payment",
      description: "Card payment integration coming soon",
    });
  };

  // Function to handle donation based on wallet type
  const handleDonation = async () => {
    if (selectedPaymentMethod === "fiat") {
      // Handle fiat payment
      handleFiatPayment();
      return;
    }

    if (isConnected && selectedChainId) {
      // Handle EVM wallet donation
      await sendEvmTransaction();
    } else if (connectedWalletType === "bitcoin") {
      // Handle Bitcoin donation
      await sendBitcoinTransaction();
    } else if (connectedWalletType === "solana") {
      // Handle Solana donation
      await sendSolanaTransaction();
    } else {
      toast({
        title: "Wallet Not Connected",
        description: "Please connect a wallet first",
        variant: "destructive",
      });
    }
  };

  // Check if a wallet is connected (either through wagmi or Dynamic)
  const hasConnectedWallet = isConnected || primaryWallet;

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
            {isConnected ? (
              <ConnectButton />
            ) : (
              isLoggedIn && <DynamicWidget variant="modal" />
            )}
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
                {/* Chain Selection via Images for EVM */}
                {selectedPaymentMethod === "crypto" && isConnected && (
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
                  {selectedPaymentMethod === "crypto" && (
                    <div className="flex space-x-2">
                      <Input
                        type="number"
                        placeholder="Enter amount"
                        className="w-3/5"
                        value={donateFundsAmount}
                        disabled={!selectedPaymentMethod}
                        onChange={(e) => setDonateFundsAmount(e.target.value)}
                      />

                      {/* For EVM wallets - token selection */}
                      {isConnected && (
                        <Select
                          value={selectedTokenAddress}
                          onValueChange={setSelectedTokenAddress}
                        >
                          <SelectTrigger
                            className="h-10 px-3 py-2 w-2/5 flex items-center justify-between"
                            disabled={selectedChainId === 0}
                          >
                            <SelectValue placeholder="Select Token">
                              {selectedTokenAddress && (
                                <div className="flex items-center justify-between ">
                                  <div className="flex items-center space-x-3">
                                    <Image
                                      src={
                                        idToTokenInfo[selectedChainId]?.find(
                                          (token: any) =>
                                            token.address ===
                                            selectedTokenAddress
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
                                            token.address ===
                                            selectedTokenAddress
                                        )?.name
                                      }
                                    </div>
                                  </div>
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
                      )}

                      {/* For non-EVM wallets - just show the currency */}
                      {!isConnected && connectedWalletType === "bitcoin" && (
                        <div className="flex items-center space-x-2 border rounded-md px-3 py-2 w-2/5">
                          <Image
                            src="/chains/bitcoin.png"
                            width={24}
                            height={24}
                            alt="Bitcoin"
                            className="rounded-full"
                          />
                          <span>BTC</span>
                        </div>
                      )}

                      {!isConnected && connectedWalletType === "solana" && (
                        <div className="flex items-center space-x-2 border rounded-md px-3 py-2 w-2/5">
                          <Image
                            src="/chains/solana.png"
                            width={24}
                            height={24}
                            alt="Solana"
                            className="rounded-full"
                          />
                          <span>SOL</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Fiat payment option */}
                  {selectedPaymentMethod === "fiat" && (
                    <div className="flex space-x-2">
                      <Input
                        type="number"
                        placeholder="Enter amount in USD"
                        className="w-full"
                        value={donateFundsAmount}
                        onChange={(e) => setDonateFundsAmount(e.target.value)}
                      />
                    </div>
                  )}

                  {/* Network Selection */}
                  {!hasConnectedWallet && (
                    <div className="flex space-x-2 justify-center">
                      <Image
                        src={"/chains/eth.png"}
                        width={24}
                        height={24}
                        className={
                          selectedNetwork === 1
                            ? "opacity-100 select-none rounded-full transition"
                            : "opacity-40 hover:opacity-80 hover:scale-110 cursor-pointer select-none rounded-full transition"
                        }
                        alt={"EVM"}
                        onClick={() => {
                          setSelectedNetwork(1);
                          setSelectedChainId(0);
                          setSelectedTokenAddress("");
                          setTokenBalances({});
                          setDonateFundsAmount("0");
                          setConnectedWalletType("");
                        }}
                      />
                      <Image
                        src={"/chains/bitcoin.png"}
                        width={24}
                        height={24}
                        className={
                          selectedNetwork === 2
                            ? "opacity-100 select-none rounded-full transition"
                            : "opacity-40 hover:opacity-80 hover:scale-110 cursor-pointer select-none rounded-full transition"
                        }
                        alt={"BTC"}
                        onClick={() => {
                          setSelectedNetwork(2);
                          setSelectedChainId(0);
                          setSelectedTokenAddress("");
                          setTokenBalances({});
                          setDonateFundsAmount("0");
                          setConnectedWalletType("");
                        }}
                      />
                      <Image
                        src={"/chains/solana.png"}
                        width={24}
                        height={24}
                        className={
                          selectedNetwork === 3
                            ? "opacity-100 select-none rounded-full transition"
                            : "opacity-40 hover:opacity-80 hover:scale-110 cursor-pointer select-none rounded-full transition"
                        }
                        alt={"SOL"}
                        onClick={() => {
                          setSelectedNetwork(3);
                          setSelectedChainId(0);
                          setSelectedTokenAddress("");
                          setTokenBalances({});
                          setDonateFundsAmount("0");
                          setConnectedWalletType("");
                        }}
                      />
                    </div>
                  )}

                  {/* Payment Method Selection */}
                  {!hasConnectedWallet ? (
                    <Button
                      className="bg-primary w-full"
                      disabled={selectedNetwork === 0}
                      onClick={() => {
                        if (selectedNetwork === 1) {
                          if (openConnectModal) openConnectModal();
                        } else if (selectedNetwork === 2) {
                          // For Bitcoin
                          setShowAuthFlow(true);
                          // Filter and select a Bitcoin wallet option if available
                          const bitcoinWalletOption = walletOptions.find(
                            (option) =>
                              option.name.toLowerCase().includes("bitcoin")
                          );
                          if (bitcoinWalletOption) {
                            selectWalletOption(bitcoinWalletOption.key);
                          }
                        } else if (selectedNetwork === 3) {
                          // For Solana
                          setShowAuthFlow(true);
                          // Filter and select a Solana wallet option if available
                          const solanaWalletOption = walletOptions.find(
                            (option) =>
                              option.name.toLowerCase().includes("solana") ||
                              option.name.toLowerCase().includes("phantom")
                          );
                          if (solanaWalletOption) {
                            selectWalletOption(solanaWalletOption.key);
                          }
                        }
                      }}
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
                    isConnected && chainId !== selectedChainId ? (
                      <Button
                        className="bg-primary w-full"
                        disabled={selectedChainId === 0}
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
                          (isConnected &&
                            (!selectedTokenAddress ||
                              !donateFundsAmount ||
                              parseFloat(donateFundsAmount) <= 0)) ||
                          (!isConnected &&
                            (!donateFundsAmount ||
                              parseFloat(donateFundsAmount) <= 0))
                        }
                        onClick={handleDonation}
                      >
                        Donate now
                      </Button>
                    )
                  ) : (
                    // Fiat payment button
                    <Button
                      className="bg-primary w-full"
                      disabled={
                        !donateFundsAmount || parseFloat(donateFundsAmount) <= 0
                      }
                      onClick={handleFiatPayment}
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
