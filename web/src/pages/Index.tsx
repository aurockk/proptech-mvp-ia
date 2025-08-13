import { useState } from "react";
import { PropertySearch } from "@/components/PropertySearch";
import { PropertyResults } from "@/components/PropertyResults";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import heroImage from "@/assets/hero-bg.jpg";


const API =
  (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, '') ??
  'http://localhost:4000';


function matchToProperty(m: any) {
  const md = m?.metadata ?? {};
  const location = [md.address, md.city, md.barrio].filter(Boolean).join(", ");
  return {
    id: String(m?.id ?? crypto.randomUUID()),
    title: md.title ?? "Propiedad",
    location,
    price: typeof md.price === "number" ? `$${md.price}` : (md.price ?? ""),
    bedrooms: md.bedrooms,
    bathrooms: md.bathrooms,
    area: md.area,
    imageUrl:
      md.imageUrl ??
      "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=1200&q=80&auto=format&fit=crop",
    type: md.type ?? md.operation ?? "Propiedad",
    featured: false,
  };
}


const Index = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [properties, setProperties] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const { toast } = useToast();

  const handleSearch = async (query: string) => {
    const q = query.trim();
    if (!q) return;
  
    setIsLoading(true);
    setSearchQuery(q);
    setHasSearched(true);
  
    try {
      const res = await fetch(`${API}/api/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query }),
      });
      const data = await res.json();
      const matches = Array.isArray(data)
        ? data
        : Array.isArray(data?.matches)
        ? data.matches
        : [];
  
      const list = matches.map(matchToProperty);
      setProperties(list);
  
      toast({
        title: "Búsqueda completada",
        description: `Se encontraron ${list.length} propiedades`,
      });
    } catch (e: any) {
      setProperties([]);
      toast({
        title: "Error en la búsqueda",
        description: e?.message || "request_failed",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };  

  const handleContactSeller = (propertyId: string) => {
    toast({
      title: "Contacto iniciado",
      description: "Te conectaremos con el vendedor pronto",
    });
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative min-h-[70vh] flex items-center justify-center overflow-hidden">
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: `url(${heroImage})` }}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/40 to-black/60" />
        
        <div className="relative z-10 container mx-auto px-4 text-center">
          <div className="max-w-4xl mx-auto space-y-8">
            <div className="space-y-4">
              <h1 className="text-4xl md:text-6xl font-bold text-white leading-tight">
                Encuentra tu
                <span className="block bg-gradient-to-r from-blue-400 to-green-400 bg-clip-text text-transparent">
                  hogar perfecto
                </span>
              </h1>
              <p className="text-xl md:text-2xl text-white/90 max-w-2xl mx-auto">
                Busca propiedades por texto o voz. Tecnología inteligente para encontrar el hogar de tus sueños.
              </p>
            </div>
            
            <PropertySearch onSearch={handleSearch} isLoading={isLoading} />
            
            <div className="flex flex-wrap justify-center gap-4 text-white/80">
              <Button variant="ghost" className="text-white hover:text-white hover:bg-white/10">
                🏠 Casas
              </Button>
              <Button variant="ghost" className="text-white hover:text-white hover:bg-white/10">
                🏢 Departamentos
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Results Section */}
      {hasSearched && (
        <section className="py-16">
          <PropertyResults
            properties={properties}
            searchQuery={searchQuery}
            hasMore={properties.length > 0}
            isLoading={isLoading}
          />
        </section>
      )}

    </div>
  );
};

export default Index;