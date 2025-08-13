import "dotenv/config";
import { Pinecone } from "@pinecone-database/pinecone";
import { getEnv } from "../config/env";

export const PROVIDER = (process.env.EMBED_PROVIDER ?? "hf").toLowerCase(); // "hf" | "openai"
export const USE_HF = PROVIDER === "hf";

export const DIMENSION = USE_HF ? 384 : 1536;
const _INDEX_NAME = USE_HF ? getEnv("PINECONE_INDEX_HF") : getEnv("PINECONE_INDEX");
export const INDEX_NAME = _INDEX_NAME;

export const pc = new Pinecone({ apiKey: getEnv("PINECONE_API_KEY") });
