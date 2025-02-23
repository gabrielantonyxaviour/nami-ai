import { BaseService } from "./base.service.js";
import {
  createClient,
  RealtimeChannel,
  SupabaseClient,
} from "@supabase/supabase-js";
// import { ethers } from "ethers";
// import {
//   ARB_SEPOLIA_EXCHANGE_ROUTER,
//   INITIAL_COLLATERAL_TOKEN,
//   MARKET_TOKEN,
//   ORDER_VAULT,
//   exchangeRouterAbi,
// } from "../constants.js";
// import { TradePlay } from "../types.js";

export class SupabaseService extends BaseService {
  private static instance: SupabaseService;
  private supabase: SupabaseClient | null = null;
  private channel: RealtimeChannel | null = null;

  private constructor(url: string, key: string) {
    super();
    this.supabase = createClient(url, key);
  }

  public static getInstance(): SupabaseService {
    if (!SupabaseService.instance) {
      SupabaseService.instance = new SupabaseService(
        process.env.SUPABASE_URL || "",
        process.env.SUPABASE_KEY || ""
      );
    }
    return SupabaseService.instance;
  }

  public async start(): Promise<void> {
    // TODO: When you get a donation above certain amount, you can tweet about it as a reply to your original tweet.
    // TODO: When the total donations cross the threshold, you can tweet about it.
    // TODO: After a certain time, you can tweet about the total donations received and close and thank everyone.
  }

  public async getLastestDisasters(): Promise<any[]> {
    return [];
  }

  public async stop(): Promise<void> {
    if (this.supabase && this.channel) {
      await this.channel.unsubscribe();
    }
  }
}
