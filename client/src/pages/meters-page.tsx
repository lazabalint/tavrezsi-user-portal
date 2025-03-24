import { useState } from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Property, Meter } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Link, useLocation, useSearch } from "wouter";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useAuth } from "@/hooks/use-auth";
import { Gauge, Plus, Trash2, History, Pencil, BarChart2 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { CorrectionModal } from "@/components/modals/correction-modal";

export default function MetersPage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const search = useSearch();
  const searchParams = new URLSearchParams(search);
  const propertyIdParam = searchParams.get('propertyId');
  
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>(propertyIdParam || "");
  const [deleteMeterId, setDeleteMeterId] = useState<number | null>(null);
  const [selectedMeter, setSelectedMeter] = useState<Meter | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Fetch properties with correct user permissions
  const { data: properties, isLoading: propertiesLoading } = useQuery<Property[]>({
    queryKey: ['/api/properties', user?.id, user?.role],
    enabled: !!user,
  });

  // Fetch meters for selected property - backend will filter based on user permissions
  const { data: meters, isLoading: metersLoading } = useQuery<Meter[]>({
    queryKey: ['/api/meters', selectedPropertyId, user?.id, user?.role],
    enabled: !!user, // Enable for all authenticated users
  });

  // Delete meter mutation
  const deleteMeterMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/meters/${id}`);
    },
    onSuccess: () => {
      toast({
        title: "Sikeres törlés",
        description: "A mérőóra sikeresen törölve lett",
      });
      // Invalidate all meter queries with any parameters
      queryClient.invalidateQueries({ queryKey: ['/api/meters'] });
      // Specifically invalidate the current user's meter queries
      queryClient.invalidateQueries({ 
        queryKey: ['/api/meters', selectedPropertyId, user?.id, user?.role]
      });
      setDeleteMeterId(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Hiba történt",
        description: error.message || "Nem sikerült törölni a mérőórát",
        variant: "destructive",
      });
    }
  });

  const handleDelete = (id: number) => {
    deleteMeterMutation.mutate(id);
  };

  const handlePropertyChange = (value: string) => {
    setSelectedPropertyId(value);
    // Update URL without reloading the page
    if (value) {
      setLocation(`/meters?propertyId=${value}`, { replace: true });
    } else {
      setLocation('/meters', { replace: true });
    }
  };

  const handleRequestCorrection = (meter: Meter) => {
    setSelectedMeter(meter);
    setIsModalOpen(true);
  };

  // Map meter type to display name and color
  const getMeterTypeInfo = (type: string) => {
    const typeMap: Record<string, { label: string, color: string }> = {
      electricity: { label: 'Villanyóra', color: 'bg-blue-100 text-blue-800' },
      gas: { label: 'Gázóra', color: 'bg-orange-100 text-orange-800' },
      water: { label: 'Vízóra', color: 'bg-cyan-100 text-cyan-800' },
      other: { label: 'Egyéb mérő', color: 'bg-gray-100 text-gray-800' }
    };
    return typeMap[type] || typeMap.other;
  };

  // Get selected property details
  const selectedProperty = selectedPropertyId 
    ? properties?.find(p => p.id.toString() === selectedPropertyId) 
    : null;

  return (
    <DashboardLayout title="Órák" description="Órák kezelése">
      <div className="space-y-4">
        {user?.role === 'admin' && (
          <div className="flex justify-end">
            <Button onClick={() => setLocation('/add-meter')}>
              <Plus className="w-4 h-4 mr-2" />
              Új óra
            </Button>
          </div>
        )}
        <div className="mb-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
            <div className="w-full md:w-1/3">
              {propertiesLoading ? (
                <Skeleton className="h-10 w-full" />
              ) : (
                <Select value={selectedPropertyId} onValueChange={handlePropertyChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Válasszon ingatlant" />
                  </SelectTrigger>
                  <SelectContent>
                    {properties?.map((property) => (
                      <SelectItem key={property.id} value={property.id.toString()}>
                        {property.name}, {property.address}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>
        </div>
      </div>

      {!selectedPropertyId ? (
        <div className="bg-white p-8 rounded-lg text-center shadow-sm">
          <div className="mb-4 text-gray-400">
            <Gauge className="w-16 h-16 mx-auto" />
          </div>
          <h3 className="text-xl font-medium mb-2">Válasszon ingatlant</h3>
          <p className="text-gray-500">A mérőórák megtekintéséhez először válassza ki az egyik ingatlanát a legördülő menüből.</p>
        </div>
      ) : metersLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="overflow-hidden">
              <CardHeader className="pb-3">
                <Skeleton className="h-6 w-4/5 mb-2" />
                <Skeleton className="h-4 w-3/5" />
              </CardHeader>
              <CardContent className="pb-3">
                <div className="space-y-3">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-4/5" />
                  <Skeleton className="h-4 w-2/3" />
                </div>
              </CardContent>
              <CardFooter>
                <Skeleton className="h-9 w-full" />
              </CardFooter>
            </Card>
          ))}
        </div>
      ) : meters && meters.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {meters.map((meter) => {
            const typeInfo = getMeterTypeInfo(meter.type);
            
            return (
              <Card key={meter.id} className="overflow-hidden">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg">{meter.name}</CardTitle>
                      <Badge className={`mt-2 ${typeInfo.color}`}>{typeInfo.label}</Badge>
                    </div>
                    {(user?.role === 'admin' || user?.role === 'owner') && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-700 hover:bg-red-50"
                            onClick={() => setDeleteMeterId(meter.id)}>
                            <Trash2 className="h-5 w-5" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Biztosan törölni szeretné?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Ez a művelet nem visszavonható. A mérőóra és annak összes leolvasása törlésre kerül.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Mégsem</AlertDialogCancel>
                            <AlertDialogAction
                              className="bg-red-600 hover:bg-red-700"
                              onClick={() => deleteMeterId && handleDelete(deleteMeterId)}
                              disabled={deleteMeterMutation.isPending}
                            >
                              {deleteMeterMutation.isPending ? "Törlés..." : "Törlés"}
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Azonosító:</span>
                      <span className="font-medium">{meter.identifier}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Mértékegység:</span>
                      <span className="font-medium">{meter.unit}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Következő hitelesítés:</span>
                      <span className="font-medium">
                        {meter.nextCertification 
                          ? new Date(meter.nextCertification).toLocaleDateString('hu-HU')
                          : 'Nincs beállítva'}
                      </span>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="flex flex-wrap gap-2">
                  <Button variant="outline" size="sm" asChild className="flex-1">
                    <Link href={`/readings?meterId=${meter.id}`}>
                      <History className="mr-1 h-4 w-4" />
                      Leolvasások
                    </Link>
                  </Button>
                  <Button variant="outline" size="sm" className="flex-1" onClick={() => handleRequestCorrection(meter)}>
                    <Pencil className="mr-1 h-4 w-4" />
                    Korrekció
                  </Button>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      ) : (
        <div className="bg-white p-8 rounded-lg text-center shadow-sm">
          <div className="mb-4 text-gray-400">
            <Gauge className="w-16 h-16 mx-auto" />
          </div>
          <h3 className="text-xl font-medium mb-2">Nincsenek mérőórák</h3>
          <p className="text-gray-500 mb-4">A kiválasztott ingatlanhoz még nincsenek mérőórák hozzárendelve.</p>
          {(user?.role === 'admin' || user?.role === 'owner') && (
            <Button asChild>
              <Link href="/add-meter">
                <Plus className="mr-2 h-4 w-4" />
                Új mérőóra hozzáadása
              </Link>
            </Button>
          )}
        </div>
      )}
      
      {/* Correction Request Modal */}
      <CorrectionModal
        selectedMeter={selectedMeter}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </DashboardLayout>
  );
}
