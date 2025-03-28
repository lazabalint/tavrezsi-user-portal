import { useState, useEffect } from "react";
import { useAuth, loginSchema } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Redirect } from "wouter";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose
} from "@/components/ui/dialog";
import { apiRequest } from "@/lib/queryClient";

// Jelszó-visszaállítási schema
const passwordResetSchema = z.object({
  email: z.string().email({ message: "Érvényes email címet adjon meg" })
});

export default function AuthPage() {
  const { user, loginMutation } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<string>("login");
  const [resetPasswordLoading, setResetPasswordLoading] = useState(false);
  
  // Jelszó-visszaállító form
  const resetPasswordForm = useForm<z.infer<typeof passwordResetSchema>>({
    resolver: zodResolver(passwordResetSchema),
    defaultValues: {
      email: "",
    },
  });

  // Login form
  const loginForm = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });
  
  // Redirect if already logged in
  if (user) {
    return <Redirect to="/" />;
  }

  const onLoginSubmit = (values: z.infer<typeof loginSchema>) => {
    loginMutation.mutate(values);
  };
  
  // Jelszó-visszaállítás kezelő függvény
  const onResetPasswordSubmit = async (values: z.infer<typeof passwordResetSchema>) => {
    try {
      setResetPasswordLoading(true);
      
      const response = await apiRequest(
        "POST",
        "/api/request-password-reset",
        values
      );
      
      toast({
        title: "Jelszó-visszaállítási kérelem elküldve",
        description: "Ha a megadott email regisztrálva van a rendszerben, hamarosan kap egy jelszó-visszaállító emailt.",
        variant: "default",
      });
      
      resetPasswordForm.reset();
    } catch (error) {
      toast({
        title: "Hiba történt",
        description: "Nem sikerült elküldeni a jelszó-visszaállítási kérelmet. Kérjük, próbálja újra.",
        variant: "destructive",
      });
    } finally {
      setResetPasswordLoading(false);
    }
  };

  // House with circle inside logo SVG
  const Logo = () => (
    <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center mx-auto">
      <svg viewBox="0 0 24 24" width="32" height="32" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" className="text-white">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
        <circle cx="12" cy="12" r="4"></circle>
      </svg>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row">
      {/* Left side - Auth form */}
      <div className="flex-1 flex flex-col justify-center items-center p-6">
        <div className="w-full max-w-md mx-auto">
          <div className="text-center mb-6">
            <Logo />
            <h1 className="text-2xl font-medium text-gray-900 mt-4">TávRezsi.hu</h1>
            <p className="text-gray-500 mt-2">Jelentkezzen be a távoli óraállás kezelő rendszerbe</p>
          </div>

          <Tabs defaultValue="login" value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-1 mb-4">
              <TabsTrigger value="login">Bejelentkezés</TabsTrigger>
            </TabsList>

            {/* Login Tab */}
            <TabsContent value="login">
              <Card>
                <Form {...loginForm}>
                  <form onSubmit={loginForm.handleSubmit(onLoginSubmit)}>
                    <CardContent className="space-y-4 pt-5">
                      <FormField
                        control={loginForm.control}
                        name="username"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Felhasználónév</FormLabel>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={loginForm.control}
                        name="password"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Jelszó</FormLabel>
                            <FormControl>
                              <Input type="password" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </CardContent>
                    <CardFooter className="flex-col">
                      <Button 
                        type="submit" 
                        className="w-full" 
                        disabled={loginMutation.isPending}
                      >
                        {loginMutation.isPending ? "Bejelentkezés..." : "Bejelentkezés"}
                      </Button>
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button 
                            type="button" 
                            variant="link" 
                            className="mt-2"
                          >
                            Elfelejtettem a jelszavam
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[425px]">
                          <DialogHeader>
                            <DialogTitle>Jelszó visszaállítása</DialogTitle>
                            <DialogDescription>
                              Kérjük, adja meg azt az e-mail címet, amelyet a fiókjához használt, és küldünk Önnek egy jelszó-visszaállító linket.
                            </DialogDescription>
                          </DialogHeader>
                          <Form {...resetPasswordForm}>
                            <form onSubmit={resetPasswordForm.handleSubmit(onResetPasswordSubmit)}>
                              <div className="grid gap-4 py-4">
                                <FormField
                                  control={resetPasswordForm.control}
                                  name="email"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Email cím</FormLabel>
                                      <FormControl>
                                        <Input type="email" placeholder="email@pelda.hu" {...field} />
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                              </div>
                              <DialogFooter>
                                <DialogClose asChild>
                                  <Button type="button" variant="outline">Mégsem</Button>
                                </DialogClose>
                                <Button type="submit" disabled={resetPasswordLoading}>
                                  {resetPasswordLoading ? "Küldés..." : "Jelszó-visszaállító link küldése"}
                                </Button>
                              </DialogFooter>
                            </form>
                          </Form>
                        </DialogContent>
                      </Dialog>
                    </CardFooter>
                  </form>
                </Form>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Right side - Hero/Info */}
      <div className="flex-1 bg-primary p-10 flex items-center justify-center hidden md:flex">
        <div className="max-w-xl text-white">
          <h2 className="text-3xl font-bold mb-6">Üdvözöljük a TávRezsi.hu rendszerben!</h2>
          <p className="text-lg mb-8">
            A TávRezsi.hu segítségével könnyedén nyomon követheti és kezelheti az ingatlanaihoz tartozó mérőóra-állásokat,
            leolvasásokat, és korrekciókat kérhet, ha szükséges.
          </p>
          <div className="space-y-4">
            <div className="flex items-start">
              <div className="bg-white bg-opacity-20 p-2 rounded-full mr-4">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
              </div>
              <div>
                <h3 className="text-xl font-semibold mb-1">Távoli leolvasások</h3>
                <p>Automatikusan gyűjtött adatok az IoT eszközökről</p>
              </div>
            </div>
            <div className="flex items-start">
              <div className="bg-white bg-opacity-20 p-2 rounded-full mr-4">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"></path>
                </svg>
              </div>
              <div>
                <h3 className="text-xl font-semibold mb-1">Részletes riportok</h3>
                <p>Elemezze fogyasztási adatait részletes grafikonokkal</p>
              </div>
            </div>
            <div className="flex items-start">
              <div className="bg-white bg-opacity-20 p-2 rounded-full mr-4">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path>
                </svg>
              </div>
              <div>
                <h3 className="text-xl font-semibold mb-1">Bérlők kezelése</h3>
                <p>Az ingatlanban lakó bérlőknek is hozzáférést adhat az óraállások ellenőrzéséhez</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
