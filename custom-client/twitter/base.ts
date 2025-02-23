import {
  type QueryTweetsResponse,
  Scraper,
  SearchMode,
  type Tweet,
} from "agent-twitter-client";
import { EventEmitter } from "events";
import { Character, Content, Memory, State, UUID } from "../type.ts";
import { stringToUuid } from "../utils.ts";
import { SupabaseService } from "../services/supabase.service.ts";
import { CacheService } from "../services/cache.service.ts";
import { v4 as uuidv4 } from "uuid";

export function extractAnswer(text: string): string {
  const startIndex = text.indexOf("Answer: ") + 8;
  const endIndex = text.indexOf("<|endoftext|>", 11);
  return text.slice(startIndex, endIndex);
}

type TwitterProfile = {
  id: string;
  username: string;
  screenName: string;
  bio: string;
  nicknames: string[];
};

class RequestQueue {
  private queue: (() => Promise<any>)[] = [];
  private processing = false;

  async add<T>(request: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push(async () => {
        try {
          const result = await request();
          resolve(result);
        } catch (error) {
          reject(error);
        }
      });
      this.processQueue();
    });
  }

  private async processQueue(): Promise<void> {
    if (this.processing || this.queue.length === 0) {
      return;
    }
    this.processing = true;

    while (this.queue.length > 0) {
      const request = this.queue.shift()!;
      try {
        await request();
      } catch (error) {
        console.error("Error processing request:", error);
        this.queue.unshift(request);
        await this.exponentialBackoff(this.queue.length);
      }
      await this.randomDelay();
    }

    this.processing = false;
  }

  private async exponentialBackoff(retryCount: number): Promise<void> {
    const delay = Math.pow(2, retryCount) * 1000;
    await new Promise((resolve) => setTimeout(resolve, delay));
  }

  private async randomDelay(): Promise<void> {
    const delay = Math.floor(Math.random() * 2000) + 1500;
    await new Promise((resolve) => setTimeout(resolve, delay));
  }
}

export class ClientBase extends EventEmitter {
  static _twitterClients: { [accountIdentifier: string]: Scraper } = {};
  twitterClient: Scraper;
  twitterConfig: any;
  character: Character;
  directions: string;
  agentId: UUID;
  lastCheckedTweetId: bigint | null = null;
  temperature = 0.5;
  supabaseService: SupabaseService;
  cacheService: CacheService;

  requestQueue: RequestQueue = new RequestQueue();

  profile: TwitterProfile | null;

  async cacheTweet(tweet: Tweet): Promise<void> {
    if (!tweet) {
      console.warn("Tweet is undefined, skipping cache");
      return;
    }

    this.cacheService.set(`twitter/tweets/${tweet.id}`, tweet);
  }

  async getCachedTweet(tweetId: string): Promise<Tweet | undefined> {
    const cached = await this.cacheService.get<Tweet>(
      `twitter/tweets/${tweetId}`
    );

    return cached;
  }

  async getTweet(tweetId: string): Promise<Tweet | undefined> {
    const cachedTweet = await this.getCachedTweet(tweetId);

    if (cachedTweet) {
      return cachedTweet;
    }

    const tweet = await this.twitterClient.getTweet(tweetId);
    if (tweet) {
      this.cacheTweet(tweet);
      return tweet!;
    } else {
      return undefined;
    }
  }

  // TODO: Something wrong with call back
  // callback: (self: ClientBase) => any = null;

  onReady() {
    throw new Error("Not implemented in base class, please call from subclass");
  }

