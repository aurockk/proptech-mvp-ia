import express from "express";
import { z } from "zod";
import { semanticSearch } from "../ai/vector";

const router = express.Router();

const bodySchema = z.object({
  query: z.string().min(2, "Escribe al menos 2 caracteres."),
});

router.post("/", async (req, res) => {
  try {
    const { query } = bodySchema.parse(req.body);

    // log de entrada
    console.log("POST /api/search >", { query });

    const matches = await semanticSearch(query, 12, 0.56);

    // log de salida
    console.log("POST /api/search < OK", { count: matches.length });

    return res.json(matches);
  } catch (err: any) {
    console.error("POST /api/search < ERROR", { err: err?.message, stack: err?.stack });
    if (err?.name === "ZodError") {
      return res.status(400).json({ error: "validation_error", issues: err.errors });
    }
    return res.status(500).json({ error: "search_failed", message: err?.message ?? String(err) });
  }
  
});

export default router;
