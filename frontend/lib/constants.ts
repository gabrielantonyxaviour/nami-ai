// import { baseSepolia, polygonAmoy, sepolia } from "viem/chains";
// import { Agent, Chain } from "./type";

import {
  Chain,
  createPublicClient,
  defineChain,
  http,
  zeroAddress,
} from "viem";
import { ApolloClient, InMemoryCache, gql } from "@apollo/client";
import { baseSepolia, polygonAmoy, scrollSepolia, sepolia } from "viem/chains";
import { HardcodedDisaster } from "./type";

export const idToChain: Record<number, Chain> = {
  [baseSepolia.id]: baseSepolia,
  [polygonAmoy.id]: polygonAmoy,
  [scrollSepolia.id]: scrollSepolia,
  [sepolia.id]: sepolia,
};

interface ChainInfo {
  id: number | string;
  name: string;
  ticker: string;
  identifier: string;
}

export const idToNetworkType: Record<number, { id: number; name: string }> = {
  1: {
    id: 1,
    name: "L1 EVM Chains",
  },
  2: {
    id: 2,
    name: "L2 EVM Chains",
  },
  3: {
    id: 3,
    name: "L1 Non-EVM Chains",
  },
  4: {
    id: 4,
    name: "L2 Non-EVM Chains",
  },
  5: {
    id: 5,
    name: "Innovative Chains",
  },
  6: {
    id: 6,
    name: "L2 BTC Chains",
  },
};

// L1 EVM Networks
export const idToL1EVMChains: Record<number, ChainInfo> = {
  1: { id: 1, name: "Ethereum", ticker: "ETH", identifier: "ETHEREUM" },
  56: { id: 56, name: "BNB Chain", ticker: "BNB", identifier: "BSC" },
  43114: {
    id: 43114,
    name: "Avalanche",
    ticker: "AVAX",
    identifier: "AVALANCHE",
  },
  137: { id: 137, name: "Polygon", ticker: "MATIC", identifier: "POLYGON" },
  1088: { id: 1088, name: "Metis", ticker: "METIS", identifier: "METIS" },
  1625: { id: 1625, name: "Gravity", ticker: "GRAV", identifier: "GRAVITY" },
  146: { id: 146, name: "Sonic", ticker: "SONIC", identifier: "SONIC" },
};

// L2 EVM Networks
export const idToL2EVMChains: Record<number, ChainInfo> = {
  34443: { id: 34443, name: "Mode", ticker: "ETH", identifier: "MODE" },
  10: { id: 10, name: "Optimism", ticker: "ETH", identifier: "OPTIMISM" },
  196: { id: 196, name: "X Layer", ticker: "ETH", identifier: "X_LAYER" },
  7777777: { id: 7777777, name: "Zora", ticker: "ETH", identifier: "ZORA" },
  1101: { id: 1101, name: "Polygon zkEVM", ticker: "ETH", identifier: "ZKEVM" },
  42170: {
    id: 42170,
    name: "Arbitrum Nova",
    ticker: "ETH",
    identifier: "ARBITRUM_NOVA",
  },
  5000: { id: 5000, name: "Mantle", ticker: "MNT", identifier: "MANTLE" },
  169: { id: 169, name: "Manta Pacific", ticker: "ETH", identifier: "MANTA" },
  7000: {
    id: 7000,
    name: "ZetaChain",
    ticker: "ZETA",
    identifier: "ZETA_CHAIN",
  },
  8453: { id: 8453, name: "Base", ticker: "ETH", identifier: "BASE" },
  2818: { id: 2818, name: "Morph", ticker: "ETH", identifier: "MORPH" },
  480: {
    id: 480,
    name: "World Chain",
    ticker: "ETH",
    identifier: "WORLD_CHAIN",
  },
  534352: { id: 534352, name: "Scroll", ticker: "ETH", identifier: "SCROLL" },
  42161: {
    id: 42161,
    name: "Arbitrum One",
    ticker: "ETH",
    identifier: "ARBITRUM",
  },
  59144: { id: 59144, name: "Linea", ticker: "ETH", identifier: "LINEA" },
  324: { id: 324, name: "zkSync Era", ticker: "ETH", identifier: "ZKSYNC" },
  167000: { id: 167000, name: "Taiko", ticker: "ETH", identifier: "TAIKO" },
};

