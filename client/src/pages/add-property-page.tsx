import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { Building2, User, Shield } from "lucide-react";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useLocation } from "wouter";
import { User as UserType } from "@shared/schema";

// Schema for adding a new property
const addPropertySchema = z.object({
  name: z.string().min(2, "A név legalább 2 karakter hosszú legyen"),
  address: z.string().min(5, "A cím legalább 5 karakter hosszú legyen"),
  ownerId: z.coerce.number().positive("Kötelező tulajdonost választani"),
});

export default function AddPropertyPage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  // Check if user can create properties (only admin)
  const canCreateProperty = user?.role === 'admin';

  // Fetch owners for admin to choose from
  const { data: owners } = useQuery<UserType[]>({
    queryKey: ['/api/users', 'role=owner'],
    enabled: user?.role === 'admin',
  });

  // Setup form
  const form = useForm<z.infer<typeof addPropertySchema>>({
    resolver: zodResolver(addPropertySchema),
    defaultValues: {
      name: "",
      address: "",
      ownerId: user?.role === 'owner' ? user.id : 0,
    },
  });

  // Add property mutation
  const addPropertyMutation = useMutation({
    mutationFn: async (values: z.infer<typeof addPropertySchema>) => {
      const res = await apiRequest("POST", "/api/properties", values);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Sikeres létrehozás",
        description: "Az ingatlan sikeresen létrehozva",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/properties'] });
      setLocation('/properties');
    },
    onError: (error: Error) => {
      toast({
        title: "Hiba történt",
        description: error.message || "Nem sikerült létrehozni az ingatlant",
        variant: "destructive",
      });
    }
  });

  const onSubmit = (values: z.infer<typeof addPropertySchema>) => {
    addPropertyMutation.mutate(values);
  };

  // If not owner or admin, show access denied
  if (!canCreateProperty) {
    return (
      <DashboardLayout title="Új ingatlan" description="Új ingatlan létrehozása">
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
    <DashboardLayout title="Új ingatlan" description="Új ingatlan létrehozása">
      <div className="max-w-3xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>Új ingatlan létrehozása</CardTitle>
            <CardDescription>
              Töltse ki az alábbi űrlapot egy új ingatlan létrehozásához a rendszerben.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Ingatlan neve</FormLabel>
                      <FormControl>
                        <Input placeholder="Lakás #1" {...field} />
                      </FormControl>
                      <FormDescription>
                        Az ingatlan azonosítására szolgáló rövid név
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cím</FormLabel>
                      <FormControl>
                        <Input placeholder="Budapest, Kossuth u. 1." {...field} />
                      </FormControl>
                      <FormDescription>
                        Az ingatlan teljes címe
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                {user?.role === 'admin' ? (
                  <FormField
                    control={form.control}
                    name="ownerId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tulajdonos</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value.toString()}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Válasszon tulajdonost" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {owners?.map((owner) => (
                              <SelectItem key={owner.id} value={owner.id.toString()}>
                                {owner.name} ({owner.email})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          Az ingatlan tulajdonosa
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                ) : (
                  <FormField
                    control={form.control}
                    name="ownerId"
                    render={({ field }) => (
                      <FormItem className="hidden">
                        <FormControl>
                          <input type="hidden" {...field} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                )}
                
                <CardFooter className="px-0 flex justify-end gap-2">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setLocation('/properties')}
                  >
                    Mégsem
                  </Button>
                  <Button 
                    type="submit"
                    disabled={addPropertyMutation.isPending}
                  >
                    {addPropertyMutation.isPending ? "Létrehozás..." : "Létrehozás"}
                  </Button>
                </CardFooter>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
