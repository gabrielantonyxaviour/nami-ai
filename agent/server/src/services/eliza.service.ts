import { BaseService } from "./base.service.js";
import {
  AgentRuntime,
  Character,
  defaultCharacter,
  ModelProviderName,
  elizaLogger,
} from "@ai16z/eliza";

elizaLogger.closeByNewLine = false;
elizaLogger.verbose = true;

// import { SqliteDatabaseAdapter } from "@ai16z/adapter-sqlite";
// import { SupabaseDatabaseAdapter } from "@elizaos/adapter-supabase"
import path from "path";
import { readFileSync, existsSync } from "fs";
import { resolve } from "path";

const __dirname = path.dirname(new URL(import.meta.url).pathname);
import { composeContext } from "@ai16z/eliza";
import {
  Content,
  IAgentRuntime,
  Memory,
  State,
  UUID,
  CacheManager,
  MemoryCacheAdapter,
} from "@ai16z/eliza";
import { stringToUuid } from "@ai16z/eliza";
import OpenAI from "openai";
import { messageCompletionFooter } from "@ai16z/eliza";
import { SqliteDatabaseAdapter } from "@ai16z/adapter-sqlite";
import Database from "better-sqlite3";
import { ExecutedTrade, TradePlay } from "../types.js";

interface ValidationResponse {
  response?: string;
  title?: string;
  location?: string;
  description?: string;
  source_url?: string;
  funds_needed?: string;
  type?: string;
}

const handleDisasterValidationFooter =
  '```json\n{ "title": "string", "location": "string", "description": "string", "source_url": "string", "funds_needed": "number", "type": "string" }\n```';

const messageHandlerTemplate =
  `About {{agentName}}:
{{bio}}
{{lore}}

{{characterMessageExamples}}

{{recentMessages}}

# Task: Generate a reply in the style and perspective of {{agentName}} (@{{twitterUserName}}) while using the trade context with the provided information.:

{{tradeContext}}

{{formattedPlay}}
{{formattedTrade}}


` + messageCompletionFooter;

const handleDisasterValidationTemplate =
  `Here is a list of collected information about recent disasters and earthquakes around the world:

  "Earthquakes information from USGS API: {{earthquakes}}"
{{earthquakes}}

  "Disasters information from ReliefWeb API: {{disasters}}"
{{disasters}}

  "Tweets information from Twitter API: {{tweets}}"
{{tweets}}

  "Latest Disasters that are already posted. SHOULD NOT BE included again"
{{postedDisasters}}

Your job is to find ONLY ONE most serious disaster (if present) and return its data as a response along with an estimated funds needed to recover from the disaster. 
Estimate anywhere around 1000 to 100000. Foor small unserious disasters, the amount needed should be really low. It should be high only for very serious disasters. 
based on the severity of the disaster. Earthquakes that have more 5.5 magnitude have some effect but not as much as a disaster. Floods, wildfires, and other natural disasters are serious too. 
Twitter data can sometimes be out of context and give posts unrelated to disasters.


If there are NO serious disasters, Your response should be formatted in a JSON block like this:
\`\`\`json\n{ "response": "No disasters found" }\`\`\`\n

OR 

If there is the ONE MOST serious disaster found, your response should be formatted in a JSON block like this:

  ` + handleDisasterValidationFooter;

type Context = {
  conversationId?: UUID;
  play?: TradePlay;
  trade?: ExecutedTrade;
  message: { id: string; text: string; replyToMessageId?: UUID };
};

export class MessageManager {
  private runtime: IAgentRuntime;
  private openai: OpenAI;

  constructor(runtime: IAgentRuntime) {
    this.runtime = runtime;
    this.openai = new OpenAI({
      apiKey: process.env.HEURIST_API_KEY || "",
      baseURL: "https://llm-gateway.heurist.xyz/v1",
    });
  }

  // Generate a response using AI
  private async _generateResponse(
    message: Memory,
    _state: State,
    context: string
  ): Promise<Content | null> {
    const { userId, roomId } = message;
    elizaLogger.debug("[_generateResponse] check1");
    elizaLogger.debug("Initializing HeuristAI model.");

    const completion = await this.openai.chat.completions.create({
      messages: [
        {
          role: "system",
          content: context,
        },
      ],
      model: "deepseek/deepseek-r1-distill-llama-70b",
    });

    elizaLogger.debug("COMPLETION  RESPONES");
    elizaLogger.debug("Received response from HeuristAI model.");

    const messageContent = completion.choices[0].message.content;
    if (!messageContent) {
      console.error("❌ No response from generateMessageResponse");
      return null;
    }
    const response = {
      text: messageContent as string,
    };
    elizaLogger.debug("[_generateResponse] check2");

    elizaLogger.debug("[_generateResponse] check3");
    // store the response in the database

    await this.runtime.databaseAdapter.log({
      body: { message, context, response },
      userId: userId,
      roomId,
      type: "response",
    });
    elizaLogger.debug("[_generateResponse] check4");
    return response;
  }