// L1 Non-EVM Networks
export const idToL1NonEVMChains: Record<number, ChainInfo> = {
  0: { id: 0, name: "TON", ticker: "TON", identifier: "TON" },
  900: { id: 900, name: "Solana", ticker: "SOL", identifier: "SOLANA" },
  1000: { id: 1000, name: "TRON", ticker: "TRX", identifier: "TRON" },
  101113: { id: 101113, name: "Bitcoin", ticker: "BTC", identifier: "BITCOIN" },
  101: { id: 101, name: "Sui", ticker: "SUI", identifier: "SUI" },
};

// L2 Non-EVM Networks
export const idToL2NonEVMChains: Record<number | string, ChainInfo> = {
  "0x534e5f4d41494e": {
    id: "0x534e5f4d41494e",
    name: "Starknet",
    ticker: "ETH",
    identifier: "STARKNET",
  },
  9889: { id: 9889, name: "Fuel", ticker: "ETH", identifier: "FUEL" },
  902: { id: 902, name: "Eclipse", ticker: "ETH", identifier: "ECLIPSE" },
};

// Innovative Networks
export const idToInnovativeChains: Record<number, ChainInfo> = {
  185: {
    id: 185,
    name: "Mint Chain",
    ticker: "MINT",
    identifier: "MINT_CHAIN",
  },
  81457: { id: 81457, name: "Blast", ticker: "ETH", identifier: "BLAST" },
  255: { id: 255, name: "Kroma", ticker: "ETH", identifier: "KROMA" },
  810180: {
    id: 810180,
    name: "zkLink Nova",
    ticker: "ETH",
    identifier: "ZK_LINK_NOVA",
  },
  1380012617: {
    id: 1380012617,
    name: "Rari Chain",
    ticker: "RARI",
    identifier: "RARI_CHAIN",
  },
  204: { id: 204, name: "opBNB", ticker: "BNB", identifier: "OPBNB" },
  48900: { id: 48900, name: "Zircuit", ticker: "ETH", identifier: "ZIRCUIT" },
  33139: {
    id: 33139,
    name: "ApeChain",
    ticker: "APE",
    identifier: "APE_CHAIN",
  },
  2741: { id: 2741, name: "Abstract", ticker: "ABS", identifier: "ABSTRACT" },
  80094: {
    id: 80094,
    name: "Berachain",
    ticker: "BERA",
    identifier: "BERACHAIN",
  },
};

// L2 BTC Networks
export const idToL2BTCChains: Record<number, ChainInfo> = {
  223: { id: 223, name: "B² Network", ticker: "BTC", identifier: "B² NETWORK" },
  4200: { id: 4200, name: "Merlin", ticker: "BTC", identifier: "MERLIN" },
  60808: { id: 60808, name: "BOB", ticker: "BTC", identifier: "BOB" },
  200901: {
    id: 200901,
    name: "Bitlayer",
    ticker: "BTC",
    identifier: "BITLAYER",
  },
};
export const networkIdToChainLists: Record<
  number,
  Record<number, ChainInfo>
> = {
  1: idToL1EVMChains,
  2: idToL2EVMChains,
  3: idToL1NonEVMChains,
  4: idToL2NonEVMChains,
  5: idToInnovativeChains,
  6: idToL2BTCChains,
};
// Testnet Networks
export const idToTestnetChains: Record<number, ChainInfo> = {
  84532: {
    id: 84532,
    name: "Base Sepolia",
    ticker: "ETH",
    identifier: "BASE_SEPOLIA",
  },
  80002: {
    id: 80002,
    name: "Polygon Amoy",
    ticker: "MATIC",
    identifier: "POLYGON_AMOY",
  },
  58008: {
    id: 58008,
    name: "Zircuit Testnet",
    ticker: "ETH",
    identifier: "ZIRCUIT_TESTNET",
  },
  534351: {
    id: 534351,
    name: "Scroll Sepolia",
    ticker: "ETH",
    identifier: "SCROLL_SEPOLIA",
  },
  11155111: {
    id: 11155111,
    name: "Sepolia",
    ticker: "ETH",
    identifier: "SEPOLIA",
  },
};

