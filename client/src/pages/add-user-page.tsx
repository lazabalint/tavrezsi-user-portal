import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { Shield, Users } from "lucide-react";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useLocation } from "wouter";

// Schema for adding a new user
const addUserSchema = z.object({
  username: z.string().min(3, "A felhasználónév legalább 3 karakter hosszú legyen"),
  email: z.string().email("Érvénytelen email cím"),
  name: z.string().min(2, "A név legalább 2 karakter hosszú legyen"),
  password: z.string().min(8, "A jelszó legalább 8 karakter hosszú legyen"),
  confirmPassword: z.string(),
  role: z.enum(["admin", "owner", "tenant"], {
    required_error: "Kötelező szerepkört választani",
  }),
}).refine(data => data.password === data.confirmPassword, {
  message: "A jelszavak nem egyeznek",
  path: ["confirmPassword"]
});

export default function AddUserPage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  // Check if user is admin
  const isAdmin = user?.role === 'admin';

  // Setup form
  const form = useForm<z.infer<typeof addUserSchema>>({
    resolver: zodResolver(addUserSchema),
    defaultValues: {
      username: "",
      email: "",
      name: "",
      password: "",
      confirmPassword: "",
      role: "tenant",
    },
  });

  // Add user mutation
  const addUserMutation = useMutation({
    mutationFn: async (values: z.infer<typeof addUserSchema>) => {
      // Remove confirmPassword before sending
      const { confirmPassword, ...userData } = values;
      const res = await apiRequest("POST", "/api/users", userData);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Sikeres létrehozás",
        description: "A felhasználó sikeresen létrehozva",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      setLocation('/users');
    },
    onError: (error: Error) => {
      toast({
        title: "Hiba történt",
        description: error.message || "Nem sikerült létrehozni a felhasználót",
        variant: "destructive",
      });
    }
  });

  const onSubmit = (values: z.infer<typeof addUserSchema>) => {
    addUserMutation.mutate(values);
  };

  // If not admin, show access denied
  if (!isAdmin) {
    return (
      <DashboardLayout title="Új felhasználó" description="Új felhasználó létrehozása">
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
    <DashboardLayout title="Új felhasználó" description="Új felhasználó létrehozása">
      <div className="max-w-3xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>Új felhasználó létrehozása</CardTitle>
            <CardDescription>
              Töltse ki az alábbi űrlapot egy új felhasználó létrehozásához a rendszerben.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="username"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Felhasználónév</FormLabel>
                        <FormControl>
                          <Input placeholder="felhasznalo" {...field} />
                        </FormControl>
                        <FormDescription>
                          A bejelentkezéshez használt egyedi azonosító
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email cím</FormLabel>
                        <FormControl>
                          <Input type="email" placeholder="email@example.com" {...field} />
                        </FormControl>
                        <FormDescription>
                          A felhasználó email címe
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Teljes név</FormLabel>
                        <FormControl>
                          <Input placeholder="Példa Péter" {...field} />
                        </FormControl>
                        <FormDescription>
                          A felhasználó megjelenített neve
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="role"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Szerepkör</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Válasszon szerepkört" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="admin">Adminisztrátor</SelectItem>
                            <SelectItem value="owner">Tulajdonos</SelectItem>
                            <SelectItem value="tenant">Bérlő</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          A felhasználó jogosultságai
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Jelszó</FormLabel>
                        <FormControl>
                          <Input type="password" {...field} />
                        </FormControl>
                        <FormDescription>
                          Minimum 8 karakter
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="confirmPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Jelszó megerősítése</FormLabel>
                        <FormControl>
                          <Input type="password" {...field} />
                        </FormControl>
                        <FormDescription>
                          Adja meg újra a jelszót
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
                    onClick={() => setLocation('/users')}
                  >
                    Mégsem
                  </Button>
                  <Button 
                    type="submit"
                    disabled={addUserMutation.isPending}
                  >
                    {addUserMutation.isPending ? "Létrehozás..." : "Létrehozás"}
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
