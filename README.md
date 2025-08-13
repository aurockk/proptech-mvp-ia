# PropTech MVP – Texto + Voz

Búsqueda de propiedades con texto y voz.  
Frontend (Vite/React + Tailwind) y API Node/Express con embeddings y transcripción (Whisper con fallback a Hugging Face).

---

### 🚀 Quickstart

Requisitos
- Node 18+
- pnpm o npm
- Variables en .env (ver ejemplos más abajo)

#### 1) Backend
cd api
cp .env.example .env      
pnpm i                    # o npm i
pnpm dev                  # API en http://localhost:4000

#### 2) Frontend
- cd web
- cp .env.example .env      
- pnpm i
- pnpm dev           

---

### 🔍 API Reference
#### GET api/health
Muestra si esta corriendo el backend y funciona correctamente. 
#### POST /docs
Documentación Swagger con ```api/search```
#### POST /api/search
Busca por texto.

```
Body
{
  "query": "alquiler 2 ambientes en Palermo",
  "offset": 0,
  "limit": 12
}
```
```
200 OK
{
  "matches": [
    {
      "id": "abc123",
      "score": 0.68,
      "metadata": {
        "title": "Depto 2 ambientes en Palermo",
        "operation": "rent",
        "price": 350000,
        "address": "Av. Belgrano 4241, CABA",
        "bedrooms": 1,
        "bathrooms": 1,
        "description": "Luminoso..."
      }
    }
  ],
  "total": 42
}
```

#### POST /api/voice/search
Transcribe audio y busca.

Form-Data
- file: audio (webm/mp4/ogg…)
- opcional: topK, minScore

```200 OK
{
  "text": "alquiler dos ambientes en Palermo",
  "matches": [ /* mismo formato que /api/search */ ]
}

Errores comunes
{ "error": "no_file" }
{ "error": "empty_transcription" }
{ "error": "voice_search_failed", "message": "..." }
```

---

### 🧱 Arquitectura
- web/: Vite + React + Tailwind.
- api/: Express con /api/search y /api/voice/search, Whisper + HF fallback, Pinecone para vectores (si aplica).

---

## 🧰 Scripts útiles
### web/
- pnpm dev        # levanta web
- pnpm build      # build
- pnpm preview    # preview

## api/
- pnpm dev        # dev con tsx
- pnpm start 