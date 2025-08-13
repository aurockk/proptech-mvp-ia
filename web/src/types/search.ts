export type Match = {
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
      city?: string;
      barrio?: string;
      imageUrl?: string;
      type?: string;
      area?: number;
    };
  };
  
  export type PropertyCard = {
    id: string;
    title: string;
    location: string;
    price: string;
    bedrooms?: number;
    bathrooms?: number;
    area?: number;
    imageUrl?: string;
    type?: string;
    featured?: boolean;
  };
  
  export function matchToProperty(m: Match): PropertyCard {
    const md = m.metadata || {};
    const location = [md.address, md.city, md.barrio].filter(Boolean).join(", ");
    const price = typeof md.price === "number" ? `$${md.price}` : (md.price ?? "");
    return {
      id: m.id,
      title: md.title || "Propiedad",
      location,
      price,
      bedrooms: md.bedrooms,
      bathrooms: md.bathrooms,
      area: md.area,
      imageUrl: md.imageUrl || "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800&q=80",
      type: md.type || md.operation || "Propiedad",
      featured: false,
    };
  }