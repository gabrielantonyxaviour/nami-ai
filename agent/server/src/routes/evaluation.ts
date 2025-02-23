import { Router, Request, Response } from "express";
// import { google } from "googleapis";
// import OpenAI from "openai";
// import { disasterQueries } from "src/constants.js";
// import { groupRelatedArticles, searchQueries } from "src/utils/evaluation.js";

// const isProd = JSON.parse(process.env.IS_PROD || "false");
// const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY || "";

const router = Router();

// TODO: Add a middleware to protect the endpoint with an API key

router.post("/", async (req: Request, res: Response): Promise<void> => {
  try {
    console.log(req.body);
    const { ngoId, disasterId } = req.body;
    console.log("NGO ID: ", ngoId);
    console.log("Disaster ID: ", disasterId);

    // Fetch the NGO and Disaster from supabase

    // Search the google search engine
    // const customSearch = google.customsearch("v1");
    // const openai = new OpenAI({
    //   apiKey: process.env.HEURIST_API_KEY || "",
    //   baseURL: "https://llm-gateway.heurist.xyz/v1",
    // });
  } catch (error) {
    console.error("Error processing chat:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