  public async handleGeneration(state: any, promptTemplate: string) {
    const context = composeContext({
      state,
      template: promptTemplate,
    });

    const completion = await this.openai.chat.completions.create({
      messages: [
        {
          role: "system",
          content: context,
        },
      ],
      model: "deepseek/deepseek-r1-distill-llama-70b",
    });

    elizaLogger.debug("COMPLETION  RESPONES");
    elizaLogger.debug("Received response from HeuristAI model.");
    console.log(completion);
    const messageContent = completion.choices[0].message.content;
    if (!messageContent) {
      console.error("❌ No response from generateMessageResponse");
      return { response: "No disasters found" };
    }
    // const response = {
    //   text: messageContent as string,
    // };
    console.log(messageContent);
    const cleanJson = messageContent
      .replace(/^```json\n/, "")
      .replace(/\n```$/, "");
    console.log(cleanJson);
    console.log(JSON.parse(cleanJson));
    elizaLogger.debug("[_generateResponse] check2");

    elizaLogger.debug("[_generateResponse] check3");
    return JSON.parse(cleanJson);
  }

  public async handleDisasterValidation({
    earthquakes,
    disasters,
    tweets,
    postedDisasters,
    searchEngineDisasters,
  }: {
    earthquakes: any[];
    disasters: any[];
    tweets: any[];
    postedDisasters: any[];
    searchEngineDisasters: any[];
  }): Promise<ValidationResponse> {
    const context = composeContext({
      state: {
        earthquakes: earthquakes
          .map(
            (quake: any) =>
              `Title: ${quake.title}
    Magnitude: ${quake.magnitude}
    Location: ${quake.location}
    Timestamp: ${quake.timestamp}
    Type: ${quake.type}
    `
          )
          .join("\n"),

        disasters: disasters
          .map(
            (disaster: any) =>
              `Title: ${disaster.title}
    Description: ${disaster.description}
    Location: ${disaster.location}
    Type: ${disaster.type}
    Timestamp: ${disaster.timestamp}
    Status: ${disaster.status}
    `
          )
          .join("\n"),

        tweets: tweets
          .map(
            (tweet: any) =>
              `Tweet: ${tweet.text}
    Timestamp: ${tweet.timestamp}
    User: ${tweet.user}
    `
          )
          .join("\n"),

        postedDisasters:
          postedDisasters.length == 0
            ? "No disasters posted yet."
            : postedDisasters
                .map(
                  (disaster: any) =>
                    `Title: ${disaster.title}
    Description: ${disaster.description}
    Location: ${disaster.location}
    Type: ${disaster.type}
    Timestamp: ${disaster.timestamp}
    Status: ${disaster.status}
    `
                )
                .join("\n"),
      } as any,
      template: handleDisasterValidationTemplate,
    });

    console.log(context);

    const completion = await this.openai.chat.completions.create({
      messages: [
        {
          role: "system",
          content: context,
        },
      ],
      model: "deepseek/deepseek-r1-distill-llama-70b",
    });

    elizaLogger.debug("COMPLETION  RESPONES");
    elizaLogger.debug("Received response from HeuristAI model.");
    console.log(completion);
    const messageContent = completion.choices[0].message.content;
    if (!messageContent) {
      console.error("❌ No response from generateMessageResponse");
      return { response: "No disasters found" };
    }
    // const response = {
    //   text: messageContent as string,
    // };
    console.log(messageContent);
    const cleanJson = messageContent
      .replace(/^```json\n/, "")
      .replace(/\n```$/, "");
    console.log(cleanJson);
    console.log(JSON.parse(cleanJson));
    elizaLogger.debug("[_generateResponse] check2");

    elizaLogger.debug("[_generateResponse] check3");
    return JSON.parse(cleanJson);
    // store the response in the database

    // await this.runtime.databaseAdapter.log({
    //   body: { message, context, response },
    //   userId,
    //   roomId,
    //   type: "response",
    // });
  }

  public async handleNGOValidation() {}

