import { createContext, ReactNode, useContext } from "react";
import {
  useQuery,
  useMutation,
  UseMutationResult,
} from "@tanstack/react-query";
import { insertUserSchema, User } from "@shared/schema";
import { getQueryFn, apiRequest, queryClient } from "../lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";

// Remove password from User type for client-side use
type SafeUser = Omit<User, "password">;

type AuthContextType = {
  user: SafeUser | null;
  isLoading: boolean;
  error: Error | null;
  loginMutation: UseMutationResult<SafeUser, Error, LoginData>;
  logoutMutation: UseMutationResult<void, Error, void>;
  registerMutation: UseMutationResult<SafeUser, Error, RegisterData>;
};

const loginSchema = z.object({
  username: z.string().min(1, "Felhasználónév megadása kötelező"),
  password: z.string().min(1, "Jelszó megadása kötelező"),
});

const registerSchema = insertUserSchema.extend({
  confirmPassword: z.string().min(1, "Jelszó megerősítése kötelező"),
}).refine(data => data.password === data.confirmPassword, {
  message: "A jelszavak nem egyeznek",
  path: ["confirmPassword"]
});

type LoginData = z.infer<typeof loginSchema>;
type RegisterData = z.infer<typeof registerSchema>;

export const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  const {
    data: user,
    error,
    isLoading,
  } = useQuery<SafeUser | null, Error>({
    queryKey: ["/api/user"],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });

  const loginMutation = useMutation({
    mutationFn: async (credentials: LoginData) => {
      const res = await apiRequest("/api/login", "POST", credentials);
      return await res.json();
    },
    onSuccess: (user: SafeUser) => {
      // Reset entire cache to prevent data leakage between users
      queryClient.clear();
      // Then set the new user data
      queryClient.setQueryData(["/api/user"], user);
      toast({
        title: "Sikeres bejelentkezés",
        description: `Üdvözöljük, ${user.name}!`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Sikertelen bejelentkezés",
        description: error.message || "Hibás felhasználónév vagy jelszó",
        variant: "destructive",
      });
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (data: RegisterData) => {
      // Remove confirmPassword before sending to server
      const { confirmPassword, ...credentials } = data;
      const res = await apiRequest("/api/register", "POST", credentials);
      return await res.json();
    },
    onSuccess: (user: SafeUser) => {
      // Reset entire cache to prevent data leakage between users
      queryClient.clear();
      // Then set the new user data
      queryClient.setQueryData(["/api/user"], user);
      toast({
        title: "Sikeres regisztráció",
        description: `Üdvözöljük, ${user.name}!`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Sikertelen regisztráció",
        description: error.message || "Nem sikerült létrehozni a fiókot",
        variant: "destructive",
      });
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("/api/logout", "POST");
    },
    onSuccess: () => {
      // Reset entire cache to prevent data leakage between users
      queryClient.clear();
      // Then set the user data to null
      queryClient.setQueryData(["/api/user"], null);
      toast({
        title: "Sikeres kijelentkezés",
        description: "Viszlát!",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Sikertelen kijelentkezés",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return (
    <AuthContext.Provider
      value={{
        user: user || null,
        isLoading,
        error,
        loginMutation,
        logoutMutation,
        registerMutation,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

// Validation schemas export for form validation
export { loginSchema, registerSchema };
