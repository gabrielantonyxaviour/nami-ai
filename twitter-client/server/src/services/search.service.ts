import { SearchMode } from "agent-twitter-client";
import { BaseService } from "./base.service.js";
import { ElizaService } from "./eliza.service.js";
import { SupabaseService } from "./supabase.service.js";
import { TwitterService } from "./twitter.service.js";
import axios from "axios";
import { RpcProvider, Contract, Account, constants } from "starknet";
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
        // TODO: use google engine
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
        const latestDisasters = await supabaseService.getLastestDisasters();

        console.log("Latest Disasters Already Posted");
        console.log(latestDisasters);

        console.log("Earthquakes");
        console.log(earthquakes);
        console.log("Disasters");
        console.log(disasters);
        console.log("Tweets");
        console.log(tweets);

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
          latestDisasters,
        });

        if (response) {
          console.log("No disasters to post");
        } else {
          console.log("Disaster to post");
          console.log("Title: ", title);
          console.log("Location: ", location);
          console.log("Description: ", description);
          console.log("Source URL: ", source_url);
          console.log("Funds Needed: ", funds_needed);
          console.log("Type: ", type);

          // Send Tx
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
            "0x04cf129a9a73e2b0854d21efc34f9d1a81fb7b4de9079a1eb74890a0892dc079";
          const { abi: namiAbi } = await provider.getClassAt(namiAddress);

          if (namiAbi === undefined) {
            throw new Error("no abi.");
          }
          console.log("Q");

          const namiContract = new Contract(namiAbi, namiAddress, provider);
          namiContract.connect(aiAgentAccount);

          const createDisasterTx = namiContract.populate("create_disaster", [
            200,
            "hello",
          ]);
          console.log("B");
          const res = await namiContract.create_disaster(
            createDisasterTx.calldata
          );
          console.log("C");
          const txResponse = await provider.waitForTransaction(
            res.transaction_hash
          );
          if (txResponse.isSuccess()) {
            const events = txResponse.events;
            const disasterId = Number(events[0].data[0]);

            const donationUrl =
              "https://stark-nami-ai.vercel.app/embed/" + disasterId;
            // Tweet on X
            const tweet = await scraper.sendTweet(donationUrl);
            const tweetResponse: any = await tweet.json();

            const tweetUrl = `https://twitter.com/NamiAIStarknet/status/${tweetResponse.data.create_tweet.tweet_results.result.rest_id}`;
            //  Save to Supabase

            await supabaseService.createDisaster({
              title: title || "Disaster",
              description: description || "A very bad thing happened",
              funds_needed: funds_needed || "1000",
              type: type || "natural disaster",
              sources: source_url ? [source_url] : [],
              location: location || "Earth",
              created_at: new Date().toISOString(),
              tweet_url: tweetUrl,
              funds_raised: "0",
            });
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
