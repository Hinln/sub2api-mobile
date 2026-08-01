import { QueryClient } from '@tanstack/react-query';

import { ApiError } from '@/src/lib/admin-fetch';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error) => {
        if (failureCount >= 2) return false;
        if (error instanceof ApiError) return [429, 502, 503].includes(error.status);
        return error instanceof TypeError;
      },
      staleTime: 30_000,
      refetchOnWindowFocus: false,
    },
    mutations: { retry: false },
  },
});
