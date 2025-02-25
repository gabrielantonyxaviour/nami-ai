import { Router, Request, Response } from "express";
import { google } from "googleapis";
import { SupabaseService } from "../services/supabase.service.js";
import { generateNGOActivityQuery } from "../utils/evaluation.js";
import OpenAI from "openai";
import { Account, constants, Contract, RpcProvider } from "starknet";

// const isProd = JSON.parse(process.env.IS_PROD || "false");
const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY || "";

const router = Router();

// TODO: Add a middleware to protect the endpoint with an API key

router.post("/", async (req: Request, res: Response): Promise<void> => {
  try {
    console.log(req.body);
    const { ngoId, disasterId, withdrawAddress } = req.body;
    console.log("NGO ID: ", ngoId);
    console.log("Disaster ID: ", disasterId);

    // Fetch the NGO and Disaster from supabase
    const supabaseService = SupabaseService.getInstance();

    const disaster = await supabaseService.getDisasterById(disasterId);
    const ngo = await supabaseService.getNgoById(ngoId);

    if (!disaster || !ngo) {
      res.status(404).json({ error: "Disaster or NGO not found" });
      return;
    }

    // Search the google search engine
    const startDate = new Date(disaster.created_at).toISOString().split("T")[0];
    const endDate = new Date().toISOString().split("T")[0];

    const customSearch = google.customsearch("v1");
    const openai = new OpenAI({
      apiKey: process.env.HEURIST_API_KEY || "",
      baseURL: "https://llm-gateway.heurist.xyz/v1",
    });

    const searchResults = await customSearch.cse.list({
      auth: GOOGLE_API_KEY as string,
      cx: "905d0f2d2dbee4ce1",
      q: generateNGOActivityQuery(ngo, disaster),
      sort: "date",
      dateRestrict: undefined,
      num: 10,
    });

    const searchResultsItems = searchResults.data.items || [];
    console.log("_search", "Search completed", {
      resultsCount: searchResultsItems.length,
      dateRange: `${startDate} to ${endDate}`,
      firstResult: searchResultsItems[0]
        ? {
            title: searchResultsItems[0].title,
            link: searchResultsItems[0].link,
            snippet: searchResultsItems[0].snippet,
            publishedDate:
              searchResultsItems[0].pagemap?.metatags?.[0]?.[
                "article:published_time"
              ] || "Unknown",
          }
        : null,
    });

    console.log("Search results item");
    console.log(searchResultsItems);

    if (searchResultsItems.length === 0) {
      res.json({
        response:
          "Sorry the funds cannot be sanctioned. I could not find any valid proof of your service.",
      });
      return;
    } else {
      const searchItem = JSON.stringify(searchResultsItems[0], null, 2);
      const aiResponse = await openai.chat.completions.create({
        model: "deepseek/deepseek-r1-distill-llama-70b",
        messages: [
          {
            role: "system",
            content:
              'You hold a lot of donations made by the public. You need to verify the following services done by the NGO towards the cause of the disaster and unlock a percentage of the funds in your vault to this NGO. Percentage output should be between 1 to 100. You should return a response JSON in this format: ```json\n{ "percentage": "number" } ``` ',
          },
          {
            role: "user",
            content: searchItem,
          },
        ],
      });
      const messageContent = aiResponse.choices[0].message.content;
      if (!messageContent) {
        res.json({
          response:
            "Sorry the funds cannot be sanctioned. I could not find any valid proof of your service.",
        });
        return;
      }
      const cleanJson = messageContent
        .replace(/^```json\n/, "")
        .replace(/\n```$/, "");
      console.log(cleanJson);
      const { percentage } = JSON.parse(cleanJson);
      if (percentage) {
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
        const vaultAddress = disaster.vault_address;

        const { abi: vaultAbi } = await provider.getClassAt(vaultAddress);
        console.log("Connecting to Vault contract...");
        const vaultContract = new Contract(vaultAbi, vaultAddress, provider);

        vaultContract.connect(aiAgentAccount);
        // Get the amount stored in the vault

        console.log("Getting the amount stored in the vault...");
        const amountStored = await vaultContract.get_amount();
        console.log("Amount stored in the vault:", amountStored);

        const claimmableAmount =
          (BigInt(amountStored) * BigInt(percentage)) / BigInt(100);
        console.log("Claimable amount:", claimmableAmount);

        // Disperse tehe amount required by the NGO
        console.log("Populating withdraw transaction...");
        const withdrawTx = vaultContract.populate("withdraw", [
          withdrawAddress,
          claimmableAmount,
        ]);

        console.log("Sending withdraw Transaction....");
        const res = await vaultContract.withdraw(withdrawTx.calldata);

        console.log("waiting for tx confirmation...");
        const txResponse = await provider.waitForTransaction(
          res.transaction_hash
        );

        if (txResponse.isSuccess()) {
          console.log("Transaction successful!");
          res.json({
            status: "SUCCESS",
            amount: claimmableAmount.toString(),
          });
          return;
        } else {
          res.json({
            status: "FAILED",
            amount: claimmableAmount.toString(),
          });
          return;
        }
      }
    }
    return;
  } catch (error) {
    console.error("Error processing chat:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
