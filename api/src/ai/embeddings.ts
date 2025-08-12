import { setTimeout as delay } from "node:timers/promises";
import { InferenceClient } from "@huggingface/inference";
import { OpenAIEmbeddings } from "@langchain/openai";
import { getEnv } from "../env";
import { USE_HF } from "./config";;

const BATCH_SIZE = Number(process.env.EMBED_BATCH_SIZE ?? 10);
const BATCH_DELAY = Number(process.env.EMBED_BATCH_DELAY_MS ?? 800);
const MAX_RETRIES = Number(process.env.EMBED_MAX_RETRIES ?? 4);

/** --- Embeddings “raw” por proveedor --- */
async function embedRawHF(texts: string[]): Promise<number[][]> {
  const hf = new InferenceClient(getEnv("HUGGINGFACE_API_KEY"));
  const model = "sentence-transformers/all-MiniLM-L6-v2";

  const out: number[][] = [];
  for (const t of texts) {
    const fe = await hf.featureExtraction({
      model,
      inputs: t,
      pooling: "mean",
      normalize: true,
    });

    // puede venir como Float32Array | number[] | number[][]
    let vec: number[];
    if (Array.isArray((fe as any)[0])) {
      // tokens x dim
      const tokens = fe as unknown as number[][];
      const first = tokens[0];
      const dim = first?.length ?? 0;
      const acc = new Array(dim).fill(0);
    
      for (const row of tokens) {
        for (let i = 0; i < dim; i++) acc[i] += row[i] ?? 0;
      }
    
      const denom = tokens.length || 1;
      vec = acc.map(v => v / denom);
    } else {
      vec = Array.from(fe as unknown as number[]);
    }
    out.push(vec);
  }
  return out;
}

async function embedRawOpenAI(texts: string[]): Promise<number[][]> {
  const emb = new OpenAIEmbeddings({
    model: "text-embedding-3-small",
    apiKey: getEnv("OPENAI_API_KEY"),
  });
  return emb.embedDocuments(texts);
}

async function embedRaw(texts: string[]): Promise<number[][]> {
  return USE_HF ? embedRawHF(texts) : embedRawOpenAI(texts);
}

/** --- Batching + backoff --- */
export async function embedDocumentsBatched(texts: string[]): Promise<number[][]> {
  const out: number[][] = [];
  for (let i = 0; i < texts.length; i += BATCH_SIZE) {
    const slice = texts.slice(i, i + BATCH_SIZE);
    for (let attempt = 1; ; attempt++) {
      try {
        out.push(...(await embedRaw(slice)));
        break;
      } catch (e) {
        if (attempt >= MAX_RETRIES) throw e;
        await delay(BATCH_DELAY * attempt);
      }
    }
    await delay(BATCH_DELAY);
  }
  return out;
}

export async function embedQuery(q: string): Promise<number[]> {
  const [v] = await embedDocumentsBatched([q]);
  if (!v) throw new Error("No embedding generated");
  return v as number[];
}