  // Main handler for incoming messages
  public async handleMessage(ctx: Context): Promise<
    | {
        converstationId: UUID;
        response: string;
      }
    | undefined
  > {
    const message = ctx.message;
    let conversationId: UUID;
    if (ctx.conversationId) conversationId = ctx.conversationId;
    else
      conversationId = stringToUuid(
        (Math.floor(Math.random() * 100000000000000) + 1).toString()
      );

    try {
      // Convert IDs to UUIDs
      const userId = stringToUuid(process.env.TELEGRAM_USERNAME || "") as UUID;
      const userName = process.env.TELEGRAM_USERNAME || "";
      const chatId = conversationId;
      const agentId = this.runtime.agentId;
      const roomId = chatId;

      await this.runtime.ensureConnection(
        userId,
        roomId,
        userName,
        userName,
        "direct"
      );

      const messageId = stringToUuid(message.id) as UUID;

      const content: Content = {
        text: message.text,
        source: "direct",
        inReplyTo: message.replyToMessageId
          ? message.replyToMessageId
          : undefined,
      };
      const createdAt = new Date().getTime();
      const memory = {
        id: messageId,
        agentId,
        userId,
        roomId,
        content,
        createdAt: createdAt * 1000,
      };
      await this.runtime.messageManager.createMemory(memory, true);

      let state = await this.runtime.composeState(memory, {
        formattedPlay: ctx.play
          ? "Speculated Trade Play Details: \n" +
            JSON.stringify(ctx.play, null, 2)
          : "Speculated Trade Play Details: \n",
        formattedTrade: ctx.trade
          ? "Executed Trade Details: \n" + JSON.stringify(ctx.trade, null, 2)
          : "Executed Trade Details: \n",
      });
      state = await this.runtime.updateRecentMessageState(state);

      const context = composeContext({
        state,
        template: messageHandlerTemplate,
      });
      elizaLogger.debug(
        "[handleMessage] context",
        JSON.stringify(context, null, 2)
      );
      const responseContent = await this._generateResponse(
        memory,
        state,
        context
      );

      if (!responseContent || !responseContent.text) return;

      await this.runtime.messageManager.createMemory({
        id: stringToUuid(messageId),
        agentId,
        userId,
        roomId,
        content: {
          ...content,
          text: content.text,
          inReplyTo: stringToUuid(message.id),
        },
        createdAt: createdAt * 1000,
      });
      state = await this.runtime.updateRecentMessageState(state);
      return { converstationId: roomId, response: responseContent.text };
    } catch (error) {
      console.error("❌ Error handling message:", error);
      console.error("Error sending message:", error);
      return undefined;
    }
  }
}

export class ElizaService extends BaseService {
  private static instance: ElizaService;
  private runtime: AgentRuntime;
  public messageManager: MessageManager;

  private constructor() {
    super();
    let character: Character;
    try {
      const fullPath = resolve(__dirname, "../../..", "character.json");
      elizaLogger.info(`Loading character from: ${fullPath}`);

      if (!existsSync(fullPath)) {
        throw new Error(`Character file not found at ${fullPath}`);
      }

      const fileContent = readFileSync(fullPath, "utf-8");
      character = JSON.parse(fileContent);
      elizaLogger.info("Successfully loaded custom character:", character.name);
    } catch (error) {
      console.error(`Failed to load character from character.json: `, error);
      elizaLogger.info("Falling back to default character");
      character = defaultCharacter;
    }

    const sqlitePath = path.join(__dirname, "..", "..", "..", "eliza.sqlite");
    elizaLogger.info("Using SQLite database at:", sqlitePath);
    const db = new SqliteDatabaseAdapter(new Database(sqlitePath));
    db.init()
      .then(() => {
        elizaLogger.info("Database initialized.");
      })
      .catch((error) => {
        console.error("Failed to initialize database:", error);
        throw error;
      });

    try {
      this.runtime = new AgentRuntime({
        databaseAdapter: db,
        token: process.env.HEURIST_API_KEY || "",
        modelProvider: character.modelProvider || ModelProviderName.HEURIST,
        character,
        conversationLength: 4096,
        plugins: [],
        cacheManager: new CacheManager(new MemoryCacheAdapter()),
        logging: true,
      });

      this.messageManager = new MessageManager(this.runtime);
    } catch (error) {
      console.error("Failed to initialize Eliza runtime:", error);
      throw error;
    }
  }

  public static getInstance(): ElizaService {
    if (!ElizaService.instance) {
      ElizaService.instance = new ElizaService();
    }
    return ElizaService.instance;
  }

  public async start(): Promise<void> {
    try {
      elizaLogger.info("Eliza service started successfully");
    } catch (error) {
      console.error("Failed to start Eliza service:", error);
      throw error;
    }
  }

  public getRuntime(): AgentRuntime {
    return this.runtime;
  }

  public async stop(): Promise<void> {
    try {
      elizaLogger.info("Eliza service stopped");
    } catch (error) {
      console.error("Error stopping Eliza service:", error);
    }
  }
}
