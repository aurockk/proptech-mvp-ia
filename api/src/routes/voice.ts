// api/src/routes/voice.ts
import express, { Request, Response } from "express";
import multer from "multer";
import { OpenAI } from "openai";
import { toFile } from "openai/uploads";
import { getEnv } from "../env";
import { semanticSearch } from "../ai/vector";
import { z } from "zod";

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 15 * 1024 * 1024 }, // 15 MB
});

const openai = new OpenAI({ apiKey: getEnv("OPENAI_API_KEY") });
const router = express.Router();

const optsSchema = z.object({
    topK: z.coerce.number().int().min(1).max(50).default(12),
    minScore: z.coerce.number().min(0).max(1).default(0.56),
});

router.post(
    "/search",
    upload.single("file"),
    async (req: Request, res: Response) => {
        try {
            // ✅ req.file (no req.title)
            if (!req.file) return res.status(400).json({ error: "no_file" });

            const { topK, minScore } = optsSchema.parse({
                topK: (req.query as any)?.topK ?? (req.body as any)?.topK,
                minScore: (req.query as any)?.minScore ?? (req.body as any)?.minScore,
            });

            // ✅ OpenAI espera un Uploadable. Usamos toFile con el buffer de multer.
            const file = await toFile(req.file.buffer, req.file.originalname || "audio.webm", {
                type: req.file.mimetype, // ✅ mimetype (no "filter")
            });

            const tr = await openai.audio.transcriptions.create({
                file,
                model: "whisper-1",
                // language: "es", // opcional
            });

            const text = (tr as any)?.text?.trim?.() ?? "";
            if (!text) {
                return res.status(422).json({ error: "empty_transcription" });
            }

            const matches = await semanticSearch(text, topK, minScore);
            return res.json({ text, matches });
        } catch (err: any) {
            console.error("POST /api/voice/search < ERROR", {
                name: err?.name,
                message: err?.message,
                status: err?.status,
                code: err?.code,
                cause: err?.cause,
                stack: err?.stack,
            });
            return res
                .status(500)
                .json({ error: "voice_search_failed", message: err?.message });
        }
    }
);

export default router;
