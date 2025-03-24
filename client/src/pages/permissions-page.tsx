import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { Shield, User, Building2, Users, Check, Key, UserCog } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Skeleton } from "@/components/ui/skeleton";
import { useLocation, useSearch } from "wouter";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { User as UserType, Property, PropertyTenant } from "@shared/schema";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function PermissionsPage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const search = useSearch();
  const searchParams = new URLSearchParams(search);
  const userIdParam = searchParams.get('userId');
  
  const [selectedUserId, setSelectedUserId] = useState<string>(userIdParam || "");
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>("");
  const [activeTab, setActiveTab] = useState("properties");

  // Check if user is admin
  const isAdmin = user?.role === 'admin';

  // Fetch users
  const { data: users, isLoading: usersLoading } = useQuery<UserType[]>({
    queryKey: ['/api/users'],
    enabled: isAdmin,
  });

  // Fetch properties 
  const { data: properties, isLoading: propertiesLoading } = useQuery<Property[]>({
    queryKey: ['/api/properties'],
    enabled: isAdmin,
  });

  // Fetch property-tenant relationships for the selected user or property
  const { data: propertyTenants, isLoading: propertyTenantsLoading } = useQuery<any[]>({
    queryKey: [
      '/api/property-tenants', 
      selectedPropertyId ? `propertyId=${selectedPropertyId}` : null
    ],
    enabled: !!selectedPropertyId && isAdmin,
  });

  // Add tenant to property mutation
  const addTenantMutation = useMutation({
    mutationFn: async ({ propertyId, tenantId }: { propertyId: number; tenantId: number }) => {
      const res = await apiRequest("POST", "/api/property-tenants", { 
        propertyId,
        tenantId,
        isActive: true
      });
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Hozzáférés biztosítva",
        description: "A felhasználó sikeresen hozzárendelve az ingatlanhoz",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/property-tenants'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Hiba történt",
        description: error.message || "Nem sikerült hozzárendelni a felhasználót",
        variant: "destructive",
      });
    }
  });

  // Remove tenant from property mutation
  const removeTenantMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/property-tenants/${id}`);
    },
    onSuccess: () => {
      toast({
        title: "Hozzáférés visszavonva",
        description: "A felhasználó hozzáférése sikeresen visszavonva",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/property-tenants'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Hiba történt",
        description: error.message || "Nem sikerült visszavonni a hozzáférést",
        variant: "destructive",
      });
    }
  });

  // Toggle tenant active status mutation
  const toggleTenantStatusMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: number; isActive: boolean }) => {
      await apiRequest("PATCH", `/api/property-tenants/${id}`, { isActive });
    },
    onSuccess: () => {
      toast({
        title: "Státusz frissítve",
        description: "A bérlő státusza sikeresen frissítve",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/property-tenants'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Hiba történt",
        description: error.message || "Nem sikerült frissíteni a státuszt",
        variant: "destructive",
      });
    }
  });

  const handleUserChange = (value: string) => {
    setSelectedUserId(value);
    
    // Update URL without reloading the page
    if (value) {
      setLocation(`/permissions?userId=${value}`, { replace: true });
    } else {
      setLocation('/permissions', { replace: true });
    }
  };

  const handlePropertyChange = (value: string) => {
    setSelectedPropertyId(value);
  };

  const handleAddTenant = (propertyId: number, tenantId: number) => {
    addTenantMutation.mutate({ propertyId, tenantId });
  };

  const handleRemoveTenant = (id: number) => {
    removeTenantMutation.mutate(id);
  };

  const handleToggleStatus = (id: number, currentStatus: boolean) => {
    toggleTenantStatusMutation.mutate({ id, isActive: !currentStatus });
  };

  // Get selected user details
  const selectedUser = selectedUserId 
    ? users?.find(u => u.id.toString() === selectedUserId) 
    : null;

  // Filter tenants for property view
  const getTenants = () => {
    if (!users) return [];
    return users.filter(u => u.role === 'tenant');
  };

  // Check if a user already has access to a property
  const hasAccess = (tenantId: number) => {
    if (!propertyTenants) return false;
    return propertyTenants.some(pt => pt.tenantId === tenantId && pt.isActive);
  };

  // Get tenant relationship ID by tenant ID
  const getTenantRelationshipId = (tenantId: number) => {
    if (!propertyTenants) return null;
    const relationship = propertyTenants.find(pt => pt.tenantId === tenantId);
    return relationship?.id || null;
  };

  // If not admin, show access denied
  if (!isAdmin) {
    return (
      <DashboardLayout title="Jogosultságkezelés" description="Felhasználói jogosultságok kezelése">
        <div className="bg-white p-8 rounded-lg text-center shadow-sm">
          <div className="mb-4 text-red-400">
            <Shield className="w-16 h-16 mx-auto" />
          </div>
          <h3 className="text-xl font-medium mb-2">Hozzáférés megtagadva</h3>
          <p className="text-gray-500">Ez az oldal csak adminisztrátorok számára érhető el.</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Jogosultságkezelés" description="Felhasználói jogosultságok kezelése">
      <Tabs defaultValue="properties" value={activeTab} onValueChange={setActiveTab} className="w-full mb-6">
        <TabsList className="grid w-full max-w-md grid-cols-2 mb-4">
          <TabsTrigger value="properties">Ingatlan szerint</TabsTrigger>
          <TabsTrigger value="users">Felhasználó szerint</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Property-based permission management */}
      <TabsContent value="properties" className="space-y-6">
        <div className="mb-6">
          <div className="w-full md:w-1/2 lg:w-1/3">
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

        {!selectedPropertyId ? (
          <div className="bg-white p-8 rounded-lg text-center shadow-sm">
            <div className="mb-4 text-gray-400">
              <Building2 className="w-16 h-16 mx-auto" />
            </div>
            <h3 className="text-xl font-medium mb-2">Válasszon ingatlant</h3>
            <p className="text-gray-500">A jogosultságok kezeléséhez először válasszon ki egy ingatlant.</p>
          </div>
        ) : propertyTenantsLoading || usersLoading ? (
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-40" />
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Bérlők hozzárendelése az ingatlanhoz</CardTitle>
              <CardDescription>
                Az alábbi felhasználók férhetnek hozzá a kiválasztott ingatlanhoz
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Felhasználó</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Hozzáférés</TableHead>
                      <TableHead>Aktív</TableHead>
                      <TableHead className="text-right">Műveletek</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {getTenants().map((tenant) => {
                      const hasAccessToProperty = hasAccess(tenant.id);
                      const relationshipId = getTenantRelationshipId(tenant.id);
                      const relationship = propertyTenants?.find(pt => pt.tenantId === tenant.id);

                      return (
                        <TableRow key={tenant.id}>
                          <TableCell className="font-medium">{tenant.name}</TableCell>
                          <TableCell>{tenant.email}</TableCell>
                          <TableCell>
                            {hasAccessToProperty ? (
                              <Badge className="bg-green-100 text-green-800">Van hozzáférés</Badge>
                            ) : (
                              <Badge variant="outline" className="bg-gray-100 text-gray-800">Nincs hozzáférés</Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            {relationship && (
                              <div className="flex items-center space-x-2">
                                <Switch 
                                  id={`tenant-status-${tenant.id}`} 
                                  checked={relationship.isActive} 
                                  onCheckedChange={() => handleToggleStatus(relationship.id, relationship.isActive)}
                                  disabled={toggleTenantStatusMutation.isPending}
                                />
                                <Label htmlFor={`tenant-status-${tenant.id}`}>
                                  {relationship.isActive ? "Aktív" : "Inaktív"}
                                </Label>
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            {hasAccessToProperty ? (
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="text-red-500 hover:text-red-700 hover:bg-red-50"
                                onClick={() => relationshipId && handleRemoveTenant(relationshipId)}
                                disabled={removeTenantMutation.isPending}
                              >
                                Hozzáférés visszavonása
                              </Button>
                            ) : (
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="text-green-500 hover:text-green-700 hover:bg-green-50"
                                onClick={() => handleAddTenant(parseInt(selectedPropertyId), tenant.id)}
                                disabled={addTenantMutation.isPending}
                              >
                                Hozzáférés biztosítása
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    {getTenants().length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-4 text-gray-500">
                          Nincsenek bérlők a rendszerben
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}
      </TabsContent>

      {/* User-based permission management */}
      <TabsContent value="users" className="space-y-6">
        <div className="mb-6">
          <div className="w-full md:w-1/2 lg:w-1/3">
            {usersLoading ? (
              <Skeleton className="h-10 w-full" />
            ) : (
              <Select value={selectedUserId} onValueChange={handleUserChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Válasszon felhasználót" />
                </SelectTrigger>
                <SelectContent>
                  {users?.map((user) => (
                    <SelectItem key={user.id} value={user.id.toString()}>
                      {user.name} ({user.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </div>

        {!selectedUserId ? (
          <div className="bg-white p-8 rounded-lg text-center shadow-sm">
            <div className="mb-4 text-gray-400">
              <User className="w-16 h-16 mx-auto" />
            </div>
            <h3 className="text-xl font-medium mb-2">Válasszon felhasználót</h3>
            <p className="text-gray-500">A jogosultságok kezeléséhez először válasszon ki egy felhasználót.</p>
          </div>
        ) : (
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle>{selectedUser?.name} jogosultságai</CardTitle>
                  <CardDescription>
                    Felhasználó: {selectedUser?.email} (#{selectedUser?.id})
                  </CardDescription>
                </div>
                <Badge 
                  className={
                    selectedUser?.role === 'admin' 
                      ? "bg-purple-100 text-purple-800" 
                      : selectedUser?.role === 'owner' 
                        ? "bg-blue-100 text-blue-800" 
                        : "bg-green-100 text-green-800"
                  }
                >
                  {selectedUser?.role === 'admin' ? "Adminisztrátor" : 
                   selectedUser?.role === 'owner' ? "Tulajdonos" : "Bérlő"}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              {selectedUser?.role === 'admin' ? (
                <div className="flex items-center justify-center p-6 bg-gray-50 rounded-lg">
                  <div className="text-center">
                    <UserCog className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                    <h3 className="text-xl font-medium mb-2">Adminisztrátori jogosultságok</h3>
                    <p className="text-gray-500">
                      Az adminisztrátorok teljes hozzáféréssel rendelkeznek az összes funkcióhoz
                    </p>
                  </div>
                </div>
              ) : selectedUser?.role === 'owner' ? (
                <div className="flex items-center justify-center p-6 bg-gray-50 rounded-lg">
                  <div className="text-center">
                    <Building2 className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                    <h3 className="text-xl font-medium mb-2">Tulajdonosi jogosultságok</h3>
                    <p className="text-gray-500">
                      A tulajdonosok kezelhetik saját ingatlanaikat és azok mérőóráit
                    </p>
                  </div>
                </div>
              ) : (
                <div>
                  <h3 className="text-lg font-medium mb-4">Hozzáférhető ingatlanok</h3>
                  {propertiesLoading ? (
                    <div className="space-y-3">
                      {[1, 2, 3].map((i) => (
                        <Skeleton key={i} className="h-12 w-full" />
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-md border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Ingatlan</TableHead>
                            <TableHead>Cím</TableHead>
                            <TableHead>Tulajdonos</TableHead>
                            <TableHead>Hozzáadva</TableHead>
                            <TableHead>Státusz</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {properties?.map((property) => {
                            const propertyTenant = propertyTenants?.find(
                              pt => pt.propertyId === property.id && pt.tenantId === selectedUser?.id
                            );
                            
                            if (!propertyTenant) return null;
                            
                            return (
                              <TableRow key={property.id}>
                                <TableCell className="font-medium">{property.name}</TableCell>
                                <TableCell>{property.address}</TableCell>
                                <TableCell>#{property.ownerId}</TableCell>
                                <TableCell>
                                  {propertyTenant.startDate && format(new Date(propertyTenant.startDate), 'yyyy.MM.dd')}
                                </TableCell>
                                <TableCell>
                                  {propertyTenant.isActive ? (
                                    <Badge className="bg-green-100 text-green-800">Aktív</Badge>
                                  ) : (
                                    <Badge variant="outline" className="bg-gray-100 text-gray-800">Inaktív</Badge>
                                  )}
                                </TableCell>
                              </TableRow>
                            );
                          })}
                          {!propertyTenants || propertyTenants.length === 0 && (
                            <TableRow>
                              <TableCell colSpan={5} className="text-center py-4 text-gray-500">
                                A felhasználónak nincs hozzárendelve ingatlan
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </TabsContent>
    </DashboardLayout>
  );
}
