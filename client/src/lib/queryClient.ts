import { QueryClient, QueryFunction, MutationCache, QueryCache } from "@tanstack/react-query";

// Custom error class to handle database connection issues
class DatabaseConnectionError extends Error {
  status: number;
  isRetryable: boolean;
  
  constructor(message: string, status: number) {
    super(message);
    this.name = "DatabaseConnectionError";
    this.status = status;
    this.isRetryable = true;
  }
}

// Function to check if an error is related to database connectivity
function isDatabaseConnectionError(text: string, status: number): boolean {
  return (
    status === 503 || // Service Unavailable
    status === 500 || // Internal Server Error
    (typeof text === 'string' && text.includes("database") && text.includes("connection")) || 
    (typeof text === 'string' && text.includes("Error fetching user account")) ||
    (typeof text === 'string' && text.includes("Internal server error"))
  );
}

// Enhanced error handler with specific retry logic
async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    
    // Special handling for database connection errors
    if (isDatabaseConnectionError(text, res.status)) {
      throw new DatabaseConnectionError(`${res.status}: ${text}`, res.status);
    }
    
    throw new Error(`${res.status}: ${text}`);
  }
}

// Sleep utility for retries
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Enhanced API request with retry logic for database connection errors
export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
  retries = 3
): Promise<Response> {
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
    // If we have retries left and this is a database connection error, retry after a delay
    if (retries > 0 && error instanceof DatabaseConnectionError) {
      console.log(`Database connection error, retrying... (${retries} attempts left)`);
      
      // Exponential backoff: wait longer between each retry
      const delay = (4 - retries) * 1000; // 1s, 2s, 3s
      await sleep(delay);
      
      // Retry the request
      return apiRequest(method, url, data, retries - 1);
    }
    
    // Otherwise, rethrow the error
    throw error;
  }
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey, signal }) => {
    try {
      const res = await fetch(queryKey[0] as string, {
        credentials: "include",
        signal,
      });

      if (unauthorizedBehavior === "returnNull" && res.status === 401) {
        return null;
      }

      await throwIfResNotOk(res);
      return await res.json();
    } catch (error) {
      // Detect if this is a database connection error
      if (error instanceof DatabaseConnectionError) {
        console.log(`Database connection error in query function, will retry automatically`);
        // Let React Query's retry logic handle this
        throw error;
      }
      
      // For other errors, rethrow
      throw error;
    }
  };

// Function to determine if we should retry a query based on the error type
function shouldRetryQuery(failureCount: number, error: Error) {
  // Only retry for database connection errors
  if (error instanceof DatabaseConnectionError) {
    // Allow up to 3 retries (totalAttempts = 4)
    return failureCount < 3;
  }
  return false;
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: shouldRetryQuery,
      retryDelay: (attemptIndex) => Math.min(1000 * (2 ** attemptIndex), 30000), // exponential backoff
    },
    mutations: {
      retry: (failureCount, error) => {
        // Only retry for database connection errors
        if (error instanceof DatabaseConnectionError) {
          return failureCount < 3; // Allow up to 3 retries
        }
        return false;
      },
      retryDelay: (attemptIndex) => Math.min(1000 * (2 ** attemptIndex), 30000), // exponential backoff
    },
  },
  // Add global error handler to suppress abort errors during navigation
  mutationCache: new MutationCache({
    onError: (error) => {
      // Suppress AbortError logs as they're expected during navigation
      if (error?.name === 'AbortError') {
        return;
      }
      console.error('Mutation error:', error);
    },
  }),
  queryCache: new QueryCache({
    onError: (error) => {
      // Suppress AbortError logs as they're expected during navigation
      if (error?.name === 'AbortError') {
        return;
      }
      console.error('Query error:', error);
    },
  }),
});