export const allChains: Record<number, ChainInfo> = {
  ...idToL1EVMChains,
  ...idToL1NonEVMChains,
  ...idToL2EVMChains,
  ...idToL2BTCChains,
  ...idToInnovativeChains,
  ...idToL2NonEVMChains,
};

export const idToChainInfo: Record<
  number,
  {
    id: number;
    name: string;
    chainId: number;
    image: string;
    rpcUrl: string;
    blockExplorer: string;
  }
> = {
  [baseSepolia.id]: {
    id: 1,
    name: baseSepolia.name,
    chainId: baseSepolia.id,
    image: "/chains/base.png",
    rpcUrl:
      "https://api.developer.coinbase.com/rpc/v1/base-sepolia/" +
      process.env.NEXT_PUBLIC_ONCHAINKIT_API_KEY,
    blockExplorer: "https://base-sepolia.blockscout.com",
  },
  [polygonAmoy.id]: {
    id: 2,
    name: polygonAmoy.name,
    chainId: polygonAmoy.id,
    image: "/chains/pol.png",
    rpcUrl:
      "https://polygon-amoy.g.alchemy.com/v2/" +
      process.env.NEXT_PUBLIC_ALCHEMY_API_KEY,
    blockExplorer: "https://amoy.polygonscan.com",
  },
  [scrollSepolia.id]: {
    id: 5,
    name: scrollSepolia.name,
    chainId: scrollSepolia.id,
    image: "/chains/scroll.png",
    rpcUrl:
      "https://scroll-sepolia.g.alchemy.com/v2/" +
      process.env.NEXT_PUBLIC_ALCHEMY_API_KEY,
    blockExplorer: "https://sepolia.scrollscan.com/",
  },
  [sepolia.id]: {
    id: 6,
    name: sepolia.name,
    chainId: sepolia.id,
    image: "/chains/eth.png",
    rpcUrl:
      "https://eth-sepolia.g.alchemy.com/v2/" +
      process.env.NEXT_PUBLIC_ALCHEMY_API_KEY,
    blockExplorer: "https://eth-sepolia.blockscout.com/",
  },
};

export const idToTokenInfo: Record<any, any> = {
  [baseSepolia.id]: [
    {
      id: 0,
      name: "ETH",
      address: zeroAddress,
      image: "/token/eth.png",
    },
    {
      id: 1,
      name: "WETH",
      address: "0xBE3D118760d9be86688D88929c2122cEc9Ec4635",
      image: "/token/weth.png",
    },
    {
      id: 2,
      name: "USDC",
      address: "0x4393eD225A2F48C27eA6CeBec139190cb8EA8A5F",
      image: "/token/usdc.png",
    },
    {
      id: 3,
      name: "USDT",
      address: "0x9FafD4cB45410a931b538F1D97EFCC28b147E449",
      image: "/token/usdt.svg",
    },
  ],
  [polygonAmoy.id]: [
    {
      id: 0,
      name: "POL",
      address: zeroAddress,
      image: "/chains/pol.png",
    },
    {
      id: 1,
      name: "WETH",
      address: "0x094605EB62e5AF67b9b03f51f313C747C4c7dE66",
      image: "/token/weth.png",
    },
    {
      id: 2,
      name: "USDC",
      address: "0xD4171D5a25B3A684d1952Dd8141fA27911004f12",
      image: "/token/usdc.png",
    },
    {
      id: 3,
      name: "USDT",
      address: "0x79E72dCc5beEE7F288c7e73C5052FEEBb9C491d9",
      image: "/token/usdt.svg",
    },
  ],
  [scrollSepolia.id]: [
    {
      id: 0,
      name: "ETH",
      address: zeroAddress,
      image: "/token/eth.png",
    },
    {
      id: 1,
      name: "WETH",
      address: "0x582384603173D650D634c52dD37771cFE439A888",
      image: "/token/weth.png",
    },
    {
      id: 2,
      name: "USDC",
      address: "0xdE6d2CaE1BA329c0a09c21Ac6Aa5958A7d355971",
      image: "/token/usdc.png",
    },
    {
      id: 3,
      name: "USDT",
      address: "0x094605EB62e5AF67b9b03f51f313C747C4c7dE66",
      image: "/token/usdt.svg",
    },
  ],
  [sepolia.id]: [
    {
      id: 0,
      name: "ETH",
      address: zeroAddress,
      image: "/token/eth.png",
    },
    {
      id: 1,
      name: "WETH",
      address: "0xf9F24Ca70e087CA30D8A1AB45c0cd502A2B3B370",
      image: "/token/weth.png",
    },
    {
      id: 2,
      name: "USDC",
      address: "0x04D99018f10F500427c76dab28752f04d93c6389",
      image: "/token/usdc.png",
    },
    {
      id: 3,
      name: "USDT",
      address: "0xE9EA89276C4CB5945BB65F8b264fbDF7235E6Da9",
      image: "/token/usdt.svg",
    },
  ],
};

