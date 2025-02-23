import dotenv from "dotenv";
import { CacheService } from "./services/cache.service";
import { SupabaseService } from "./services/supabase.service";
import TwitterClientInterface from "./twitter";

dotenv.config();

async function main() {
  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_KEY = process.env.SUPABASE_KEY;

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    throw new Error("Missing SUPABASE_URL or SUPABASE_KEY");
  }

  const cacheService = CacheService.getInstance();
  const supabaseService = new SupabaseService(SUPABASE_URL, SUPABASE_KEY);

  const twitterConfig = {
    dryRun: process.env.DRY_RUN === "true",
    username: process.env.TWITTER_USERNAME,
    password: process.env.TWITTER_PASSWORD,
    email: process.env.TWITTER_EMAIL,
    maxTweetLength: 280,
  };

  const twitterClient = await TwitterClientInterface.start(
    twitterConfig,
    supabaseService,
    cacheService
  );
}
