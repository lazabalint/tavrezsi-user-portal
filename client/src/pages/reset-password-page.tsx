import { useState, useEffect } from "react";
import { z } from "zod";
import { useLocation, useSearch, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { apiRequest } from "@/lib/queryClient";

// Jelszó-visszaállítási schema
const resetPasswordSchema = z.object({
  newPassword: z.string()
    .min(8, { message: "A jelszónak legalább 8 karakter hosszúnak kell lennie" })
    .regex(/[a-z]/, { message: "A jelszónak tartalmaznia kell legalább egy kisbetűt" })
    .regex(/[A-Z]/, { message: "A jelszónak tartalmaznia kell legalább egy nagybetűt" })
    .regex(/[0-9]/, { message: "A jelszónak tartalmaznia kell legalább egy számot" }),
  confirmPassword: z.string()
}).refine(data => data.newPassword === data.confirmPassword, {
  message: "A jelszavak nem egyeznek",
  path: ["confirmPassword"]
});

export default function ResetPasswordPage() {
  const [, setLocation] = useLocation();
  const search = useSearch();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [token, setToken] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    // Parse URL parameters
    const params = new URLSearchParams(search);
    const tokenParam = params.get("token");

    console.log("Token paraméter:", tokenParam);

    if (!tokenParam) {
      toast({
        title: "Érvénytelen link",
        description: "A jelszó-visszaállító link érvénytelen vagy lejárt.",
        variant: "destructive",
      });
      // Redirect to login after a short delay
      setTimeout(() => {
        setLocation("/auth");
      }, 3000);
      return;
    }

    setToken(tokenParam);
    console.log("Token beállítva:", tokenParam);
  }, [search, toast, setLocation]);

  const form = useForm<z.infer<typeof resetPasswordSchema>>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      newPassword: "",
      confirmPassword: "",
    },
  });

  const onSubmit = async (values: z.infer<typeof resetPasswordSchema>) => {
    try {
      setLoading(true);
      console.log("Jelszó beküldése tokennel:", token);
      
      // Javított API kérés - az apiRequest sorrendje: url, method, data 
      await apiRequest(
        "/api/reset-password", 
        "POST",
        {
          token,
          newPassword: values.newPassword,
        }
      );
      
      console.log("Jelszó frissítése sikeres");
      setIsSuccess(true);
      toast({
        title: "Jelszó sikeresen frissítve",
        description: "Bejelentkezhet az új jelszavával.",
        variant: "default",
      });
      
      // Redirect to login after a short delay
      setTimeout(() => {
        setLocation("/auth");
      }, 3000);
    } catch (error) {
      console.error("Jelszó frissítési hiba:", error);
      toast({
        title: "Hiba történt",
        description: error instanceof Error ? error.message : "Nem sikerült frissíteni a jelszót. A link érvénytelen vagy lejárt.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Logo
  const Logo = () => (
    <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center mx-auto">
      <svg viewBox="0 0 24 24" width="32" height="32" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" className="text-white">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
        <circle cx="12" cy="12" r="4"></circle>
      </svg>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center items-center p-6">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <Logo />
          <h1 className="text-2xl font-medium text-gray-900 mt-4">TávRezsi.hu</h1>
          <p className="text-gray-500 mt-2">Jelszó visszaállítása</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Új jelszó beállítása</CardTitle>
            <CardDescription>
              {isSuccess 
                ? "A jelszava sikeresen frissítve lett. Átirányítjuk a bejelentkezési oldalra..." 
                : "Kérjük, adjon meg egy új jelszót a fiókjához."}
            </CardDescription>
          </CardHeader>
          {!isSuccess && (
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)}>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="newPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Új jelszó</FormLabel>
                        <FormControl>
                          <Input type="password" placeholder="••••••••" {...field} />
                        </FormControl>
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
                          <Input type="password" placeholder="••••••••" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
                
                <CardFooter className="flex justify-between">
                  <Button 
                    type="button" 
                    variant="outline"
                    onClick={() => setLocation("/auth")}
                  >
                    Vissza a bejelentkezéshez
                  </Button>
                  <Button type="submit" disabled={loading}>
                    {loading ? "Feldolgozás..." : "Jelszó frissítése"}
                  </Button>
                </CardFooter>
              </form>
            </Form>
          )}
          
          {isSuccess && (
            <CardFooter>
              <Button 
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => setLocation("/auth")}
              >
                Vissza a bejelentkezéshez
              </Button>
            </CardFooter>
          )}
        </Card>
      </div>
    </div>
  );
}