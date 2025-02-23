import { Router, Request, Response } from "express";
// import { google } from "googleapis";
// import cors from "cors";
// import OpenAI from "openai";
// import { disasterQueries } from "src/constants.js";
// import { groupRelatedArticles, searchQueries } from "src/utils/evaluation.js";

// const isProd = JSON.parse(process.env.IS_PROD || "false");
// const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY || "";

const router = Router();
// type Article = {
//   title: string;
//   snippet: string;
// };

// TODO: Add a middleware to protect the endpoint with an API key

router.post("/", async (req: Request, res: Response): Promise<void> => {
  try {
    console.log(req.body);
    const { startTime, endTime } = req.body;
    console.log("Start Time: ", startTime);
    console.log("End Time: ", endTime);

    // Fetch the NGO and Disaster from supabase

    // Search the google search engine
    // const customSearch = google.customsearch("v1");
    // const openai = new OpenAI({
    //   apiKey: process.env.HEURIST_API_KEY || "",
    //   baseURL: "https://llm-gateway.heurist.xyz/v1",
    // });

    // const allQueries = disasterQueries.flatMap((query) => query.queries);

    // const results = await searchQueries(allQueries);
    // const validatedArticles: Article[] = [];

    // for (const result of results) {
    //   const validation = await this._validateDisasterDate(
    //     `${result.title}\n${result.snippet}`,
    //     query
    //   );

    //   if (validation.isValid) {
    //     validatedArticles.push(result);
    //   }
    // }

    // Group related articles
    // const articleGroups = await groupRelatedArticles(validatedArticles, openai);

    // Generate one tweet per group
    // const consolidatedTweets = [];
    // for (const group of articleGroups) {
    //   const tweet = await this.(group);
    //   if (tweet) {
    //     consolidatedTweets.push(tweet);
    //   }
    // }

    // If positive, make a tx and push data to supabase
  } catch (error) {
    console.error("Error processing chat:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
