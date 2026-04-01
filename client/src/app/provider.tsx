import { Notifications } from "@/components/ui/notifications/notifications";
import { useNotificationStore } from "@/components/ui/notifications/notifications-store";
import { SidebarProvider } from "@/context/sidebar-context";
import { MutationCache, QueryCache, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "react-router-dom";
import { queryConfig } from "../lib/react-query";
import { router } from "./router";

const queryClient = new QueryClient({
  defaultOptions: queryConfig,
  queryCache: new QueryCache({
    onError: (error) => {
      useNotificationStore.getState().addNotification({
        type: "error",
        title: "Ошибка",
        message: (error as any).ApiError?.message ?? error.message,
      });
    },
  }),
  mutationCache: new MutationCache({
    onError: (error) => {
      useNotificationStore.getState().addNotification({
        type: "error",
        title: "Ошибка",
        message: (error as any).ApiError?.message ?? error.message,
      });
    },
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
