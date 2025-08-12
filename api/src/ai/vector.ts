import "dotenv/config";
import { v4 as uuid } from "uuid";
import type { QueryResponse } from "@pinecone-database/pinecone";
import { pc, INDEX_NAME, DIMENSION } from "./config";
import { embedDocumentsBatched, embedQuery } from "./embeddings";

import { inferLocationFromAddress, parseQuery, parseAndValidate } from "./query";



export type Property = {
  id?: string;
  title: string;
  operation: "rent" | "sale" | "temp";
  price: number;
  address?: string;
  bedrooms?: number;
  bathrooms?: number;
  description?: string;
};

function propertyToChunk(p: Property) {
  return [
    `title: ${p.title}`,
    `operation: ${p.operation}`,
    `price: ${p.price}`,
    p.address ? `address: ${p.address}` : "",
    p.bedrooms ? `bedrooms: ${p.bedrooms}` : "",
    p.bathrooms ? `bathrooms: ${p.bathrooms}` : "",
    p.description ? `description: ${p.description}` : "",
  ].filter(Boolean).join("\n");
}

export async function ensureIndex() {
  try {
    await pc.describeIndex(INDEX_NAME);
  } catch {
    await pc.createIndex({
      name: INDEX_NAME,
      dimension: DIMENSION,
      metric: "cosine",
      spec: { serverless: { cloud: "aws", region: "us-east-1" } },
    });
    let ready = false;
    while (!ready) {
      const d = await pc.describeIndex(INDEX_NAME);
      ready = d.status?.ready ?? false;
      if (!ready) await new Promise(r => setTimeout(r, 2500));
    }
  }
  return pc.index(INDEX_NAME);
}

export async function upsertProperties(props: Property[]) {
  const index = await ensureIndex();
  const texts = props.map(propertyToChunk);
  const vectors = await embedDocumentsBatched(texts);
  await index.upsert(vectors.map((vec, i) => ({
    id: props[i]?.id ?? uuid(),
    values: vec as number[],
    metadata: { ...props[i] },
  })));

  const toUpsert = vectors.map((vec, i) => {
    const p = props[i]!;
    const loc = inferLocationFromAddress(p.address || p.title); // fallback al título si no hay address
  
    return {
      id: p.id ?? uuid(),
      values: vec as number[],
      metadata: {
        ...p,     // title, price, operation, address, etc.
        ...loc,   // 👈 city / barrio normalizados
      },
    };
  });
  await index.upsert(toUpsert);
}

type Match = NonNullable<QueryResponse["matches"]>[number];


export async function semanticSearch(rawQuery: string, topK = 12, minScore = 0.56) {
  const { text, operation, priceMin, priceMax, bedrooms, city, barrio } = parseAndValidate(rawQuery);

  const index = await ensureIndex();
  const vector = await embedQuery(text);

  const baseFilter: Record<string, any> = {};
  if (operation) baseFilter.operation = operation;
  if (typeof bedrooms === "number") baseFilter.bedrooms = { $gte: bedrooms };
  if (priceMin != null || priceMax != null) {
    baseFilter.price = {};
    if (priceMin != null) baseFilter.price.$gte = priceMin;
    if (priceMax != null) baseFilter.price.$lte = priceMax;
  }

  const strongFilter = { ...baseFilter, ...(city ? { city } : {}), ...(barrio ? { barrio } : {}) };

  const q = async (filter?: Record<string, any>, score = minScore) => {
    const res = await index.query({
      vector: Array.from(vector),
      topK,
      includeMetadata: true,
      ...(filter && Object.keys(filter).length ? { filter } : {}),
    }) as QueryResponse;
    return (res.matches ?? []).filter(m => (m.score ?? 0) >= score);
  };

  // intento fuerte → base → sin filtro
  let matches = await q(strongFilter, minScore);
  if (matches.length === 0 && (city || barrio)) matches = await q(baseFilter, minScore - 0.03);
  if (matches.length === 0) matches = await q(undefined, minScore - 0.06);

  return matches.slice(0, 10);
}

