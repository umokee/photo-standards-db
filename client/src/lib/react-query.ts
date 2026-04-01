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
