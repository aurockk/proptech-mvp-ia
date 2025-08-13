import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin, Bed, Bath, Square, Heart } from "lucide-react";
import { useState } from "react";

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

interface PropertyCardProps {
  property: Property;
}

export const PropertyCard = ({ property }: PropertyCardProps) => {
  const [isFavorite, setIsFavorite] = useState(false);

  return (
    <Card className="overflow-hidden hover:shadow-property transition-all duration-300 group">
      <div className="relative">
        <img
          src={property.imageUrl}
          alt={property.title}
          className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300"
        />
        <Button
          variant="ghost"
          size="sm"
          className="absolute top-2 right-2 bg-white/80 hover:bg-white"
          onClick={() => setIsFavorite(!isFavorite)}
        >
          <Heart className={`h-4 w-4 ${isFavorite ? 'fill-red-500 text-red-500' : 'text-gray-600'}`} />
        </Button>
        {property.featured && (
          <Badge className="absolute top-2 left-2 bg-accent">
            Destacado
          </Badge>
        )}
        <Badge 
          variant="secondary" 
          className="absolute bottom-2 left-2 bg-white/90"
        >
          {property.type}
        </Badge>
      </div>
      
      <CardContent className="p-4">
        <div className="space-y-3">
          <div>
            <h3 className="font-semibold text-lg leading-tight line-clamp-2">
              {property.title}
            </h3>
            <div className="flex items-center text-muted-foreground text-sm mt-1">
              <MapPin className="h-3 w-3 mr-1" />
              {property.location}
            </div>
          </div>
          
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <div className="flex items-center space-x-4">
              <div className="flex items-center">
                <Bed className="h-4 w-4 mr-1" />
                {property.bedrooms}
              </div>
              <div className="flex items-center">
                <Bath className="h-4 w-4 mr-1" />
                {property.bathrooms}
              </div>
              <div className="flex items-center">
                <Square className="h-4 w-4 mr-1" />
                {property.area} m²
              </div>
            </div>
          </div>
          
          <div className="flex items-center justify-between pt-2 border-t">
            <div>
              <p className="text-2xl font-bold text-primary">
                {property.price}
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};