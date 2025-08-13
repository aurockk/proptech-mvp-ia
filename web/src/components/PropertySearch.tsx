import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Search, Mic, MicOff, MapPin } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { postForm } from "@/lib/api"; // ← cliente que llama a `${API}/api/voice/search`

interface PropertySearchProps {
  onSearch: (query: string) => void;
  isLoading?: boolean;
}

export const PropertySearch = ({ onSearch, isLoading = false }: PropertySearchProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [voiceLoading, setVoiceLoading] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const { toast } = useToast();

  const handleSearch = () => {
    if (searchQuery.trim()) onSearch(searchQuery);
  };

  // --- Voz con MediaRecorder -> backend ---
  async function startVoiceSearch() {
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        toast({
          title: "No soportado",
          description: "Tu navegador no permite capturar audio",
          variant: "destructive",
        });
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mime =
        (window as any).MediaRecorder?.isTypeSupported?.("audio/webm;codecs=opus")
          ? "audio/webm;codecs=opus"
          : "audio/webm";

      const mr = new MediaRecorder(stream, { mimeType: mime });
      mediaRecorderRef.current = mr;
      chunksRef.current = [];
      setIsListening(true);

      mr.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
      };

      mr.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: mr.mimeType || "audio/webm" });

        try {
          setVoiceLoading(true);
          const fd = new FormData();
          fd.append("file", blob, "query.webm");

          // Espera { text, matches } desde tu backend
          const data = await postForm<{ text: string; matches?: unknown[] }>("/api/voice/search", fd);

          const text = (data?.text || "").trim();
          if (!text) {
            toast({
              title: "Sin texto",
              description: "No se pudo transcribir el audio",
              variant: "destructive",
            });
            return;
          }

          setSearchQuery(text);
          onSearch(text); // dispara la búsqueda con el texto transcripto
        } catch (err: any) {
          toast({
            title: "Error de voz",
            description: err?.message || "No se pudo procesar el audio",
            variant: "destructive",
          });
        } finally {
          setVoiceLoading(false);
          setIsListening(false);
        }
      };

      mr.start();
      // Autostop para no grabar indefinidamente (10s)
      setTimeout(() => {
        if (mr.state !== "inactive") mr.stop();
      }, 10000);
    } catch (e: any) {
      setIsListening(false);
      toast({
        title: "Permiso denegado",
        description: "No se pudo acceder al micrófono",
        variant: "destructive",
      });
    }
  }

  function stopVoiceSearch() {
    const mr = mediaRecorderRef.current;
    if (mr && mr.state !== "inactive") mr.stop();
    setIsListening(false);
  }

  // --- UI (sin cambios de diseño) ---
  return (
    <Card className="p-6 w-full max-w-4xl mx-auto shadow-search backdrop-blur-sm bg-white/95">
      <div className="space-y-4">
        <div className="flex items-center space-x-2">
          <MapPin className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold text-foreground">
            Encuentra tu propiedad ideal
          </h2>
        </div>

        <div className="flex space-x-2">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Ej: Alquiler 2 ambientes en Palermo"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && handleSearch()}
              className="pl-10 py-6 text-base"
              disabled={isLoading || voiceLoading}
            />
          </div>

          <Button
            onClick={isListening ? stopVoiceSearch : startVoiceSearch}
            variant={isListening ? "destructive" : "outline"}
            size="lg"
            className="px-6"
            disabled={isLoading || voiceLoading}
          >
            {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
          </Button>

          <Button
            onClick={handleSearch}
            size="lg"
            className="px-8"
            disabled={isLoading || voiceLoading || !searchQuery.trim()}
          >
            Buscar
          </Button>
        </div>

        {(isListening || voiceLoading) && (
          <div className="text-center py-2">
            <p className="text-sm text-muted-foreground animate-pulse">
              {isListening ? "🎤 Escuchando... Habla ahora" : "Transcribiendo..."}
            </p>
          </div>
        )}
      </div>
    </Card>
  );
};
