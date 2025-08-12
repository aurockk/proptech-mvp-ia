"use client";
import { useRef, useState } from "react";

type Match = {
  id: string;
  score?: number;
  metadata?: {
    title?: string;
    operation?: "rent" | "sale" | "temp";
    price?: number;
    address?: string;
    bedrooms?: number;
    bathrooms?: number;
    description?: string;
  };
};

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export default function Home() {
  // --- texto ---
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<Match[]>([]);
  const [error, setError] = useState<string | null>(null);

  // --- voz ---
  const [isRecording, setIsRecording] = useState(false);
  const [voiceLoading, setVoiceLoading] = useState(false);
  const [transcript, setTranscript] = useState<string>("");

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);

  async function onSearch() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API}/api/search`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: q }),
      });
      const data = await res.json();

      const arr = Array.isArray(data)
        ? data
        : Array.isArray(data?.matches)
          ? data.matches
          : [];

      setResults(arr);
      setError(!res.ok ? (data?.error ?? "Search failed") : null);
    } catch (e: any) {
      setError(e.message || "Search failed");
      setResults([]);
    } finally {
      setLoading(false);
    }
  }

  // -------- Voz: grabar -> enviar -> tomar resultados --------
  async function handleRecord() {
    if (isRecording) {
      await stopRecording();
      return;
    }
    await startRecording();
  }

  async function startRecording() {
    try {
      setTranscript("");
      setError(null);

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      // mime más compatible
      const mime =
        (window as any).MediaRecorder?.isTypeSupported?.("audio/webm;codecs=opus")
          ? "audio/webm;codecs=opus"
          : (window as any).MediaRecorder?.isTypeSupported?.("audio/mp4")
            ? "audio/mp4"
            : "";

      const mr = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      mediaRecorderRef.current = mr;
      chunksRef.current = [];

      mr.ondataavailable = e => {
        if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
      };
      mr.onstop = async () => {
        // cerrar mic
        stream.getTracks().forEach(t => t.stop());

        const blob = new Blob(chunksRef.current, {
          type: mr.mimeType || "audio/webm",
        });

        // enviar al backend
        try {
          setVoiceLoading(true);
          const { text, matches } = await voiceSearch(blob);
          setTranscript(text || "");
          setResults(matches || []);
        } catch (e: any) {
          setError(e.message || "Voice search failed");
        } finally {
          setVoiceLoading(false);
        }
      };

      setIsRecording(true);
      mr.start();
      // autostop a los 5s (podés cambiarlo)
      setTimeout(() => {
        if (mr.state !== "inactive") mr.stop();
        setIsRecording(false);
      }, 10000);
    } catch (e: any) {
      setError(e.message || "No se pudo acceder al micrófono");
      setIsRecording(false);
    }
  }

  async function stopRecording() {
    const mr = mediaRecorderRef.current;
    if (mr && mr.state !== "inactive") {
      mr.stop();
      setIsRecording(false);
    }
  }

  async function voiceSearch(blob: Blob): Promise<{ text: string; matches: Match[] }> {
    const fd = new FormData();
    // el backend espera "file"
    fd.append("file", blob, "query.webm");
    const res = await fetch(`${API}/api/voice/search`, { method: "POST", body: fd });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data?.message || data?.error || "voice_search_failed");
    }
    return { text: data?.text ?? "", matches: data?.matches ?? [] };
  }

  return (
    <main style={{ maxWidth: 900, margin: "40px auto", padding: 16 }}>
      <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 12 }}>
        PropTech Search (MVP)
      </h1>

      {/* búsqueda por texto */}
      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Ej: alquiler 2 ambientes en Palermo"
          style={{ flex: 1, padding: 10, border: "1px solid #ddd", borderRadius: 8 }}
        />
        <button
          onClick={onSearch}
          disabled={loading || !q.trim()}
          style={{
            padding: "10px 16px",
            borderRadius: 8,
            border: "none",
            background: "#111827",
            color: "white",
            cursor: "pointer",
            opacity: loading ? 0.7 : 1,
          }}
        >
          {loading ? "Buscando..." : "Buscar"}
        </button>
      </div>

      {/* búsqueda por voz */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
        <button
          onClick={handleRecord}
          disabled={voiceLoading}
          style={{
            padding: "10px 14px",
            borderRadius: 999,
            cursor: "pointer",
          }}
          title={isRecording ? "Detener" : "Hablar y buscar"}
        >
          {isRecording ? "⏹️ Detener" : "🎙️ Hablar"}
        </button>
        <span style={{ fontSize: 14, color: "#6b7280" }}>
          {isRecording
            ? "Grabando… (se detiene solo en 5s)"
            : voiceLoading
              ? "Transcribiendo y buscando…"
              : transcript
                ? `Texto: “${transcript}”`
                : "Usá el micrófono para dictar tu búsqueda"}
        </span>
      </div>

      {error && <p style={{ color: "crimson", marginBottom: 8 }}>{error}</p>}

      <ul style={{ display: "grid", gap: 12, listStyle: "none", padding: 0 }}>
        {(results ?? []).map(m => (
          <li key={m.id}
              style={{ border: "1px solid #eee", borderRadius: 12, padding: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
              <strong>{m.metadata?.title ?? "Propiedad"}</strong>
              <span style={{ fontSize: 12, color: "#6b7280" }}>
                score: {m.score?.toFixed(3)}
              </span>
            </div>
            <div style={{ marginTop: 6, fontSize: 14, color: "#374151" }}>
              <div>{m.metadata?.operation?.toUpperCase()} — ${m.metadata?.price}</div>
              {m.metadata?.address && <div>{m.metadata.address}</div>}
              <div>
                {m.metadata?.bedrooms ? `${m.metadata.bedrooms} dorm • ` : ""}
                {m.metadata?.bathrooms ? `${m.metadata.bathrooms} baños` : ""}
              </div>
              {m.metadata?.description && (
                <div style={{ marginTop: 6, color: "#4b5563" }}>
                  {m.metadata.description}
                </div>
              )}
            </div>
          </li>
        ))}
      </ul>
    </main>
  );
}
