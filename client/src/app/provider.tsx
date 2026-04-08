import { Notifications } from "@/components/ui/notifications/notifications";
import { SidebarProvider } from "@/context/sidebar-context";
import { MutationCache, QueryCache, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "react-router-dom";
import { handleAppError, queryConfig } from "../lib/react-query";
import { router } from "./router";

const queryClient = new QueryClient({
  defaultOptions: queryConfig,
  queryCache: new QueryCache({
    onError: handleAppError,
  }),
  mutationCache: new MutationCache({
    onError: handleAppError,
  }),
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