  /**
   * Parse the raw tweet data into a standardized Tweet object.
   */
  private parseTweet(raw: any, depth = 0, maxDepth = 3): Tweet {
    // If we've reached maxDepth, don't parse nested quotes/retweets further
    const canRecurse = depth < maxDepth;
    const quotedStatus =
      raw.quoted_status_result?.result && canRecurse
        ? this.parseTweet(raw.quoted_status_result.result, depth + 1, maxDepth)
        : undefined;

    const retweetedStatus =
      raw.retweeted_status_result?.result && canRecurse
        ? this.parseTweet(
            raw.retweeted_status_result.result,
            depth + 1,
            maxDepth
          )
        : undefined;

    const t: Tweet = {
      bookmarkCount:
        raw.bookmarkCount ?? raw.legacy?.bookmark_count ?? undefined,
      conversationId: raw.conversationId ?? raw.legacy?.conversation_id_str,
      hashtags: raw.hashtags ?? raw.legacy?.entities?.hashtags ?? [],
      html: raw.html,
      id: raw.id ?? raw.rest_id ?? raw.id_str ?? undefined,
      inReplyToStatus: raw.inReplyToStatus,
      inReplyToStatusId:
        raw.inReplyToStatusId ??
        raw.legacy?.in_reply_to_status_id_str ??
        undefined,
      isQuoted: raw.legacy?.is_quote_status === true,
      isPin: raw.isPin,
      isReply: raw.isReply,
      isRetweet: raw.legacy?.retweeted === true,
      isSelfThread: raw.isSelfThread,
      likes: raw.legacy?.favorite_count ?? 0,
      name:
        raw.name ??
        raw?.user_results?.result?.legacy?.name ??
        raw.core?.user_results?.result?.legacy?.name,
      mentions: raw.mentions ?? raw.legacy?.entities?.user_mentions ?? [],
      permanentUrl:
        raw.permanentUrl ??
        (raw.core?.user_results?.result?.legacy?.screen_name && raw.rest_id
          ? `https://x.com/${raw.core?.user_results?.result?.legacy?.screen_name}/status/${raw.rest_id}`
          : undefined),
      photos:
        raw.photos ??
        (raw.legacy?.entities?.media
          ?.filter((media: any) => media.type === "photo")
          .map((media: any) => ({
            id: media.id_str,
            url: media.media_url_https,
            alt_text: media.alt_text,
          })) ||
          []),
      place: raw.place,
      poll: raw.poll ?? null,
      quotedStatus,
      quotedStatusId:
        raw.quotedStatusId ?? raw.legacy?.quoted_status_id_str ?? undefined,
      replies: raw.legacy?.reply_count ?? 0,
      retweets: raw.legacy?.retweet_count ?? 0,
      retweetedStatus,
      retweetedStatusId: raw.legacy?.retweeted_status_id_str ?? undefined,
      text: raw.text ?? raw.legacy?.full_text ?? undefined,
      thread: raw.thread || [],
      timeParsed: raw.timeParsed
        ? new Date(raw.timeParsed)
        : raw.legacy?.created_at
        ? new Date(raw.legacy?.created_at)
        : undefined,
      timestamp:
        raw.timestamp ??
        (raw.legacy?.created_at
          ? new Date(raw.legacy.created_at).getTime() / 1000
          : undefined),
      urls: raw.urls ?? raw.legacy?.entities?.urls ?? [],
      userId: raw.userId ?? raw.legacy?.user_id_str ?? undefined,
      username:
        raw.username ??
        raw.core?.user_results?.result?.legacy?.screen_name ??
        undefined,
      videos:
        raw.videos ??
        raw.legacy?.entities?.media?.filter(
          (media: any) => media.type === "video"
        ) ??
        [],
      views: raw.views?.count ? Number(raw.views.count) : 0,
      sensitiveContent: raw.sensitiveContent,
    };

    return t;
  }

  constructor(
    character: Character,
    twitterConfig: any,
    supabaseService: SupabaseService,
    cacheService: CacheService
  ) {
    super();
    this.agentId = character.id ?? stringToUuid(character.name ?? uuidv4());
    this.character = character;
    this.supabaseService = supabaseService;
    this.cacheService = cacheService;
    this.twitterConfig = twitterConfig;
    const username = twitterConfig.TWITTER_USERNAME;
    if (ClientBase._twitterClients[username]) {
      this.twitterClient = ClientBase._twitterClients[username];
    } else {
      this.twitterClient = new Scraper();
      ClientBase._twitterClients[username] = this.twitterClient;
    }
  }

