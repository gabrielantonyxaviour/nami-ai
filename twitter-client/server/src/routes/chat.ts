import { Router, Request, Response, NextFunction } from "express";
import jwt, { JwtPayload } from "jsonwebtoken";
import jwksClient from "jwks-rsa";
import { ElizaService } from "../services/eliza.service.js";
import { getTradePlay } from "../utils/getTradePlay.js";
import { fetchExecutedTrade } from "../utils/getExecutedTrade.js";
import { validateAndParseResponse } from "../utils/index.js";

const isProd = JSON.parse(process.env.IS_PROD || "false");

declare module "express" {
    export interface Request {
        user?: JwtPayload; // Modify this type based on the actual JWT payload structure
    }
}

const router = Router();
const client = jwksClient({
    jwksUri: "https://auth.privy.io/api/v1/apps/cm6sxwdpg00d7fe5wlubpqfzn/jwks.json",
});

async function getSigningKey(kid: string): Promise<string> {
    const key = await client.getSigningKey(kid);
    return key.getPublicKey();
}

export async function verifyPrivyToken(
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> {
    console.log(isProd)
    if (!isProd) {
        next()
    } else {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            res.status(401).json({ error: "Unauthorized" }); // ❌ Don't return inside `async` functions
            return;
        }

        const token = authHeader.split(" ")[1];

        try {
            const decoded = jwt.decode(token, { complete: true }) as { header: { kid: string } } | null;
            if (!decoded || !decoded.header.kid) {
                res.status(401).json({ error: "Invalid token" });
                return;
            }

            const key = await getSigningKey(decoded.header.kid);

            const verified = jwt.verify(token, key, { algorithms: ["RS256"] }) as JwtPayload;

            (req as any).user = verified; // ✅ Fix TypeScript error

            next();
            return
        } catch (err) {
            res.status(401).json({ error: "Invalid token" });
            return;
        }
    }

}

export function verifyTradeUsername(
    req: Request,
    res: Response,
    next: NextFunction
): void {
    console.log(isProd)
    if (!isProd) {
        next()
    } else {
        if (!req.body) {
            res.status(400).json({ error: "Missing request body" });
            return;
        }

        if (!req.user) {
            res.status(401).json({ error: "User not authenticated" });
            return;
        }

        const authenticatedUsername = req.user.telegram?.username;

        if (!authenticatedUsername) {
            res.status(401).json({ error: "No telegram username found in authentication token" });
            return;
        }

        if (process.env.TELEGRAM_USERNAME !== authenticatedUsername) {
            res.status(403).json({
                error: "Username mismatch",
                message: "The provided username does not match the authenticated user"
            });
            return;
        }

        next();
    }

}

router.post("/", verifyPrivyToken, verifyTradeUsername, async (req: Request, res: Response): Promise<void> => {
    try {
        console.log("Received trade play request:", req.body);
        const { text } = req.body;
        const { tradePlayId, executedTradeId, conversationId, message } = validateAndParseResponse(text);

        const tradePlay = tradePlayId && await getTradePlay(tradePlayId);
        const executedTrade = executedTradeId && await fetchExecutedTrade(executedTradeId);

        if (!conversationId && !tradePlay && !executedTrade) {
            res.status(500).json({ error: "No Valid Id provided for context for the conversation" });
            return;
        }

        const elizaService = ElizaService.getInstance();
        const response = await elizaService.messageManager.handleMessage({
            conversationId,
            play: tradePlay,
            trade: executedTrade,
            message: {
                id: (Math.floor(Math.random() * 100000000000000)).toString(),
                text: message.text,
            }
        })

        console.log("ELIZA Reponse: \n", response)
        if (!response) {
            res.status(500).json({ error: "Failed to generate reponse for the query" });
            return;
        }

        res.json(response ? response : {
            conversationId: conversationId ? conversationId : "",
            response: "Error in processing the request"
        });
    } catch (error) {
        console.error("Error processing trade play request:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});

export default router;
