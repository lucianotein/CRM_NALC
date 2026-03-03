import { useQuery } from "@tanstack/react-query";
import { api } from "./api";
import type { Me } from "./types";

export async function fetchMe(): Promise<Me> {
  const { data } = await api.get("/auth/me/");
  return data;
}

export function useMe() {
  return useQuery({
    queryKey: ["me"],
    queryFn: fetchMe,
    retry: false,
  });
}