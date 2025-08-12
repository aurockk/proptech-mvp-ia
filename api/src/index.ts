import "dotenv/config";
import express from "express";
import cors from "cors";
import searchRouter from "./routes/search";
import voiceRouter from "./routes/voice";
import dns from "node:dns";
dns.setDefaultResultOrder("ipv4first");

import { Agent, setGlobalDispatcher } from "undici";

setGlobalDispatcher(new Agent({
  connect: { family: 4, timeout: 30_000 },  // IPv4 + timeout
  keepAliveTimeout: 10_000,
  keepAliveMaxTimeout: 10_000,
}));

export function getEnv(name: string): string {
    const v = process.env[name];
    if (!v) throw new Error(`Missing env var: ${name}`);
    return v;
  }

  
const app = express();
app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => res.json({ ok: true }));
app.use("/api/search", searchRouter);
app.use("/api/voice", voiceRouter);

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`API running on http://localhost:${PORT}`));

console.log("OPENAI_API_KEY:", process.env.OPENAI_API_KEY?.slice(0,4) + "...");
