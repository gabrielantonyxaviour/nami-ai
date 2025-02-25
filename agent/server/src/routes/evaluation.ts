import { Router, Request, Response } from "express";
import { google } from "googleapis";
import { SupabaseService } from "../services/supabase.service.js";
import { generateNGOActivityQuery } from "../utils/evaluation.js";
import OpenAI from "openai";

// const isProd = JSON.parse(process.env.IS_PROD || "false");
const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY || "";

const router = Router();

// TODO: Add a middleware to protect the endpoint with an API key

router.post("/", async (req: Request, res: Response): Promise<void> => {
  try {
    console.log(req.body);
    const { ngoId, disasterId } = req.body;
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
          "Sorry the funds cannot be sanctioned. I could not find any valid proof of your service",
      });
    } else {
      const searchItem = JSON.stringify(searchResultsItems[0], null, 2);
      const aiResponse = await openai.chat.completions.create({
        model: "deepseek/deepseek-r1-distill-llama-70b",
        messages: [
          {
            role: "system",
            content: "You are a NGO",
          },
          {
            role: "user",
            content: searchItem,
          },
        ],
      });
      const { response, claimAmount } = JSON.parse(
        aiResponse.choices[0].message.content || "{}"
      );
      if (response) {
        if (response == "Approved") {
          console.log("Claim Amount");
          console.log(claimAmount);
          // Send a tx to claim funds
        }
      }
    }
    res.json({ searchResultsItems });
  } catch (error) {
    console.error("Error processing chat:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