  async init() {
    const username = this.twitterConfig.TWITTER_USERNAME;
    const password = this.twitterConfig.TWITTER_PASSWORD;
    const email = this.twitterConfig.TWITTER_EMAIL;
    let retries = this.twitterConfig.TWITTER_RETRY_LIMIT;
    const twitter2faSecret = this.twitterConfig.TWITTER_2FA_SECRET;

    if (!username) {
      throw new Error("Twitter username not configured");
    }

    const authToken = process.env.TWITTER_COOKIES_AUTH_TOKEN || "";
    const ct0 = process.env.TWITTER_COOKIES_CT0 || "";
    const guestId = process.env.TWITTER_COOKIES_GUEST_ID || "";

    const createTwitterCookies = (
      authToken: string,
      ct0: string,
      guestId: string
    ) =>
      authToken && ct0 && guestId
        ? [
            { key: "auth_token", value: authToken, domain: ".twitter.com" },
            { key: "ct0", value: ct0, domain: ".twitter.com" },
            { key: "guest_id", value: guestId, domain: ".twitter.com" },
          ]
        : null;

    const cachedCookies =
      (await this.getCachedCookies(username)) ||
      createTwitterCookies(authToken, ct0, guestId);

    if (cachedCookies) {
      console.info("Using cached cookies");
      await this.setCookiesFromArray(cachedCookies);
    }

    console.log("Waiting for Twitter login");
    while (retries > 0) {
      try {
        if (await this.twitterClient.isLoggedIn()) {
          // cookies are valid, no login required
          console.info("Successfully logged in.");
          break;
        } else {
          await this.twitterClient.login(
            username,
            password,
            email,
            twitter2faSecret
          );
          if (await this.twitterClient.isLoggedIn()) {
            // fresh login, store new cookies
            console.info("Successfully logged in.");
            console.info("Caching cookies");
            await this.cacheCookies(
              username,
              await this.twitterClient.getCookies()
            );
            break;
          }
        }
      } catch (error) {
        console.error(`Login attempt failed: ${error.message}`);
      }

      retries--;
      console.error(
        `Failed to login to Twitter. Retrying... (${retries} attempts left)`
      );

      if (retries === 0) {
        console.error("Max retries reached. Exiting login process.");
        throw new Error("Twitter login failed after maximum retries.");
      }

      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
    // Initialize Twitter profile
    this.profile = await this.fetchProfile(username);

    if (this.profile) {
      console.log("Twitter user ID:", this.profile.id);
      console.log("Twitter loaded:", JSON.stringify(this.profile, null, 10));
      // Store profile info for use in responses
      this.character.twitterProfile = {
        id: this.profile.id,
        username: this.profile.username,
        screenName: this.profile.screenName,
        bio: this.profile.bio,
        nicknames: this.profile.nicknames,
      };
    } else {
      throw new Error("Failed to load profile");
    }

    await this.loadLatestCheckedTweetId();
    await this.populateTimeline();
  }

  async fetchOwnPosts(count: number): Promise<Tweet[]> {
    console.debug("fetching own posts");
    if (this.profile) {
      const ownPosts = await this.twitterClient.getUserTweets(
        this.profile.id,
        count
      );
      return ownPosts.tweets.map((t) => this.parseTweet(t));
    }
    return [];
  }

  /**
   * Fetch timeline for twitter account, optionally only from followed accounts
   */
  async fetchHomeTimeline(
    count: number,
    following?: boolean
  ): Promise<Tweet[]> {
    console.debug("fetching home timeline");
    const homeTimeline = following
      ? await this.twitterClient.fetchFollowingTimeline(count, [])
      : await this.twitterClient.fetchHomeTimeline(count, []);

    console.debug(homeTimeline, { depth: Number.POSITIVE_INFINITY });
    const processedTimeline = homeTimeline
      .filter((t) => t.__typename !== "TweetWithVisibilityResults") // what's this about?
      .map((tweet) => this.parseTweet(tweet));

    //console.debug("process homeTimeline", processedTimeline);
    return processedTimeline;
  }

  async fetchTimelineForActions(count: number): Promise<Tweet[]> {
    console.debug("fetching timeline for actions");

    const agentUsername = this.twitterConfig.TWITTER_USERNAME;

    const homeTimeline = await this.twitterClient.fetchHomeTimeline(count, []);

    const followingTimeline = await this.twitterClient.fetchFollowingTimeline(
      count,
      []
    );

    // Parse, filter out self-tweets, limit to count
    return homeTimeline
      .map((tweet) => this.parseTweet(tweet))
      .filter((tweet) => tweet.username !== agentUsername) // do not perform action on self-tweets
      .slice(0, count);
    // TODO: Once the 'count' parameter is fixed in the 'fetchTimeline' method of the 'agent-twitter-client',
    // this workaround can be removed.
    // Related issue: https://github.com/elizaos/agent-twitter-client/issues/43
  }

  async fetchSearchTweets(
    query: string,
    maxTweets: number,
    searchMode: SearchMode,
    cursor?: string
  ): Promise<QueryTweetsResponse> {
    try {
      // Sometimes this fails because we are rate limited. in this case, we just need to return an empty array
      // if we dont get a response in 5 seconds, something is wrong
      const timeoutPromise = new Promise((resolve) =>
        setTimeout(() => resolve({ tweets: [] }), 15000)
      );

      try {
        const result = await this.requestQueue.add(
          async () =>
            await Promise.race([
              this.twitterClient.fetchSearchTweets(
                query,
                maxTweets,
                searchMode,
                cursor
              ),
              timeoutPromise,
            ])
        );
        return (result ?? { tweets: [] }) as QueryTweetsResponse;
      } catch (error) {
        console.error("Error fetching search tweets:", error);
        return { tweets: [] };
      }
    } catch (error) {
      console.error("Error fetching search tweets:", error);
      return { tweets: [] };
    }
  }

  async ensureUserExists(
    userId: UUID,
    userName: string | null,
    name: string | null,
    email?: string | null,
    source?: string | null
  ) {
    const account = await this.supabaseService.getAccountById(userId);
    if (!account) {
      await this.supabaseService.createAccount({
        id: userId,
        name: name || this.character.name || "Unknown User",
        username: userName || this.character.username || "Unknown",
        email: email || this.character.email || userId, // Temporary
        details: this.character || { summary: "" },
      });
      console.log(`User ${userName} created successfully.`);
    }
  }

  async ensureRoomExists(roomId: UUID) {
    const room = await this.supabaseService.getRoom(roomId);
    if (!room) {
      await this.supabaseService.createRoom(roomId);
      console.log(`Room ${roomId} created successfully.`);
    }
  }
  async ensureConnection(
    userId: UUID,
    roomId: UUID,
    userName?: string,
    userScreenName?: string,
    source?: string
  ) {
    await Promise.all([
      this.ensureUserExists(
        this.agentId,
        this.character.username ?? "Agent",
        this.character.name ?? "Agent",
        source
      ),
      this.ensureUserExists(
        userId,
        userName ?? "User" + userId,
        userScreenName ?? "User" + userId,
        source
      ),
      this.ensureRoomExists(roomId),
    ]);

    await Promise.all([
      this.ensureParticipantInRoom(userId, roomId),
      this.ensureParticipantInRoom(this.agentId, roomId),
    ]);
  }

  async ensureParticipantInRoom(userId: UUID, roomId: UUID) {
    const participants = await this.supabaseService.getParticipantsForRoom(
      roomId
    );
    if (!participants.includes(userId)) {
      await this.supabaseService.addParticipant(userId, roomId);
      if (userId === this.agentId) {
        console.log(
          `Agent ${this.character.name} linked to room ${roomId} successfully.`
        );
      } else {
        console.log(`User ${userId} linked to room ${roomId} successfully.`);
      }
    }
  }

  private async populateTimeline() {
    console.debug("populating timeline...");

    const cachedTimeline = await this.getCachedTimeline();

    // Check if the cache file exists
    if (cachedTimeline) {
      // Read the cached search results from the file

      // Get the existing memories from the database
      // TODO: get from supabase
      const existingMemories = await this.supabaseService.getMemoriesByRoomIds({
        tableName: "messages",
        roomIds: cachedTimeline.map((tweet) =>
          stringToUuid(tweet.conversationId + "-" + this.agentId)
        ),
      });

      //TODO: load tweets not in cache?

      // Create a Set to store the IDs of existing memories
      const existingMemoryIds = new Set(
        existingMemories.map((memory) => memory.id?.toString())
      );

      // Check if any of the cached tweets exist in the existing memories
      const someCachedTweetsExist = cachedTimeline.some((tweet) =>
        existingMemoryIds.has(tweet.id + "-" + this.agentId)
      );

      if (someCachedTweetsExist) {
        // Filter out the cached tweets that already exist in the database
        const tweetsToSave = cachedTimeline.filter(
          (tweet) =>
            !existingMemoryIds.has(stringToUuid(tweet.id + "-" + this.agentId))
        );

        console.log({
          processingTweets: tweetsToSave.map((tweet) => tweet.id).join(","),
        });

        // Save the missing tweets as memories
        for (const tweet of tweetsToSave) {
          console.log("Saving Tweet", tweet.id);

          const roomId = stringToUuid(
            tweet.conversationId + "-" + this.agentId
          );

          const userId =
            tweet.userId === this.profile?.id
              ? this.agentId
              : stringToUuid(tweet.userId!);

          if (tweet.userId === this.profile?.id) {
            // TODO: Supabase check
            await this.ensureConnection(
              this.agentId,
              roomId,
              this.profile?.username,
              this.profile?.screenName,
              "twitter"
            );
          } else {
            // TODO: Supabase check
            await this.ensureConnection(
              userId,
              roomId,
              tweet.username,
              tweet.name,
              "twitter"
            );
          }

          const content = {
            text: tweet.text,
            url: tweet.permanentUrl,
            source: "twitter",
            inReplyTo: tweet.inReplyToStatusId
              ? stringToUuid(tweet.inReplyToStatusId + "-" + this.agentId)
              : undefined,
          } as Content;

          console.log("Creating memory for tweet", tweet.id);

          // check if it already exists
          const memory = await this.supabaseService.getMemoryById(
            stringToUuid(tweet.id + "-" + this.agentId)
          );

          if (memory) {
            console.log("Memory already exists, skipping timeline population");
            break;
          }

          await this.supabaseService.createMemory(
            {
              id: stringToUuid(tweet.id + "-" + this.agentId),
              userId,
              content: content,
              agentId: this.agentId,
              roomId,
              createdAt: (tweet.timestamp || 0) * 1000,
            },
            "messages"
          );

          await this.cacheTweet(tweet);
        }

        console.log(
          `Populated ${tweetsToSave.length} missing tweets from the cache.`
        );
        return;
      }
    }

    const timeline = await this.fetchHomeTimeline(cachedTimeline ? 10 : 50);
    const username = this.twitterConfig.TWITTER_USERNAME;

    // Get the most recent 20 mentions and interactions
    const mentionsAndInteractions = await this.fetchSearchTweets(
      `@${username}`,
      20,
      SearchMode.Latest
    );

    // Combine the timeline tweets and mentions/interactions
    const allTweets = [...timeline, ...mentionsAndInteractions.tweets];

    // Create a Set to store unique tweet IDs
    const tweetIdsToCheck = new Set<string>();
    const roomIds = new Set<UUID>();

    // Add tweet IDs to the Set
    for (const tweet of allTweets) {
      tweetIdsToCheck.add(tweet.id!);
      roomIds.add(stringToUuid(tweet.conversationId + "-" + this.agentId));
    }

    // Check the existing memories in the database
    const existingMemories = await this.supabaseService.getMemoriesByRoomIds({
      tableName: "messages",
      roomIds: Array.from(roomIds),
    });

    // Create a Set to store the existing memory IDs
    const existingMemoryIds = new Set<UUID>(
      existingMemories.map((memory) => memory.id!)
    );

    // Filter out the tweets that already exist in the database
    const tweetsToSave = allTweets.filter(
      (tweet) =>
        !existingMemoryIds.has(stringToUuid(tweet.id + "-" + this.agentId))
    );

    console.debug({
      processingTweets: tweetsToSave.map((tweet) => tweet.id).join(","),
    });

    await this.ensureUserExists(
      this.agentId,
      this.profile!.username,
      this.character.name,
      "twitter"
    );

    // Save the new tweets as memories
    for (const tweet of tweetsToSave) {
      console.log("Saving Tweet", tweet.id);

      const roomId = stringToUuid(tweet.conversationId + "-" + this.agentId);
      const userId =
        tweet.userId === this.profile!.id
          ? this.agentId
          : stringToUuid(tweet.userId!);

      if (tweet.userId === this.profile!.id) {
        await this.ensureConnection(
          this.agentId,
          roomId,
          this.profile?.username,
          this.profile?.screenName,
          "twitter"
        );
      } else {
        await this.ensureConnection(
          userId,
          roomId,
          tweet.username,
          tweet.name,
          "twitter"
        );
      }

      const content = {
        text: tweet.text,
        url: tweet.permanentUrl,
        source: "twitter",
        inReplyTo: tweet.inReplyToStatusId
          ? stringToUuid(tweet.inReplyToStatusId)
          : undefined,
      } as Content;

      await this.supabaseService.createMemory(
        {
          id: stringToUuid(tweet.id + "-" + this.agentId),
          userId,
          content: content,
          agentId: this.agentId,
          roomId,
          createdAt: (tweet.timestamp || 0) * 1000,
        },
        "messages"
      );

      await this.cacheTweet(tweet);
    }

    // Cache
    await this.cacheTimeline(timeline);
    await this.cacheMentions(mentionsAndInteractions.tweets);
  }

  async setCookiesFromArray(cookiesArray: any[]) {
    const cookieStrings = cookiesArray.map(
      (cookie) =>
        `${cookie.key}=${cookie.value}; Domain=${cookie.domain}; Path=${
          cookie.path
        }; ${cookie.secure ? "Secure" : ""}; ${
          cookie.httpOnly ? "HttpOnly" : ""
        }; SameSite=${cookie.sameSite || "Lax"}`
    );
    await this.twitterClient.setCookies(cookieStrings);
  }

  async saveRequestMessage(message: Memory, state: State) {
    if (message.content.text) {
      const recentMessage = await this.supabaseService.getMemories({
        tableName: "messages",
        roomId: message.roomId,
        count: 1,
        unique: false,
      });

      if (
        recentMessage.length > 0 &&
        recentMessage[0].content === message.content
      ) {
        console.debug("Message already saved", recentMessage[0].id);
      } else {
        await this.supabaseService.createMemory(
          {
            ...message,
          },
          "messages"
        );
      }
    }
  }

  async loadLatestCheckedTweetId(): Promise<void> {
    const latestCheckedTweetId = await this.cacheService.get<string>(
      `twitter/${this.profile?.username}/latest_checked_tweet_id`
    );

    if (latestCheckedTweetId) {
      this.lastCheckedTweetId = BigInt(latestCheckedTweetId);
    }
  }

  async cacheLatestCheckedTweetId() {
    if (this.lastCheckedTweetId) {
      this.cacheService.set(
        `twitter/${this.profile?.username}/latest_checked_tweet_id`,
        this.lastCheckedTweetId.toString()
      );
    }
  }

  async getCachedTimeline(): Promise<Tweet[] | undefined> {
    return this.cacheService.get<Tweet[]>(
      `twitter/${this.profile?.username}/timeline`
    );
  }

  async cacheTimeline(timeline: Tweet[]) {
    this.cacheService.set(
      `twitter/${this.profile?.username}/timeline`,
      timeline,
      { expires: Date.now() + 10 * 1000 }
    );
  }

  async cacheMentions(mentions: Tweet[]) {
    this.cacheService.set(
      `twitter/${this.profile?.username}/mentions`,
      mentions,
      { expires: Date.now() + 10 * 1000 }
    );
  }

  async getCachedCookies(username: string) {
    return await this.cacheService.get<any[]>(`twitter/${username}/cookies`);
  }

  async cacheCookies(username: string, cookies: any[]) {
    await this.cacheService.set(`twitter/${username}/cookies`, cookies);
  }

  async fetchProfile(username: string): Promise<TwitterProfile> {
    try {
      const profile = await this.requestQueue.add(async () => {
        const profile = await this.twitterClient.getProfile(username);
        return {
          id: profile.userId!,
          username,
          screenName: profile.name || this.character.name,
          bio:
            profile.biography || typeof this.character.bio === "string"
              ? (this.character.bio as string)
              : this.character.bio.length > 0
              ? this.character.bio[0]
              : "",
          nicknames: this.character.twitterProfile?.nicknames || [],
        } satisfies TwitterProfile;
      });

      return profile;
    } catch (error) {
      console.error("Error fetching Twitter profile:", error);
      throw error;
    }
  }
}
