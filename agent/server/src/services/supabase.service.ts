import { BaseService } from "./base.service.js";
import {
  createClient,
  RealtimeChannel,
  SupabaseClient,
} from "@supabase/supabase-js";
import { ElizaService } from "./eliza.service.js";
import {
  listenForClaimsExamples,
  listenForClaimsPromptTemplate,
  listenForFundingGoalsExamples,
  listenForFundingGoalsPromptTemplate,
  listenForLargeDonationsExamples,
  listenForLargeDonationsPromptTemplate,
} from "../utils/prompt.js";
import { TwitterService } from "./twitter.service.js";
import type { Scraper } from "agent-twitter-client";
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
    if (!this.supabase) return;
    const elizaService = ElizaService.getInstance();
    const scraper = TwitterService.getInstance().getScraper();

    // When a donation above certain amount is made, you can tweet about it as a reply to your original tweet.
    await this.listenForLargeDonations(elizaService, scraper);
    // When the total donations cross the threshold, you can tweet about it.
    await this.listenForFundingGoals(elizaService, scraper);
    //  When some NGO claims from the vault, make a tweet about it
    await this.listenForClaims(elizaService, scraper);

    // TODO LATER: After a certain time, you can tweet about the total donations received and close and thank everyone.
  }

  public async getPostedDisasters(): Promise<any[]> {
    if (this.supabase) {
      const { data, error } = await this.supabase
        .from("nami_disasters")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) {
        console.error(error);
      }
      return data || [];
    }
    return [];
  }

  public async createDisaster(disaster: {
    title: string;
    description: string;
    funds_needed: string;
    sources: string[];
    type: string;
    location: string;
    created_at: string;
    funds_raised: string;
    tweet_url: string;
  }) {
    if (this.supabase) {
      const { data, error } = await this.supabase
        .from("nami_disasters")
        .insert([disaster]);
      if (error) {
        console.error(error);
      }
      return data || [];
    }
    return [];
  }

  private async listenForLargeDonations(
    elizaService: ElizaService,
    scraper: Scraper
  ) {
    if (!this.supabase) return;
    const LARGE_DONATION_THRESHOLD = BigInt("1000000000"); // $1000 USD threshold

    this.supabase
      .channel("large-donations")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "nami_stark_donations",
        },
        async (payload) => {
          if (!this.supabase) return;
          const donation = payload.new;

          if (
            BigInt(donation.usd_amount.toString()) >= LARGE_DONATION_THRESHOLD
          ) {
            try {
              // Get disaster details
              const { data: disaster } = await this.supabase
                .from("nami_disasters")
                .select("*")
                .eq("id", donation.disaster_id)
                .single();

              if (!disaster?.tweet_url) return;

              // Generate tweet
              const runtime = elizaService.getRuntime();
              const { response } =
                await elizaService.messageManager.handleGeneration(
                  {
                    agentName: runtime.character.name,
                    bio: runtime.character.bio,
                    lore: runtime.character.lore,
                    examples: listenForLargeDonationsExamples,
                    donorAddress: donation.donor_address,
                    chain: donation.chain,
                    amount: donation.usd_amount,
                    disasterTitle: disaster.title,
                    disasterLocation: disaster.location,
                    disasterDescription: disaster.description,
                    disasterType: disaster.type,
                  },
                  listenForLargeDonationsPromptTemplate
                );

              await scraper.sendTweet(
                response,
                disaster.tweet_url.split("/").pop()
              );

              // Post tweet
            } catch (error) {
              console.error("Error handling large donation:", error);
            }
          }
        }
      )
      .subscribe();
  }

  private async listenForFundingGoals(
    elizaService: ElizaService,
    scraper: Scraper
  ) {
    if (!this.supabase) return;
    this.supabase
      .channel("funding-goals")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "nami_disasters",
        },
        async (payload) => {
          const disaster = payload.new;

          if (
            disaster.funds_raised >= disaster.funds_needed &&
            payload.old.funds_raised < disaster.funds_needed
          ) {
            try {
              if (!disaster.tweet_url) return;

              // Generate tweet
              const runtime = elizaService.getRuntime();
              const { response } =
                await elizaService.messageManager.handleGeneration(
                  {
                    agentName: runtime.character.name,
                    bio: runtime.character.bio,
                    lore: runtime.character.lore,
                    examples: listenForFundingGoalsExamples,
                    disasterTitle: disaster.title,
                    disasterLocation: disaster.location,
                    disasterDescription: disaster.description,
                    disasterType: disaster.type,
                    fundsNeeded: disaster.funds_needed,
                  },
                  listenForFundingGoalsPromptTemplate
                );

              // Send tweet
              await scraper.sendQuoteTweet(
                response,
                disaster.tweet_url.split("/").pop()
              );
            } catch (error) {
              console.error("Error handling funding goal reached:", error);
            }
          }
        }
      )
      .subscribe();
  }

  private async listenForClaims(elizaService: ElizaService, scraper: Scraper) {
    if (!this.supabase) return;
    this.supabase
      .channel("claims")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "nami_stark_claims",
        },
        async (payload) => {
          if (!this.supabase) return;
          const claim = payload.new;

          try {
            // Get NGO and disaster details
            const { data: ngo } = await this.supabase
              .from("nami_ngos")
              .select("*")
              .eq("id", claim.ngo)
              .single();

            const { data: disaster } = await this.supabase
              .from("nami_disasters")
              .select("*")
              .eq("id", claim.disaster)
              .single();

            if (!disaster?.tweet_url || !ngo) return;

            // Generate tweet
            const runtime = elizaService.getRuntime();
            const { response } =
              await elizaService.messageManager.handleGeneration(
                {
                  agentName: runtime.character.name,
                  bio: runtime.character.bio,
                  lore: runtime.character.lore,
                  examples: listenForClaimsExamples,
                  ngoName: ngo.name,
                  ngoLocation: ngo.location,
                  ngoDescription: ngo.description,
                  claimAmount: claim.usd_amount,
                  disasterTitle: disaster.title,
                  disasterLocation: disaster.location,
                  disasterDescription: disaster.description,
                  disasterType: disaster.type,
                },
                listenForClaimsPromptTemplate
              );
            // Send tweet
            await scraper.sendQuoteTweet(
              response,
              disaster.tweet_url.split("/").pop()
            );
          } catch (error) {
            console.error("Error handling claim:", error);
          }
        }
      )
      .subscribe();
  }

  public async stop(): Promise<void> {
    if (this.supabase && this.channel) {
      await this.channel.unsubscribe();
    }
  }
}