export const MPC_CONTRACT = "v1.signer-prod.testnet";
export const GOJO_CONTRACT = "gojo-protocol.testnet";
export const GOJO_TOKEN_CONTRACT = "token.gojo-protocol.testnet";
export const DERIVATION_PATH = "gojo";

export const MAX_GAS = "300000000000000";
export const TWO_HUNDRED_GAS = "200000000000000";
export const THIRTY_GAS = "30000000000000";
export const ALT_CODE = ` pragma solidity ^0.8.0;

              contract Counter {
                  uint256 public count;

                  event CountChanged(uint256 newCount);

                  constructor() {
                      count = 0;
                  }

                  function increment() public {
                      count += 1;
                      emit CountChanged(count);
                  }

                  function decrement() public {
                      require(count > 0, "Counter: count can't go below zero");
                      count -= 1;
                      emit CountChanged(count);
                  }

                  function getCount() public view returns (uint256) {
                      return count;
                  }
              }`;

export const AI_HOSTED_URL = "https://gojo-protocol.onrender.com/chat";
export const AI_LOCAL_URL = "http://127.0.0.1:8000/chat";
export const COMPILE_HOSTED_URL =
  "https://gojo-compile-server.onrender.com/chat";
export const COMPILE_LOCAL_URL = "http://localhost:3001/compile";

interface Token {
  address: string;
  chainId: number;
  decimals: number;
  image: string;
  name: string;
  symbol: string;
}

export const wethToken: Token = {
  address: "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2",
  chainId: 1,
  decimals: 18,
  image: "https://etherscan.io/token/images/weth_28.png",
  name: "Wrapped Ether",
  symbol: "WETH",
};

export const usdcToken: Token = {
  address: "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
  chainId: 1,
  decimals: 6,
  image: "https://etherscan.io/token/images/usdc_28.png",
  name: "USD Coin",
  symbol: "USDC",
};
export const ethToken: Token = {
  address: zeroAddress,
  chainId: 1,
  decimals: 18,
  image: "https://etherscan.io/token/images/ethereum_28.png",
  name: "Ether",
  symbol: "ETH",
};
export const degenToken: Token = {
  address: "0x7f3edcdd180d6b3c721e1eae0f6a8e9baf6f6e9a",
  chainId: 1,
  decimals: 18,
  image: "https://etherscan.io/token/images/degen_32.png",
  name: "Degen Token",
  symbol: "DEGEN",
};

const clickContractAddress = "0x67c97D1FB8184F038592b2109F854dfb09C77C75";
const clickContractAbi = [
  {
    type: "function",
    name: "click",
    inputs: [],
    outputs: [],
    stateMutability: "nonpayable",
  },
] as const;

export const contracts: any = [
  {
    address: clickContractAddress,
    abi: clickContractAbi,
    functionName: "click",
    args: [],
  },
];

