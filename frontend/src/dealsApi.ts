// frontend/src/dealsApi.ts
import { api } from "./api";
import type { Deal, DealStage } from "./types";

/**
 * Lista todas as oportunidades (deals)
 */
export async function listDeals(): Promise<Deal[]> {
  const { data } = await api.get("/deals/");
  return data;
}

/**
 * Cria uma oportunidade.
 * - title obrigatório
 * - account (construtora) opcional (mas no AccountDetail a gente sempre manda)
 * - stage opcional (se não mandar, backend pode defaultar)
 * - value opcional
 */
export async function createDeal(payload: {
  title: string;
  account?: number | null;
  stage?: DealStage;
  value?: number | null;
}): Promise<Deal> {
  const { data } = await api.post("/deals/", payload);
  return data;
}

/**
 * Atualiza somente a etapa do deal (Kanban)
 */
export async function updateDealStage(
  id: number,
  stage: DealStage
) {
  const { data } = await api.patch(`/deals/${id}/`, { stage });
  return data;
}

/**
 * Busca 1 deal (caso seu DealDetail use)
 */
export async function getDeal(id: number): Promise<Deal> {
  const { data } = await api.get(`/deals/${id}/`);
  return data;
}