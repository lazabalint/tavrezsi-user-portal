import { useState } from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Property, PropertyTenant, User } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useLocation, useSearch } from "wouter";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/use-auth";
import { Users, Plus, Trash2, Calendar } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

// Schema for adding a new tenant to a property
const addTenantSchema = z.object({
  propertyId: z.coerce.number().positive(),
  tenantId: z.coerce.number().positive("Kötelező egy bérlőt választani"),
  isActive: z.boolean().default(true)
});

export default function TenantsPage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const search = useSearch();
  const searchParams = new URLSearchParams(search);
  const propertyIdParam = searchParams.get('propertyId');
  
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>(propertyIdParam || "");
  const [showAddTenantDialog, setShowAddTenantDialog] = useState(false);
  const [tenantToDelete, setTenantToDelete] = useState<number | null>(null);

  // Setup form
  const form = useForm<z.infer<typeof addTenantSchema>>({
    resolver: zodResolver(addTenantSchema),
    defaultValues: {
      propertyId: propertyIdParam ? parseInt(propertyIdParam) : 0,
      tenantId: 0,
      isActive: true
    },
  });

  // Check if user is owner or admin
  const canManageTenants = user?.role === 'admin' || user?.role === 'owner';

  // Fetch properties
  const { data: properties, isLoading: propertiesLoading } = useQuery<Property[]>({
    queryKey: ['/api/properties'],
    enabled: canManageTenants,
  });

  // Fetch tenants for selected property
  const { data: propertyTenants, isLoading: tenantsLoading } = useQuery<any[]>({
    queryKey: ['/api/property-tenants', selectedPropertyId ? `propertyId=${selectedPropertyId}` : null],
    enabled: !!selectedPropertyId && canManageTenants,
  });

  // Fetch all users with tenant role
  const { data: tenantUsers } = useQuery<User[]>({
    queryKey: ['/api/users', 'role=tenant'],
    enabled: canManageTenants && showAddTenantDialog,
  });

  // Add tenant mutation
  const addTenantMutation = useMutation({
    mutationFn: async (data: z.infer<typeof addTenantSchema>) => {
      const res = await apiRequest("POST", "/api/property-tenants", data);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Sikeres hozzáadás",
        description: "A bérlő sikeresen hozzáadva az ingatlanhoz",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/property-tenants'] });
      setShowAddTenantDialog(false);
      form.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Hiba történt",
        description: error.message || "Nem sikerült hozzáadni a bérlőt",
        variant: "destructive",
      });
    }
  });

  // Remove tenant mutation
  const removeTenantMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/property-tenants/${id}`);
    },
    onSuccess: () => {
      toast({
        title: "Sikeres törlés",
        description: "A bérlő sikeresen eltávolítva az ingatlanról",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/property-tenants'] });
      setTenantToDelete(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Hiba történt",
        description: error.message || "Nem sikerült eltávolítani a bérlőt",
        variant: "destructive",
      });
    }
  });

  const handlePropertyChange = (value: string) => {
    setSelectedPropertyId(value);
    // Update URL without reloading the page
    if (value) {
      setLocation(`/tenants?propertyId=${value}`, { replace: true });
      form.setValue('propertyId', parseInt(value));
    } else {
      setLocation('/tenants', { replace: true });
    }
  };

  const onAddTenant = (values: z.infer<typeof addTenantSchema>) => {
    addTenantMutation.mutate(values);
  };

  const handleRemoveTenant = (id: number) => {
    removeTenantMutation.mutate(id);
  };

  // Get selected property details
  const selectedProperty = selectedPropertyId 
    ? properties?.find(p => p.id.toString() === selectedPropertyId) 
    : null;

  // If not owner or admin, show access denied
  if (!canManageTenants) {
    return (
      <DashboardLayout title="Bérlők" description="Bérlők kezelése és áttekintése">
        <div className="bg-white p-8 rounded-lg text-center shadow-sm">
          <div className="mb-4 text-red-400">
            <Users className="w-16 h-16 mx-auto" />
          </div>
          <h3 className="text-xl font-medium mb-2">Hozzáférés megtagadva</h3>
          <p className="text-gray-500">Csak tulajdonosok és adminisztrátorok kezelhetik a bérlőket.</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Bérlők" description="Bérlők kezelése és áttekintése">
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
          {selectedPropertyId && (
            <Button onClick={() => setShowAddTenantDialog(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Bérlő hozzáadása
            </Button>
          )}
        </div>
      </div>

      {!selectedPropertyId ? (
        <div className="bg-white p-8 rounded-lg text-center shadow-sm">
          <div className="mb-4 text-gray-400">
            <Users className="w-16 h-16 mx-auto" />
          </div>
          <h3 className="text-xl font-medium mb-2">Válasszon ingatlant</h3>
          <p className="text-gray-500">A bérlők kezeléséhez először válassza ki az egyik ingatlanát a legördülő menüből.</p>
        </div>
      ) : tenantsLoading ? (
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-40" />
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      ) : propertyTenants && propertyTenants.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>{selectedProperty?.name} - Bérlők</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Bérlő neve</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Kezdés dátuma</TableHead>
                    <TableHead>Státusz</TableHead>
                    <TableHead className="text-right">Műveletek</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {propertyTenants.map((tenancy) => (
                    <TableRow key={tenancy.id}>
                      <TableCell className="font-medium">
                        {tenancy.tenant?.name || `#${tenancy.tenantId}`}
                      </TableCell>
                      <TableCell>
                        {tenancy.tenant?.email || '-'}
                      </TableCell>
                      <TableCell>
                        {format(new Date(tenancy.startDate), 'yyyy.MM.dd')}
                      </TableCell>
                      <TableCell>
                        {tenancy.isActive ? (
                          <Badge className="bg-green-100 text-green-800">Aktív</Badge>
                        ) : (
                          <Badge variant="outline" className="bg-gray-100 text-gray-800">Inaktív</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="text-red-500 hover:text-red-700 hover:bg-red-50"
                              onClick={() => setTenantToDelete(tenancy.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Biztosan eltávolítja a bérlőt?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Ez a művelet törli a bérlő kapcsolatát az ingatlannal.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Mégsem</AlertDialogCancel>
                              <AlertDialogAction
                                className="bg-red-600 hover:bg-red-700"
                                onClick={() => tenantToDelete && handleRemoveTenant(tenantToDelete)}
                                disabled={removeTenantMutation.isPending}
                              >
                                {removeTenantMutation.isPending ? "Törlés..." : "Törlés"}
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="bg-white p-8 rounded-lg text-center shadow-sm">
          <div className="mb-4 text-gray-400">
            <Users className="w-16 h-16 mx-auto" />
          </div>
          <h3 className="text-xl font-medium mb-2">Nincsenek bérlők</h3>
          <p className="text-gray-500 mb-4">A kiválasztott ingatlanhoz még nincsenek bérlők hozzárendelve.</p>
          <Button onClick={() => setShowAddTenantDialog(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Bérlő hozzáadása
          </Button>
        </div>
      )}
      
      {/* Add Tenant Dialog */}
      <Dialog open={showAddTenantDialog} onOpenChange={setShowAddTenantDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Bérlő hozzáadása</DialogTitle>
            <DialogDescription>
              {selectedProperty ? `${selectedProperty.name}, ${selectedProperty.address}` : 'Válasszon bérlőt az ingatlanhoz'}
            </DialogDescription>
          </DialogHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onAddTenant)} className="space-y-4">
              <FormField
                control={form.control}
                name="tenantId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Bérlő</FormLabel>
                    <FormControl>
                      <Select onValueChange={field.onChange} defaultValue={field.value.toString()}>
                        <SelectTrigger>
                          <SelectValue placeholder="Válasszon bérlőt" />
                        </SelectTrigger>
                        <SelectContent>
                          {tenantUsers?.map((tenant) => (
                            <SelectItem key={tenant.id} value={tenant.id.toString()}>
                              {tenant.name} ({tenant.email})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="propertyId"
                render={({ field }) => (
                  <FormItem className="hidden">
                    <FormControl>
                      <input type="hidden" {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />
              
              <DialogFooter>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setShowAddTenantDialog(false)}
                >
                  Mégsem
                </Button>
                <Button 
                  type="submit"
                  disabled={addTenantMutation.isPending}
                >
                  {addTenantMutation.isPending ? "Hozzáadás..." : "Hozzáadás"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
