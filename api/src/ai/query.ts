// api/src/ai/query.ts
import { z } from "zod";

/* ---------------- Tipos y helpers existentes ---------------- */

export type ParsedQuery = {
  text: string;
  operation?: "rent" | "sale" | "temp";
  priceMin?: number;
  priceMax?: number;
  bedrooms?: number;
  city?: string;
  barrio?: string;
  locationTokens: string[];
};

export function normalize(s: string) {
  return (s ?? "")
    .toLowerCase()
    .normalize("NFD").replace(/\p{Diacritic}/gu, "")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const STOP = new Set(["en","de","la","el","los","las","y","o","un","una","por","para","con","a","del"]);

export const BARRIOS_CABA = [
  "palermo","belgrano","recoleta","caballito","almagro","flores","colegiales","nuñez","nunez",
  "villa urquiza","villa crespo","san telmo","monserrat","barracas","boedo","chacarita",
  "parque patricios","parque chacabuco","retiro","puerto madero"
].map(normalize);

const CITY_VARIANTS: Record<string,string[]> = {
  caba: [
    "caba","capital","capital federal",
    "ciudad autonoma de buenos aires","buenos aires","bs as","baires"
  ],
  cordoba: ["cordoba"],
  rosario: ["rosario"],
  mendoza: ["mendoza"],
  "la plata": ["la plata"],
  "mar del plata": ["mar del plata"]
};

export function inferLocationFromAddress(address?: string): { city?: string; barrio?: string } {
  if (!address) return {};
  const a = normalize(address);

  // ciudad por variantes
  for (const [city, vars] of Object.entries(CITY_VARIANTS)) {
    if (vars.some(v => a.includes(v))) {
      const normalized = city === "buenos aires" ? "caba" : city;
      return { city: normalized, ...inferBarrio(a, normalized) };
    }
  }
  // barrio CABA ⇒ asumimos CABA si no se mencionó ciudad
  const b = BARRIOS_CABA.find(bb => a.includes(bb));
  if (b) return { city: "caba", barrio: b };
  return {};
}

function inferBarrio(a: string, city?: string) {
  if (city !== "caba") return {};
  const b = BARRIOS_CABA.find(bb => a.includes(bb));
  return b ? { barrio: b } : {};
}

/* ---------------- Parser principal (sincrónico) ---------------- */

export function parseQuery(raw: string): ParsedQuery {
  const q = normalize(raw);
  const tokens = q.split(" ").filter(t => t && !STOP.has(t));

  // operación
  let operation: ParsedQuery["operation"];
  if (tokens.some(t => ["alquiler","alquilo","alquilar","rent","renta"].includes(t))) operation = "rent";
  if (tokens.some(t => ["venta","vendo","comprar","sale"].includes(t))) operation = "sale";
  if (tokens.some(t => ["temporal","temporario","temporary"].includes(t))) operation = "temp";

  // dormitorios
  const bedMatch = q.match(/(\d+)\s*(habitac|hab|dorm|dormit)/i);
  const bedrooms = bedMatch?.[1] ? Number(bedMatch[1]) : undefined;

  // precios robustos
  let priceMin: number | undefined; let priceMax: number | undefined;
  const toNum = (s: string) => Number(String(s).replace(/[^\d]/g, "")) || undefined;
  const rango = q.match(/(\d[\d\. ]*)\s*(?:a|y|hasta|-)\s*(\d[\d\. ]*)/);
  if (rango?.[1] && rango?.[2]) {
    priceMin = toNum(rango[1]); priceMax = toNum(rango[2]);
  } else {
    const maxOnly = q.match(/(?:hasta|<=|menos de)\s*(\d[\d\. ]*)/);
    if (maxOnly?.[1]) priceMax = toNum(maxOnly[1]);
    const minOnly = q.match(/(?:desde|>=|mas de|más de|>\s*)\s*(\d[\d\. ]*)/);
    if (minOnly?.[1]) priceMin = toNum(minOnly[1]);
  }

  // ciudad/barrio desde el texto
  let city: string | undefined; let barrio: string | undefined;
  for (const [c, vars] of Object.entries(CITY_VARIANTS)) {
    if (vars.some(v => q.includes(normalize(v)))) { city = c === "buenos aires" ? "caba" : c; break; }
  }
  const b = BARRIOS_CABA.find(bb => q.includes(bb));
  if (b) { barrio = b; if (!city) city = "caba"; }

  // tokens de ubicación “sueltos”
  const KW = new Set([
    "alquiler","alquilo","alquilar","rent","renta","venta","vendo","comprar","sale",
    "temporal","temporario","temporary","habitac","hab","dorm","dormit",
    "hasta","desde","menos","mas","más","de","a","en"
  ]);
  const locationTokens = tokens.filter(t => !/^\d+$/.test(t) && !KW.has(t));

  const text = tokens.join(" ");
  const out: ParsedQuery = {
    text,
    ...(operation ? { operation } : {}),
    ...(priceMin != null ? { priceMin } : {}),
    ...(priceMax != null ? { priceMax } : {}),
    ...(typeof bedrooms === "number" ? { bedrooms } : {}),
    ...(city ? { city } : {}),
    ...(barrio ? { barrio } : {}),
    locationTokens,
  };

  return out;
}

/* ---------------- Zod: esquema + validadores ---------------- */

export const parsedQuerySchema = z.object({
  text: z.string().min(2, "La consulta es muy breve."),
  operation: z.enum(["rent","sale","temp"]).optional(),
  priceMin: z.number().nonnegative().optional(),
  priceMax: z.number().nonnegative().optional(),
  bedrooms: z.number().int().nonnegative().optional(),
  city: z.string().optional(),
  barrio: z.string().optional(),
  locationTokens: z.array(z.string()).default([]),
})
.refine(
  (v) => (v.priceMin == null || v.priceMax == null) || (v.priceMin <= v.priceMax),
  { message: "priceMin no puede ser mayor que priceMax", path: ["priceMin"] }
);

export type ValidParsedQuery = z.infer<typeof parsedQuerySchema>;

/** Parsea y valida en una sola llamada. Lanza ZodError si no cumple. */
export function parseAndValidate(raw: string): ValidParsedQuery {
  const parsed = parseQuery(raw);
  return parsedQuerySchema.parse(parsed);
}
