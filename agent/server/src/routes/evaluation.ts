import { Router, Request, Response } from "express";

// const isProd = JSON.parse(process.env.IS_PROD || "false");

const router = Router();

// TODO: Add a middleware to protect the endpoint with an API key

router.post("/", async (req: Request, res: Response): Promise<void> => {
  try {
    const { ngoId, disasterId } = req.body;
    console.log("NGO ID: ", ngoId);
    console.log("Disaster ID: ", disasterId);
    // Fetch the NGO and Disaster from supabase

    // Search the google search engine

    // If positive, make a tx and push data to supabase
    console.log(req.body);
  } catch (error) {
    console.error("Error processing chat:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
