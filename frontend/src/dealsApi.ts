import { api } from "./api";
import type { Deal, DealStage } from "./types";

export async function listDeals(): Promise<Deal[]> {
  const { data } = await api.get("/deals/");
  return data;
}

export async function createDeal(payload: {
  title: string;
  account?: number | null;
  stage?: DealStage;
  value?: number | null;
  valor_total?: number | null;
}): Promise<Deal> {
  const { data } = await api.post("/deals/", payload);
  return data;
}

export async function updateDealStage(id: number, stage: DealStage) {
  const { data } = await api.patch(`/deals/${id}/`, { stage });
  return data;
}

export async function getDeal(id: number): Promise<Deal> {
  const { data } = await api.get(`/deals/${id}/`);
  return data;
}

export async function updateDeal(
  id: number,
  payload: {
    title?: string;
    valor_total?: number | null;
    stage?: DealStage;
  }
): Promise<Deal> {
  const { data } = await api.patch(`/deals/${id}/`, payload);
  return data;
}

export async function deleteDeal(id: number): Promise<void> {
  await api.delete(`/deals/${id}/`);
}