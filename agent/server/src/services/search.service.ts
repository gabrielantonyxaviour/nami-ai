import { SearchMode } from "agent-twitter-client";
import { BaseService } from "./base.service.js";
import { ElizaService } from "./eliza.service.js";
import { SupabaseService } from "./supabase.service.js";
import { TwitterService } from "./twitter.service.js";
import axios from "axios";
import { RpcProvider, Contract, Account, constants } from "starknet";
import uploadJSONToPinata from "../utils/pinata.js";
import { ethers } from "ethers";
export class SearchService extends BaseService {
  private static instance: SearchService;

  private constructor() {
    super();
  }

  public static getInstance(): SearchService {
    if (!SearchService.instance) {
      SearchService.instance = new SearchService();
    }
    return SearchService.instance;
  }

  public async start(): Promise<void> {
    const supabaseService = SupabaseService.getInstance();
    const elizaService = ElizaService.getInstance();
    const scraper = TwitterService.getInstance().getScraper();

    const generateSearchDisasterLoop = async () => {
      while (true) {
        // use google engine

        const searchEngineDisasters: string[] = [];
        // use twitter browsing
        const searchTerms = [
          "latest disasters",
          "recent natural disasters",
          "earthquake news",
          "flood alerts",
          "wildfire updates",
        ];
        const fetchTweets = async (term: string) => {
          return scraper.fetchSearchTweets(term, 5, SearchMode.Top);
        };

        // Use 2 API services
        const [earthquakes, disasters, tweets] = await Promise.all([
          this.collectUSGS(),
          this.collectReliefWeb(),
          ...searchTerms.map(fetchTweets),
        ]);

        // Validate with AI
        const postedDisasters = await supabaseService.getPostedDisasters();

        console.log("Disasters Already Posted");
        console.log(postedDisasters);

        console.log("Earthquakes");
        console.log(earthquakes);
        console.log("Disasters");
        console.log(disasters);
        console.log("Tweets");
        console.log(tweets);
        console.log("Search Engine Disasters");
        console.log(searchEngineDisasters);

        const {
          response,
          title,
          location,
          description,
          source_url,
          funds_needed,
          type,
        } = await elizaService.messageManager.handleDisasterValidation({
          earthquakes,
          disasters,
          tweets: tweets.tweets,
          postedDisasters,
          // searchEngineDisasters,
        });

        if (response) {
          console.log("No disasters to post");
        } else {
          // Upload JSON to IPFS
          console.log("Preparing JSON data for IPFS upload...");
          const jsonData = {
            title: title || "Disaster",
            description: description || "A very bad thing happened",
            funds_needed: funds_needed || "1000",
            type: type || "natural disaster",
            sources: source_url ? [source_url] : [],
            images: [],
            location: location || "Earth",
            created_at: new Date().toISOString(),
          };

          console.log("Uploading JSON to IPFS...");
          const ipfsUrl = await uploadJSONToPinata(jsonData);
          console.log("IPFS URL:", ipfsUrl);

          console.log("Setting up StarkNet provider and account...");
          const provider = new RpcProvider({
            nodeUrl: `https://starknet-sepolia.public.blastapi.io`,
          });
          const aiAgentAccount = new Account(
            provider,
            process.env.STARKNET_AGENT_ADDRESS || "",
            process.env.STARKNET_AGENT_PRIVATE_KEY || "",
            undefined,
            constants.TRANSACTION_VERSION.V3
          );

          const namiAddress =
            "0x01198a7dceac6e4c5bb16eb29c6ddf57cd22affb4be476f8f4e8d3131d75bae0";
          const { abi: namiAbi } = await provider.getClassAt(namiAddress);

          if (namiAbi === undefined) {
            throw new Error("No ABI found for Nami contract.");
          }

          console.log("Connecting to Nami contract...");
          const namiContract = new Contract(namiAbi, namiAddress, provider);
          namiContract.connect(aiAgentAccount);

          console.log("Populating create_disaster transaction...");
          const createDisasterTx = namiContract.populate("create_disaster", [
            BigInt(funds_needed || "1000") * BigInt(10 ** 6),
            ethers.getBytes(ipfsUrl),
          ]);

          console.log("Sending create_disaster transaction...");
          const res = await namiContract.create_disaster(
            createDisasterTx.calldata
          );

          console.log("Waiting for transaction confirmation...");
          const txResponse = await provider.waitForTransaction(
            res.transaction_hash
          );

          if (txResponse.isSuccess()) {
            console.log("Transaction successful!");
            const events = txResponse.events;
            const disasterId = Number(events[0].data[0]);
            const vaultAddress = events[0].data[1];

            const donationUrl =
              "https://stark-nami-ai.vercel.app/embed/" + disasterId;
            console.log("Donation URL:", donationUrl);

            console.log("Tweeting donation URL...");
            const tweet = await scraper.sendTweet(donationUrl);
            const tweetResponse: any = await tweet.json();

            const tweetUrl = `https://twitter.com/NamiAIStarknet/status/${tweetResponse.data.create_tweet.tweet_results.result.rest_id}`;
            console.log("Tweet URL:", tweetUrl);

            console.log("Saving disaster to Supabase...");
            await supabaseService.createDisaster({
              title: title || "Disaster",
              description: description || "A very bad thing happened",
              funds_needed: funds_needed || "1000",
              type: type || "natural disaster",
              sources: source_url ? [source_url] : ["ReliefWeb"],
              location: location || "Earth",
              created_at: new Date().toISOString(),
              vault_address: vaultAddress,
              tweet_url: tweetUrl,
              funds_raised: "0",
            });
          } else {
            console.error("Transaction failed:", txResponse);
          }
        }
        console.log("Waiting for 1 hour...");
        await new Promise((resolve) => setTimeout(resolve, 60 * 60 * 1000));
      }
    };
    generateSearchDisasterLoop();
  }
  private async collectReliefWeb() {
    try {
      const response = await axios.get(
        "https://api.reliefweb.int/v1/disasters",
        {
          params: {
            appname: "DisasterMonitor",
            profile: "list",
            preset: "latest",
            slim: 1,
            limit: 50,
          },
        }
      );
      return response.data.data.map((item: any) => ({
        source: "ReliefWeb",
        title: item.fields.name,
        description: item.fields.description || item.fields.name,
        location: item.fields.country?.[0]?.name,
        type: item.fields.type?.[0]?.name,
        source_url: item.fields.url,
        timestamp: new Date(item.fields.date.created).toISOString(),
        status: item.fields.status,
      }));
    } catch (error) {
      console.error("ReliefWeb Error:", error.message);
      return [];
    }
  }
  private async collectUSGS() {
    try {
      const response = await axios.get(
        "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson"
      );
      return response.data.features
        .filter((quake: any) => quake.properties.mag > 5.5)
        .map((quake: any) => ({
          source: "USGS",
          title: `${quake.properties.title}`,
          magnitude: quake.properties.mag,
          location: quake.properties.place,
          source_url: quake.properties.url,
          timestamp: new Date(quake.properties.time).toISOString(),
          type: "earthquake",
        }));
    } catch (error) {
      console.error("USGS Error:", error.message);
      return [];
    }
  }
  public async stop(): Promise<void> {}
}
