import { useNotificationStore } from "@/components/ui/notifications/notifications-store";
import { DefaultOptions, UseMutationOptions } from "@tanstack/react-query";

export const queryConfig = {
  queries: {
    refetchOnWindowFocus: false,
    retry: 1,
    staleTime: 1000 * 30,
  },
} satisfies DefaultOptions;

export type MutationConfig<MutationFnType extends (...args: any) => Promise<any>> =
  UseMutationOptions<Awaited<ReturnType<MutationFnType>>, Error, Parameters<MutationFnType>[0]>;

export const notifySuccess = (message: string) => {
  useNotificationStore.getState().addNotification({ type: "success", message });
};

export const notifyError = (message: string) => {
  useNotificationStore.getState().addNotification({ type: "error", message });
};
