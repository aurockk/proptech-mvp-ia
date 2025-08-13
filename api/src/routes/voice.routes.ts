import express, { Request, Response } from "express";
import multer from "multer";
import { z } from "zod";
import { semanticSearch } from "../ai/vector";


const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 }, // 15 MB
});

const router = express.Router();

// Validación de opciones
const optsSchema = z.object({
  topK: z.coerce.number().int().min(1).max(50).default(12),
  minScore: z.coerce.number().min(0).max(1).default(0.56),
});

// Helpers
function toU8(buf: Buffer) {
  return new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength);
}

function isInsufficientQuotaError(e: any) {
  const msg = String(e?.message || "").toLowerCase();
  return (
    msg.includes("insufficient_quota") ||
    msg.includes("exceeded your current quota") ||
    (e?.status === 429 && !msg.includes("rate limit"))
  );
}

async function transcribeWithRetry(file: Express.Multer.File, tries = 2): Promise<string> {
  let lastErr: any;

  // 1) OpenAI Whisper 
  const OPENAI_KEY = process.env.OPENAI_API_KEY || process.env.OPENAI_WHISPER_API_KEY;
  if (OPENAI_KEY) {
    for (let i = 1; i <= tries; i++) {
      try {
        const fd = new FormData();
        fd.append("model", "whisper-1");
        fd.append(
          "file",
          new Blob([toU8(file.buffer)], { type: file.mimetype }),
          file.originalname || "audio.webm"
        );

        const r = await fetch("https://api.openai.com/v1/audio/transcriptions", {
          method: "POST",
          headers: { Authorization: `Bearer ${OPENAI_KEY}` },
          body: fd,
        });

        if (!r.ok) {
          const errText = await r.text().catch(() => "");
          const err: any = new Error(`Whisper HTTP ${r.status} ${r.statusText} ${errText}`);
          err.status = r.status;
          throw err;
        }

        const j = (await r.json()) as { text?: string };
        const text = j?.text?.trim() ?? "";
        if (!text) throw new Error("empty_transcription");
        return text;
      } catch (e: any) {
        lastErr = e;
        // si es ECONNRESET reintento 1 vez; si es cuota, paso a HF
        const code = String(e?.code || e?.cause?.code || "").toUpperCase();
        if (isInsufficientQuotaError(e)) break;
        if (code === "ECONNRESET" && i < tries) continue;
        break;
      }
    }
  }

  // 2) Fallback: Hugging Face Inference API (audio binario con Bearer)
  const HF_TOKEN = process.env.HF_TOKEN || process.env.HUGGINGFACE_API_KEY;
  if (HF_TOKEN) {
    // Modelo configurable: algunos responden mejor que openai/whisper-base
    const HF_ASR_MODEL = process.env.HF_ASR_MODEL || "openai/whisper-large-v3";
    const url = `https://api-inference.huggingface.co/models/${encodeURIComponent(HF_ASR_MODEL)}`;

    const r = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${HF_TOKEN}`,
        "Content-Type": file.mimetype || "audio/webm",
      },
      body: toU8(file.buffer),
    });

    if (!r.ok) {
      const body = await r.text().catch(() => "");
      throw new Error(`HF Whisper ${r.status} ${body}`);
    }

    const j: any = await r.json();
    const text = String(j?.text ?? j?.[0]?.text ?? "").trim();
    if (!text) throw new Error("empty_transcription");
    return text;
  }

  // 3) Ninguno
  throw lastErr || new Error("no_stt_provider_available");
}

router.post("/search", upload.single("file"), async (req: Request, res: Response) => {
  try {
    if (!req.file) return res.status(400).json({ error: "no_file" });

    const { topK, minScore } = optsSchema.parse({
      topK: (req.query as any)?.topK ?? (req.body as any)?.topK,
      minScore: (req.query as any)?.minScore ?? (req.body as any)?.minScore,
    });

    const text = await transcribeWithRetry(req.file, 2);
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
      .json({ error: "voice_search_failed", message: err?.message || "error" });
  }
});

export default router;