export const mapsStyle = [
  {
    elementType: "geometry",
    stylers: [{ color: "#212121" }],
  },
  {
    elementType: "labels.text.fill",
    stylers: [{ color: "#ffffff" }],
  },
  {
    featureType: "water",
    elementType: "geometry",
    stylers: [{ color: "#4d8dff" }],
  },
  {
    featureType: "road",
    stylers: [{ color: "#000000" }],
  },
];

export const disasters: HardcodedDisaster[] = [
  {
    id: 1,
    title: "Floods in Thailand",
    images: ["/disasters/bangkok.png"],
    coordinates: {
      lat: 13.7563,
      lng: 100.5018,
    },
    description:
      "Severe monsoon flooding has inundated large parts of Thailand, affecting millions of residents. Critical infrastructure and homes are underwater, requiring immediate humanitarian assistance for evacuation, emergency shelter, and clean water distribution.",
    attestationId: "onchain_evm_84532_0xb23",
    createdAt: "2024-11-08T14:30:00Z",
    totalRaisedInUSD: 0,
    requiredFundsInUSD: 250000,
    vaultAddress: "0x0429A2Da7884CA14E53142988D5845952fE4DF6a",
    subName: "thailand.nami.eth",
  },
  {
    id: 2,
    title: "Wildfire in Brazil",
    images: ["/disasters/brazil.png"],
    coordinates: {
      lat: -3.7436,
      lng: -73.2516,
    },
    description:
      "Massive wildfires are ravaging the Amazon rainforest, threatening indigenous communities and critical wildlife habitats. Emergency funds needed for firefighting efforts, community relocation, and environmental preservation measures.",
    attestationId: "onchain_evm_84532_0xb23",
    createdAt: "2024-09-12T00:00:00Z",
    totalRaisedInUSD: 0,
    requiredFundsInUSD: 1200000,
    vaultAddress: "0x0429A2Da7884CA14E53142988D5845952fE4DF6a",
    subName: "brazil.nami.eth",
  },
  {
    id: 3,
    title: "Earthquake in Tokyo",
    images: ["/disasters/tokyo.png"],
    coordinates: {
      lat: 35.6762,
      lng: 139.6503,
    },
    description:
      "A 7.2 magnitude earthquake has struck the Greater Tokyo Area, causing significant structural damage and disrupting essential services. Immediate support required for search and rescue operations, temporary housing, and infrastructure stabilization.",
    attestationId: "onchain_evm_84532_0xb23",
    createdAt: "2024-10-25T00:00:00Z",
    totalRaisedInUSD: 892000,
    requiredFundsInUSD: 2000000,
    vaultAddress: "0x0429A2Da7884CA14E53142988D5845952fE4DF6a",
    subName: "tokyo.nami.eth",
  },
  {
    id: 4,
    title: "Typhoon in Vietnam",
    images: ["/disasters/vietnam.png"],
    coordinates: {
      lat: 21.0285,
      lng: 105.8542,
    },
    description:
      "Super Typhoon has made landfall in northern Vietnam, causing widespread flooding and wind damage. Coastal communities are severely impacted, with urgent needs for emergency shelter, food supplies, and medical assistance.",
    attestationId: "onchain_evm_84532_0xb23",
    createdAt: "2024-11-10T08:20:00Z",
    totalRaisedInUSD: 167000,
    requiredFundsInUSD: 650000,
    vaultAddress: "0x0429A2Da7884CA14E53142988D5845952fE4DF6a",
    subName: "typhoon.nami.eth",
  },
];

export const GRAPH_CLIENT_URL = "http://127.0.0.1:4000/graphql";

export const GET_BALANCES_QUERY = gql`
  query GetBalances($address: String!) {
    kintoBalances(where: { account_contains: $address }) {
      amount
      token {
        id
        symbol
      }
    }
    polBalances(where: { account_contains: $address }) {
      amount
      token {
        id
        symbol
      }
    }
    ethBalances(where: { account_contains: $address }) {
      amount
      token {
        id
        symbol
      }
    }
    scrollBalances(where: { account_contains: $address }) {
      amount
      token {
        id
        symbol
      }
    }
    baseBalances(where: { account_contains: $address }) {
      amount
      token {
        id
        symbol
      }
    }
  }
`;

