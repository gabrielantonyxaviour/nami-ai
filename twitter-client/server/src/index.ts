import express, { NextFunction, Request, Response } from "express";
import cors from "cors";
import dotenv from "dotenv";
import { resolve } from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";
import { IService } from "./services/base.service.js";
import chatRouter from "./routes/chat.js";
import cookieParser from "cookie-parser";
import { AnyType } from "./utils/index.js";
import { isHttpError } from "http-errors";
import { ElizaService } from "./services/eliza.service.js";
import { NgrokService } from "./services/ngrok.service.js";
import { SupabaseService } from "./services/supabase.service.js";
import { LitService } from "./services/lit.service.js";

// Convert ESM module URL to filesystem path
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Track services for graceful shutdown
const services: IService[] = [];

// Load environment variables from root .env file
dotenv.config({
  path: resolve(__dirname, "../../.env"),
});

// Initialize Express app
const app = express();
const port = process.env.PORT || 3001;

// Configure CORS with ALL allowed origins
app.use(cors());

// Parse JSON request bodies
app.use(express.json());
app.use(cookieParser());

const elizaService = ElizaService.getInstance()
const supabaseService = SupabaseService.getInstance()

app.use('/chat', chatRouter)

app.use((req, _res, next) => {
  console.log('Request URL:', req.originalUrl);
  console.log('Request Method:', req.method);
  console.log('Request Body:', JSON.stringify(req.body, null, 2));

  next();
});

// 404 handler
app.use((_req: Request, _res: Response, _next: NextFunction) => {
  _res.status(404).json({
    message: `Route ${_req.method} ${_req.url} not found`,
  });
});

app.use((_err: AnyType, _req: Request, _res: Response, _next: NextFunction) => {
  if (isHttpError(_err)) {
    _res.status(_err.statusCode).json({
      message: _err.message,
    });
  } else if (_err instanceof Error) {
    _res.status(500).json({
      message: `Internal Server Error: ${_err.message}`,
    });
  } else {
    _res.status(500).json({
      message: `Internal Server Error`,
    });
  }
});

// Start server and initialize services
app.listen(port, async () => {
  try {
    console.log(`Server running on PORT: ${port}`);
    console.log("Server Environment:", process.env.NODE_ENV);

    await elizaService.start();
    await supabaseService.start()
    const litService = await LitService.getInstance()
    services.push(elizaService);
    services.push(supabaseService);
    services.push(litService);

    if (process.env.NODE_ENV == "dev") {
      const ngrokService = NgrokService.getInstance();
      await ngrokService.start();
      const ngrokUrl = ngrokService.getUrl()!;
      console.log("NGROK URL:", ngrokUrl);
      services.push(ngrokService);
    }

    console.log("Eliza service and ready to interact at /chat with a verified Telegram Auth JWT Token");
    console.log("Supabase service listening for any new trade data");
  } catch (e) {
    console.error("Failed to start server:", e);
    process.exit(1);
  }
});

// Graceful shutdown handler
async function gracefulShutdown() {
  console.log("Shutting down gracefully...");
  await Promise.all(services.map((service) => service.stop()));
  process.exit(0);
}

// Register shutdown handlers
process.on("SIGTERM", gracefulShutdown);
process.on("SIGINT", gracefulShutdown);
