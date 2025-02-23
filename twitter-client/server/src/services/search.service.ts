import { SearchMode } from "agent-twitter-client";
import { BaseService } from "./base.service.js";
import { ElizaService } from "./eliza.service.js";
import { SupabaseService } from "./supabase.service.js";
import { TwitterService } from "./twitter.service.js";
import axios from "axios";
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
        // TODO: use twitter browsing
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

        // TODO: use 2 API services
        const [earthquakes, disasters, tweets] = await Promise.all([
          this.collectUSGS(),
          this.collectReliefWeb(),
          ...searchTerms.map(fetchTweets),
        ]);

        // TODO: Validate with AI

        const latestDisasters = await supabaseService.getLastestDisasters();

        console.log("Latest Disasters Already Posted");
        console.log(latestDisasters);

        console.log("Earthquakes");
        console.log(earthquakes);
        console.log("Disasters");
        console.log(disasters);
        console.log("Tweets");
        console.log(tweets);

        await elizaService.messageManager.handleDisasterValidation({
          earthquakes,
          disasters,
          tweets: tweets.tweets,
          latestDisasters,
        });

        // TODO: Send Tx

        // TODO: Send tweet

        // await scraper.sendTweet(text);

        // TODO: Save to Supabase

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
          location: {
            lat: quake.geometry.coordinates[1],
            lng: quake.geometry.coordinates[0],
          },
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
