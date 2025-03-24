import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    let errorText;
    try {
      const errorData = await res.json();
      errorText = errorData.message || res.statusText;
    } catch (e) {
      errorText = await res.text() || res.statusText;
    }
    console.error(`API error ${res.status}:`, errorText);
    throw new Error(`${res.status}: ${errorText}`);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  // Log the request without sensitive information
  const logSafeData = data ? safeLogData(data) : '(no data)';
  console.log(`API Request: ${method} ${url}`, logSafeData);
  
  try {
    const res = await fetch(url, {
      method,
      headers: data ? { "Content-Type": "application/json" } : {},
      body: data ? JSON.stringify(data) : undefined,
      credentials: "include",
    });

    await throwIfResNotOk(res);
    return res;
  } catch (error) {
    console.error(`API Request failed: ${method} ${url}`, error);
    throw error;
  }
}

// Helper function to sanitize sensitive data for logging
function safeLogData(data: any): any {
  if (!data) return data;
  
  // Create a shallow copy of the data
  const sanitized = { ...data };
  
  // Remove sensitive fields
  if (sanitized.password !== undefined) sanitized.password = '********';
  if (sanitized.newPassword !== undefined) sanitized.newPassword = '********';
  if (sanitized.confirmPassword !== undefined) sanitized.confirmPassword = '********';
  if (sanitized.token !== undefined) sanitized.token = '********';
  
  return sanitized;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const res = await fetch(queryKey[0] as string, {
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: 0, // Minimális staleTime, hogy a query mindig újra futhasson authentikációs váltásnál
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
