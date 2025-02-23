import { UUID } from "@ai16z/eliza";

export interface IAccountInfo {
  pkpAddress: string;
  evm: {
    chainId: number;
    address: string;
  }[];
  solana: {
    network: string;
    address: string;
  }[];
}

export interface IExecuteUserOpRequest {
  target: string;
  value: string;
  calldata: string;
}

export interface IExecuteUserOpResponse {
  userOperationHash: string;
  chainId: number;
}

export interface ITransactionReceipt {
  transactionHash?: string;
  transactionIndex?: number;
  blockHash?: string;
  blockNumber?: number;
  from?: string;
  to?: string;
  cumulativeGasUsed?: number;
  status?: string;
  gasUsed?: number;
  contractAddress?: string | null;
  logsBloom?: string;
  effectiveGasPrice?: number;
}

export interface ILog {
  data?: string;
  blockNumber?: number;
  blockHash?: string;
  transactionHash?: string;
  logIndex?: number;
  transactionIndex?: number;
  address?: string;
  topics?: string[];
}

export interface IUserOperationReceipt {
  userOpHash?: string;
  entryPoint?: string;
  sender?: string;
  nonce?: number;
  paymaster?: string;
  actualGasUsed?: number;
  actualGasCost?: number;
  success?: boolean;
  receipt?: ITransactionReceipt;
  logs?: ILog[];
}


export type RawCandle = [number, number, number, number, number]; // [timestamp, open, high, low, close]

export type ProcessedCandle = {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
}
export type ProcessedMarketData = {
  currentPrice: number;
  priceChange24h: number;
  volatility24h: number;
  volumeProfile: {
    averageVolume: number;
    volumeSpikes: number[];
  };
  trendMetrics: {
    direction: 'bullish' | 'bearish' | 'sideways';
    strength: number;
    keyLevels: {
      support: number[];
      resistance: number[];
    };
  };
}

export type SentimentPost = {
  authorUsername: string;
  createdAt: string;
  engagementsCount: number;
  impressionsCount: number;
  likesCount: number;
  quotesCount: number;
  repliesCount: number;
  retweetsCount: number;
  smartEngagementPoints: number;
  text: string;
  matchingScore: number;
}

export type ProcessedSentiment = {
  overallSentiment: number;
  engagementScore: number;
  topInfluencers: string[];
  keyPhrases: string[];
}
export type TakeProfit = {
  price: string;
  percentage: string;
}

export type DCA = {
  price: string;
  percentage: string;
}

export type Chef = {
  id: string;
  username: string;
  name: string;
  bio: string;
  image: string;
  sub_fee: number;
  niche: string[];
  total_subscribers: number;
  avg_pnl_percentage: number;
  avg_calls_per_day: number;
}

export type TradePlay = {
  id?: string;
  created_at?: string;
  chef_id: string;
  chef?: Chef;
  dex: string;
  asset: string;
  chain: string;
  direction: string;
  entry_price: string;
  trade_type: 'spot' | 'future';
  take_profit: TakeProfit[];
  stop_loss: string;
  dca: DCA[];
  timeframe: string
  leverage: string;
  image: string;
  status: "pending" | "ongoing" | "completed";
  pnl_percentage?: string;
  expected_pnl: string;
  research_description: string;
  analysis?: Analysis;
}
export type ExecutedTrade = {
  id: UUID;
  trade_play_id: string;
  trade_play: TradePlay;
  created_at: string;
  username: string;
  amount: number;
  pnl_usdt: number;
  tx_hash: string;
  status: "ongoing" | "completed";
}
export type Analysis = {
  risktoreward: string;
  longtermscore: string;
  marketstrength: string;
  chefreputation: string;
  equitypercent: string;
  explanation: string;
}