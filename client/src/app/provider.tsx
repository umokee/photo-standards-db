import { Notifications } from "@/components/ui/notifications/notifications";
import { SidebarProvider } from "@/context/sidebar-context";
import { ApiError } from "@/lib/api-client";
import { MutationCache, QueryCache, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "react-router-dom";
import { notifyError, queryConfig } from "../lib/react-query";
import { router } from "./router";

const handleError = (error: Error) => {
  const message = error instanceof ApiError ? error.message : "Неизвестная ошибка";
  notifyError(message);
};

const queryClient = new QueryClient({
  defaultOptions: queryConfig,
  queryCache: new QueryCache({ onError: handleError }),
  mutationCache: new MutationCache({ onError: handleError }),
});

export default function AppProvider() {
  return (
    <>
      <QueryClientProvider client={queryClient}>
        <SidebarProvider>
          <RouterProvider router={router} />
        </SidebarProvider>
        <Notifications />
      </QueryClientProvider>
    </>
  );
}
