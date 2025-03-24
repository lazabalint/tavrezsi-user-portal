import { useState } from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Property, User } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Link } from "wouter";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useAuth } from "@/hooks/use-auth";
import { Building2, Plus, Trash2, Users } from "lucide-react";

export default function PropertiesPage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [deletePropertyId, setDeletePropertyId] = useState<number | null>(null);

  // Fetch properties, with refetch on user change
  const { data: properties, isLoading } = useQuery<Property[]>({
    queryKey: ['/api/properties', user?.id, user?.role], // Include user in the key to refetch on user change
  });

  // Fetch users (for owners)
  const { data: owners } = useQuery<User[]>({
    queryKey: ['/api/users', 'role=owner'],
    enabled: user?.role === 'admin',
  });

  // Get owner name for a property
  const getOwnerName = (ownerId: number) => {
    if (!owners) return "Ismeretlen tulajdonos";
    const owner = owners.find(u => u.id === ownerId);
    return owner ? owner.name : "Ismeretlen tulajdonos";
  };

  // Delete property mutation
  const deletePropertyMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/properties/${id}`);
    },
    onSuccess: () => {
      toast({
        title: "Sikeres törlés",
        description: "Az ingatlan sikeresen törölve lett",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/properties'] }); // Also invalidate any user-specific queries
      queryClient.invalidateQueries({ queryKey: ['/api/properties', user?.id, user?.role] });
      setDeletePropertyId(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Hiba történt",
        description: error.message || "Nem sikerült törölni az ingatlant",
        variant: "destructive",
      });
    }
  });

  const handleDelete = (id: number) => {
    deletePropertyMutation.mutate(id);
  };

  return (
    <DashboardLayout title="Ingatlanok" description="Ingatlanok kezelése és áttekintése">
      <div className="mb-6 flex justify-between items-center">
        <h2 className="text-lg font-medium">Ingatlanok listája</h2>
        {(user?.role === 'admin' || user?.role === 'owner') && (
          <Button asChild>
            <Link href="/add-property">
              <Plus className="mr-2 h-4 w-4" />
              Új ingatlan
            </Link>
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
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
      ) : properties && properties.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {properties.map((property) => (
            <Card key={property.id} className="overflow-hidden">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <CardTitle className="text-lg">{property.name}</CardTitle>
                  {(user?.role === 'admin' || (user?.role === 'owner' && property.ownerId === user.id)) && (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-700 hover:bg-red-50"
                          onClick={() => setDeletePropertyId(property.id)}>
                          <Trash2 className="h-5 w-5" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Biztosan törölni szeretné?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Ez a művelet nem visszavonható. Az ingatlan és annak összes mérőórája törlésre kerül.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Mégsem</AlertDialogCancel>
                          <AlertDialogAction
                            className="bg-red-600 hover:bg-red-700"
                            onClick={() => deletePropertyId && handleDelete(deletePropertyId)}
                            disabled={deletePropertyMutation.isPending}
                          >
                            {deletePropertyMutation.isPending ? "Törlés..." : "Törlés"}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                </div>
                <CardDescription>{property.address}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {user?.role === 'admin' && (
                    <div className="flex items-center text-sm">
                      <Users className="h-4 w-4 mr-2 text-gray-500" />
                      <span className="font-medium">Tulajdonos:</span>
                      <span className="ml-1 px-2 py-0.5 bg-blue-100 text-blue-800 rounded-full text-xs">
                        {getOwnerName(property.ownerId)} (ID: {property.ownerId})
                      </span>
                    </div>
                  )}
                  <div className="flex items-center text-sm">
                    <Building2 className="h-4 w-4 mr-2 text-gray-500" />
                    <span>Azonosító: #{property.id}</span>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex gap-2">
                <Button variant="outline" asChild className="flex-1">
                  <Link href={`/meters?propertyId=${property.id}`}>
                    Mérőórák
                  </Link>
                </Button>
                {(user?.role === 'admin' || user?.role === 'owner') && (
                  <Button variant="outline" asChild className="flex-1">
                    <Link href={`/tenants?propertyId=${property.id}`}>
                      Bérlők
                    </Link>
                  </Button>
                )}
              </CardFooter>
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
          {(user?.role === 'admin' || user?.role === 'owner') && (
            <Button asChild>
              <Link href="/add-property">
                <Plus className="mr-2 h-4 w-4" />
                Új ingatlan hozzáadása
              </Link>
            </Button>
          )}
        </div>
      )}
    </DashboardLayout>
  );
}