export const GET_DISASTERS_BY_ADDRESS_QUERY = gql`
  query GetDisasterByAddress(
    $vault: Bytes!
    $to: String!
    $tokenSymbol: String
    $chain: String
    $baseOrderBy: baseTransfer_orderBy
    $polygonOrderBy: polTransfer_orderBy
    $ethereumOrderBy: ethTransfer_orderBy
    $kintoOrderBy: kintoTransfer_orderBy
    $scrollOrderBy: scrollTransfer_orderBy
    $orderDirection: OrderDirection
  ) {
    disasterDescriptives(where: { vaultAddress: $vault }) {
      id
      name
      description
      disasterType
      location
      createdAt
      fundsNeeded
      ensName
      baseName
      vaultAddress
      attestationId
      transactionHash
      hyperlaneMessageId
      totalFundsReleased
      totalBeneficiaries
      fundReleases {
        id
        beneficiary {
          id
          name
          totalAmountReceived
        }
        attestationId
        comments
        amountInUSD
        hyperlaneMessageId
        transactionHash
        claims {
          chainId
          tokens
          amounts
        }
      }
    }

    baseTransfers(
      where: { to: $to }
      orderBy: $baseOrderBy
      orderDirection: $orderDirection
    ) {
      id
      token {
        id
        name
        symbol
      }
      from {
        id
      }
      to {
        id
      }
      amount
      blockNumber
      timestamp
      transactionHash
    }

    ethTransfers(
      where: { to: $to }
      orderBy: $ethereumOrderBy
      orderDirection: $orderDirection
    ) {
      id
      token {
        id
        name
        symbol
      }
      from {
        id
      }
      to {
        id
      }
      amount
      blockNumber
      timestamp
      transactionHash
    }

    polTransfers(
      where: { to: $to }
      orderBy: $polygonOrderBy
      orderDirection: $orderDirection
    ) {
      id
      token {
        id
        name
        symbol
      }
      from {
        id
      }
      to {
        id
      }
      amount
      blockNumber
      timestamp
      transactionHash
    }

    kintoTransfers(
      where: { to: $to }
      orderBy: $kintoOrderBy
      orderDirection: $orderDirection
    ) {
      id
      token {
        id
        name
        symbol
      }
      from {
        id
      }
      to {
        id
      }
      amount
      blockNumber
      timestamp
      transactionHash
    }

    scrollTransfers(
      where: { to: $to }
      orderBy: $scrollOrderBy
      orderDirection: $orderDirection
    ) {
      id
      token {
        id
        name
        symbol
      }
      from {
        id
      }
      to {
        id
      }
      amount
      blockNumber
      timestamp
      transactionHash
    }
  }
`;

export const GET_DISASTERS_QUERY = gql`
  query (
    $orderBy: disasterDescriptive_orderBy!
    $orderDirection: OrderDirection!
  ) {
    disasters {
      id
      transactionHash
      totalFundingAmount
    }
    disasterDescriptives(orderBy: $orderBy, orderDirection: $orderDirection) {
      id
      name
      description
      disasterType
      location
      createdAt
      fundsNeeded
      attestationId
      hyperlaneMessageId
      transactionHash
    }
  }
`;

export const graphClient = new ApolloClient({
  uri: GRAPH_CLIENT_URL,
  cache: new InMemoryCache(),
});

export const publicClients: Record<any, any> = {
  [baseSepolia.id]: createPublicClient({
    chain: baseSepolia,
    transport: http(),
  }),
  [scrollSepolia.id]: createPublicClient({
    chain: scrollSepolia,
    transport: http(),
  }),
  [polygonAmoy.id]: createPublicClient({
    chain: polygonAmoy,
    transport: http(),
  }),
  [sepolia.id]: createPublicClient({
    chain: sepolia,
    transport: http(),
  }),
};
