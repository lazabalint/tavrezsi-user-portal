import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Meter, Property } from "@shared/schema";
import { MeterCard } from "@/components/ui/meter-card";
import { CorrectionModal } from "@/components/modals/correction-modal";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Plus, ArrowDown, ArrowUp, Check, AlertTriangle, AlertCircle, Home, Settings, Building2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";

export default function DashboardPage() {
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>("");
  const [selectedMeter, setSelectedMeter] = useState<Meter | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Fetch properties
  const { data: properties, isLoading: propertiesLoading } = useQuery<Property[]>({
    queryKey: ['/api/properties'],
  });

  // Fetch meters for selected property
  const { data: meters, isLoading: metersLoading } = useQuery<Meter[]>({
    queryKey: ['/api/meters', selectedPropertyId ? `propertyId=${selectedPropertyId}` : null],
    enabled: !!selectedPropertyId,
  });

  // Handle property selection
  const handlePropertyChange = (value: string) => {
    setSelectedPropertyId(value);
  };

  // Handle correction request
  const handleRequestCorrection = (meter: Meter) => {
    setSelectedMeter(meter);
    setIsModalOpen(true);
  };

  // Get selected property details
  const selectedProperty = selectedPropertyId 
    ? properties?.find(p => p.id.toString() === selectedPropertyId) 
    : null;

  return (
    <DashboardLayout
      title="Irányítópult"
      description="Üdvözöljük a TávRezsi rendszerben. Itt láthatja az óraállásokat és kezelhet minden kapcsolódó adatot."
    >
      {/* Property Cards Section */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-medium">Ingatlanok</h2>
          <Button asChild>
            <Link href="/properties">
              <Settings className="mr-2 h-4 w-4" />
              Ingatlanok kezelése
            </Link>
          </Button>
        </div>
        
        {propertiesLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="overflow-hidden cursor-pointer shadow-sm hover:shadow transition-shadow">
                <CardHeader className="pb-2">
                  <Skeleton className="h-6 w-4/5 mb-2" />
                  <Skeleton className="h-4 w-3/5" />
                </CardHeader>
                <CardContent className="pb-4">
                  <Skeleton className="h-4 w-full mb-2" />
                  <Skeleton className="h-4 w-4/5" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : properties && properties.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {properties.map((property) => (
              <Card 
                key={property.id} 
                className={`overflow-hidden cursor-pointer shadow-sm hover:shadow transition-shadow ${selectedPropertyId === property.id.toString() ? 'ring-2 ring-primary ring-offset-2' : ''}`}
                onClick={() => handlePropertyChange(property.id.toString())}
              >
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">{property.name}</CardTitle>
                  <CardDescription>{property.address}</CardDescription>
                </CardHeader>
                <CardContent className="pb-4">
                  <div className="flex items-center text-sm">
                    <Building2 className="h-4 w-4 mr-2 text-gray-500" />
                    <span>Azonosító: #{property.id}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="bg-white p-8 rounded-lg text-center shadow-sm">
            <div className="mb-4 text-gray-400">
              <Building2 className="w-16 h-16 mx-auto" />
            </div>
            <h3 className="text-xl font-medium mb-2">Nincsenek ingatlanok</h3>
            <p className="text-gray-500 mb-4">Még nem rendelkezik ingatlanokkal.</p>
            <Button asChild>
              <Link href="/add-property">
                <Plus className="mr-2 h-4 w-4" />
                Új ingatlan hozzáadása
              </Link>
            </Button>
          </div>
        )}
      </div>

      {/* Latest Readings Section */}
      <h2 className="text-lg font-medium mb-4">Legutóbbi leolvasások</h2>
      
      {!selectedPropertyId ? (
        <div className="bg-white p-8 rounded-lg text-center shadow-sm">
          <div className="mb-4 text-gray-400">
            <Building2 className="w-16 h-16 mx-auto" />
          </div>
          <h3 className="text-xl font-medium mb-2">Válasszon ingatlant</h3>
          <p className="text-gray-500">Az óraállások megtekintéséhez először válasszon ki egy ingatlant a fenti csempék közül.</p>
        </div>
      ) : metersLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="overflow-hidden">
              <CardHeader className="p-4">
                <Skeleton className="h-6 w-40" />
              </CardHeader>
              <CardContent className="p-4">
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-4 w-24" />
                  </div>
                  <div className="flex justify-between">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-4 w-20" />
                  </div>
                  <div className="flex justify-between">
                    <Skeleton className="h-8 w-28" />
                    <Skeleton className="h-6 w-24" />
                  </div>
                  <Skeleton className="h-[200px] w-full" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : meters && meters.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {meters.map((meter) => (
            <MeterCard
              key={meter.id}
              meter={meter}
              propertyAddress={selectedProperty?.address || ""}
              onRequestCorrection={handleRequestCorrection}
            />
          ))}
        </div>
      ) : (
        <div className="bg-white p-8 rounded-lg text-center shadow-sm">
          <div className="mb-4 text-gray-400">
            <AlertCircle className="w-16 h-16 mx-auto" />
          </div>
          <h3 className="text-xl font-medium mb-2">Nincsenek mérőórák</h3>
          <p className="text-gray-500 mb-4">A kiválasztott ingatlanhoz még nincsenek mérőórák hozzárendelve.</p>
          <Button asChild>
            <Link href="/add-meter">
              <Plus className="mr-2 h-4 w-4" />
              Új mérőóra hozzáadása
            </Link>
          </Button>
        </div>
      )}

      {/* Summary and Tasks Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Monthly Summary */}
        <Card className="shadow-sm">
          <CardHeader className="pb-3 border-b">
            <CardTitle>Havi összegzés</CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="mb-4">
              <div className="flex justify-between items-center mb-1">
                <span className="text-gray-500">Villany</span>
                <span className="font-medium">158 kWh</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-blue-500 h-2 rounded-full" style={{width: '65%'}}></div>
              </div>
            </div>
            <div className="mb-4">
              <div className="flex justify-between items-center mb-1">
                <span className="text-gray-500">Gáz</span>
                <span className="font-medium">42 m³</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-orange-500 h-2 rounded-full" style={{width: '30%'}}></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between items-center mb-1">
                <span className="text-gray-500">Víz</span>
                <span className="font-medium">6.2 m³</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-cyan-500 h-2 rounded-full" style={{width: '45%'}}></div>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="flex justify-between">
                <span className="text-gray-500">Változás előző hónaphoz</span>
                <span className="text-green-600 font-medium flex items-center">
                  <ArrowDown className="mr-1 h-4 w-4" />
                  8.3%
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* Pending Tasks */}
        <Card className="shadow-sm">
          <CardHeader className="pb-3 border-b">
            <CardTitle>Feladatok</CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <ul className="divide-y divide-gray-200">
              <li className="py-3 flex items-start">
                <AlertTriangle className="text-amber-500 mr-3 mt-0.5 h-5 w-5" />
                <div>
                  <p className="font-medium">Korrekciós kérelem elbírálása</p>
                  <p className="text-sm text-gray-500">Budapest, Kossuth u. 1. - Vízóra</p>
                </div>
              </li>
              <li className="py-3 flex items-start">
                <AlertCircle className="text-red-500 mr-3 mt-0.5 h-5 w-5" />
                <div>
                  <p className="font-medium">Lejárt hitelesítés</p>
                  <p className="text-sm text-gray-500">Debrecen, Petőfi u. 22. - Gázóra</p>
                </div>
              </li>
              <li className="py-3 flex items-start">
                <Check className="text-green-500 mr-3 mt-0.5 h-5 w-5" />
                <div>
                  <p className="font-medium">Sikeres leolvasás</p>
                  <p className="text-sm text-gray-500">Szeged, Árpád tér 5. - Minden mérőóra</p>
                </div>
              </li>
            </ul>
            <div className="mt-2 text-center">
              <Button variant="link" className="text-primary">
                Összes megtekintése
              </Button>
            </div>
          </CardContent>
        </Card>
        
        {/* Recently Added Properties */}
        <Card className="shadow-sm">
          <CardHeader className="pb-3 border-b">
            <CardTitle>Nemrég hozzáadott ingatlanok</CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <ul className="divide-y divide-gray-200">
              <li className="py-3">
                <div className="flex justify-between items-center">
                  <p className="font-medium">Budapest, Kossuth u. 1.</p>
                  <span className="text-xs text-gray-500">3 napja</span>
                </div>
                <p className="text-sm text-gray-500">3 mérőóra, 1 bérlő</p>
              </li>
              <li className="py-3">
                <div className="flex justify-between items-center">
                  <p className="font-medium">Debrecen, Petőfi u. 22.</p>
                  <span className="text-xs text-gray-500">1 hete</span>
                </div>
                <p className="text-sm text-gray-500">2 mérőóra, nincs bérlő</p>
              </li>
              <li className="py-3">
                <div className="flex justify-between items-center">
                  <p className="font-medium">Szeged, Árpád tér 5.</p>
                  <span className="text-xs text-gray-500">2 hete</span>
                </div>
                <p className="text-sm text-gray-500">4 mérőóra, 2 bérlő</p>
              </li>
            </ul>
            <div className="mt-2 text-center">
              <Button variant="link" className="text-primary" asChild>
                <Link href="/properties">
                  Összes megtekintése
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Correction Request Modal */}
      <CorrectionModal
        selectedMeter={selectedMeter}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </DashboardLayout>
  );
}
