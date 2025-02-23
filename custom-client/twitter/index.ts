import { ClientBase } from "./base.ts";
import { type TwitterConfig } from "./environment.ts";
import { TwitterInteractionClient } from "./interactions.ts";
import { TwitterPostClient } from "./post.ts";
import { TwitterSearchClient } from "./search.ts";
import { TwitterSpaceClient } from "./spaces.ts";
import { SupabaseService } from "../services/supabase.service.ts";
import { CacheService } from "../services/cache.service.ts";
import { Character, Client } from "../type.ts";
import { read, readFileSync } from "fs";
import { stringToUuid } from "../utils.ts";
import { resolve } from "path";
/**
 * A manager that orchestrates all specialized Twitter logic:
 * - client: base operations (login, timeline caching, etc.)
 * - post: autonomous posting logic
 * - search: searching tweets / replying logic
 * - interaction: handling mentions, replies
 * - space: launching and managing Twitter Spaces (optional)
 */
class TwitterManager {
  client: ClientBase;
  post: TwitterPostClient;
  search: TwitterSearchClient;
  interaction: TwitterInteractionClient;
  supabase: SupabaseService;
  cache: CacheService;
  space?: TwitterSpaceClient;

  constructor(
    character: Character,
    twitterConfig: TwitterConfig,
    supabaseService: SupabaseService,
    cacheService: CacheService
  ) {
    this.supabase = supabaseService;
    this.cache = cacheService;

    // Pass twitterConfig to the base client
    this.client = new ClientBase(
      character,
      twitterConfig,
      supabaseService,
      cacheService
    );

    // Posting logic
    this.post = new TwitterPostClient(this.client);

    // Optional search logic (enabled if TWITTER_SEARCH_ENABLE is true)
    if (twitterConfig.TWITTER_SEARCH_ENABLE) {
      console.warn("Twitter/X client running in a mode that:");
      console.warn("1. violates consent of random users");
      console.warn("2. burns your rate limit");
      console.warn("3. can get your account banned");
      console.warn("use at your own risk");
      this.search = new TwitterSearchClient(
        this.client,
        this.supabase,
        this.cache
      );
    }

    // Mentions and interactions
    this.interaction = new TwitterInteractionClient(
      this.client,
      supabaseService,
      cacheService
    );

    // Optional Spaces logic (enabled if TWITTER_SPACES_ENABLE is true)
    if (twitterConfig.TWITTER_SPACES_ENABLE) {
      this.space = new TwitterSpaceClient(
        this.client,
        supabaseService,
        cacheService
      );
    }
  }
}

export const TwitterClientInterface: Client = {
  async start(twitterConfig: any) {
    const cacheService = CacheService.getInstance();
    const supabaseService = new SupabaseService(
      process.env.SUPABASE_URL || "",
      process.env.SUPABASE_KEY || ""
    );

    console.log("Twitter client started");
    const filePath = resolve(__dirname, "../characters/nami.character.json");
    const character = JSON.parse(readFileSync(filePath, "utf-8"));

    const manager = new TwitterManager(
      character,
      twitterConfig,
      supabaseService,
      cacheService
    );

    // Initialize login/session
    await manager.client.init();

    // Start the posting loop
    await manager.post.start();

    // Start the search logic if it exists
    if (manager.search) {
      await manager.search.start();
    }

    // Start interactions (mentions, replies)
    await manager.interaction.start();

    // If Spaces are enabled, start the periodic check
    if (manager.space) {
      manager.space.startPeriodicSpaceCheck();
    }

    return manager;
  },

  async stop() {
    console.warn("Twitter client does not support stopping yet");
  },
};

export default TwitterClientInterface;
