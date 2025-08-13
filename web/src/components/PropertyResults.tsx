import { PropertyCard } from "./PropertyCard";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Filter, SlidersHorizontal } from "lucide-react";

interface Property {
  id: string;
  title: string;
  location: string;
  price: string;
  bedrooms: number;
  bathrooms: number;
  area: number;
  imageUrl: string;
  type: string;
  featured?: boolean;
}

interface PropertyResultsProps {
  properties: Property[];
  searchQuery: string;
  hasMore: boolean;
  isLoading: boolean;
}

export const PropertyResults = ({ 
  properties, 
  searchQuery,
  hasMore, 
  isLoading 
}: PropertyResultsProps) => {
  return (
    <div className="w-full max-w-7xl mx-auto px-4">
      <div className="flex flex-col space-y-6">
        {/* Results Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
          <div>
            <h2 className="text-2xl font-bold">
              Resultados para "{searchQuery}"
            </h2>
            <p className="text-muted-foreground">
              {properties.length} propiedades encontradas
            </p>
          </div>
          
          <div className="flex items-center space-x-2">
            <Select defaultValue="relevance">
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Ordenar por" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="relevance">Relevancia</SelectItem>
                <SelectItem value="price-low">Precio: Menor a mayor</SelectItem>
                <SelectItem value="price-high">Precio: Mayor a menor</SelectItem>
                <SelectItem value="newest">Más recientes</SelectItem>
                <SelectItem value="area">Tamaño</SelectItem>
              </SelectContent>
            </Select>
            
            <Button variant="outline">
              <SlidersHorizontal className="h-4 w-4 mr-2" />
              Filtros
            </Button>
          </div>
        </div>
        
        {/* Properties Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {properties.map((property) => (
            <PropertyCard
              key={property.id}
              property={property}
            />
          ))}
        </div>
        
        {/* No results */}
        {properties.length === 0 && !isLoading && (
          <div className="text-center py-12">
            <Filter className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">
              No se encontraron propiedades
            </h3>
            <p className="text-muted-foreground">
              Intenta con otros términos de búsqueda o ajusta los filtros
            </p>
          </div>
        )}
      </div>
    </div>
  );
};