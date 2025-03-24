import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { Gauge, Shield, Calendar } from "lucide-react";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useLocation } from "wouter";
import { Property } from "@shared/schema";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";

// Schema for adding a new meter
const addMeterSchema = z.object({
  name: z.string().min(2, "A név legalább 2 karakter hosszú legyen"),
  identifier: z.string().min(3, "Az azonosító legalább 3 karakter hosszú legyen"),
  type: z.enum(["electricity", "gas", "water", "other"], {
    required_error: "Kötelező típust választani",
  }),
  unit: z.string().min(1, "A mértékegység megadása kötelező"),
  propertyId: z.coerce.number().positive("Kötelező ingatlant választani"),
  lastCertified: z.date().optional(),
  nextCertification: z.date().optional(),
});

export default function AddMeterPage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  // Check if user can create meters (only admin)
  const canCreateMeter = user?.role === 'admin';

  // Fetch properties
  const { data: properties } = useQuery<Property[]>({
    queryKey: ['/api/properties'],
    enabled: canCreateMeter,
  });

  // Filter properties by owner if needed
  const filteredProperties = user?.role === 'owner' 
    ? properties?.filter(p => p.ownerId === user.id) 
    : properties;

  // Setup form
  const form = useForm<z.infer<typeof addMeterSchema>>({
    resolver: zodResolver(addMeterSchema),
    defaultValues: {
      name: "",
      identifier: "",
      type: "electricity",
      unit: "",
      propertyId: 0,
    },
  });

  // Set default unit based on type selection
  const typeValue = form.watch('type');
  if (typeValue === 'electricity' && !form.getValues('unit')) {
    form.setValue('unit', 'kWh');
  } else if (typeValue === 'gas' && !form.getValues('unit')) {
    form.setValue('unit', 'm³');
  } else if (typeValue === 'water' && !form.getValues('unit')) {
    form.setValue('unit', 'm³');
  }

  // Add meter mutation
  const addMeterMutation = useMutation({
    mutationFn: async (values: z.infer<typeof addMeterSchema>) => {
      const res = await apiRequest("POST", "/api/meters", values);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Sikeres létrehozás",
        description: "A mérőóra sikeresen létrehozva",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/meters'] });
      setLocation('/meters');
    },
    onError: (error: Error) => {
      toast({
        title: "Hiba történt",
        description: error.message || "Nem sikerült létrehozni a mérőórát",
        variant: "destructive",
      });
    }
  });

  const onSubmit = (values: z.infer<typeof addMeterSchema>) => {
    addMeterMutation.mutate(values);
  };

  // If not owner or admin, show access denied
  if (!canCreateMeter) {
    return (
      <DashboardLayout title="Új mérőóra" description="Új mérőóra létrehozása">
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
    <DashboardLayout title="Új mérőóra" description="Új mérőóra létrehozása">
      <div className="max-w-3xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>Új mérőóra létrehozása</CardTitle>
            <CardDescription>
              Töltse ki az alábbi űrlapot egy új mérőóra létrehozásához a rendszerben.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Mérőóra neve</FormLabel>
                        <FormControl>
                          <Input placeholder="Villanyóra" {...field} />
                        </FormControl>
                        <FormDescription>
                          A mérőóra azonosítására szolgáló név
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="identifier"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Azonosító</FormLabel>
                        <FormControl>
                          <Input placeholder="EL-12345678" {...field} />
                        </FormControl>
                        <FormDescription>
                          A mérő egyedi azonosítója
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Típus</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Válasszon típust" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="electricity">Villanyóra</SelectItem>
                            <SelectItem value="gas">Gázóra</SelectItem>
                            <SelectItem value="water">Vízóra</SelectItem>
                            <SelectItem value="other">Egyéb</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          A mérőóra típusa
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="unit"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Mértékegység</FormLabel>
                        <FormControl>
                          <Input placeholder="kWh, m³, stb." {...field} />
                        </FormControl>
                        <FormDescription>
                          A mérőóra által használt mértékegység
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="propertyId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Ingatlan</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value.toString()}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Válasszon ingatlant" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {filteredProperties?.map((property) => (
                              <SelectItem key={property.id} value={property.id.toString()}>
                                {property.name}, {property.address}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          Az ingatlan, amihez a mérőóra tartozik
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="lastCertified"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>Utolsó hitelesítés</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant={"outline"}
                                className={cn(
                                  "w-full pl-3 text-left font-normal",
                                  !field.value && "text-muted-foreground"
                                )}
                              >
                                {field.value ? (
                                  format(field.value, "yyyy.MM.dd")
                                ) : (
                                  <span>Válasszon dátumot</span>
                                )}
                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <CalendarComponent
                              mode="single"
                              selected={field.value}
                              onSelect={field.onChange}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                        <FormDescription>
                          Az utolsó hitelesítés dátuma (opcionális)
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="nextCertification"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>Következő hitelesítés</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant={"outline"}
                                className={cn(
                                  "w-full pl-3 text-left font-normal",
                                  !field.value && "text-muted-foreground"
                                )}
                              >
                                {field.value ? (
                                  format(field.value, "yyyy.MM.dd")
                                ) : (
                                  <span>Válasszon dátumot</span>
                                )}
                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <CalendarComponent
                              mode="single"
                              selected={field.value}
                              onSelect={field.onChange}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                        <FormDescription>
                          A következő hitelesítés dátuma (opcionális)
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <CardFooter className="px-0 flex justify-end gap-2">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setLocation('/meters')}
                  >
                    Mégsem
                  </Button>
                  <Button 
                    type="submit"
                    disabled={addMeterMutation.isPending}
                  >
                    {addMeterMutation.isPending ? "Létrehozás..." : "Létrehozás"}
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
