import { api } from "./api";

export type ProposalStatus = "DRAFT" | "SENT" | "ACCEPTED" | "REJECTED";

export type Proposal = {
  id: number;
  deal: number;

  projects: number[]; // ✅

  version_label: string;
  status: ProposalStatus;

  valor_total: string | number | null;
  valor_entrada: string | number | null;

  tem_permuta: boolean;
  valor_permuta: string | number | null;
  permuta_tipo: string;

  obra_entrega_prevista: string | null;
  elevador_entrega_prevista: string | null;

  notes: string;

  created_at: string;
  created_by: number;
};

export async function listProposals(dealId: number): Promise<Proposal[]> {
  const { data } = await api.get(`/proposals/?deal=${dealId}`);
  return data;
}

export async function createProposal(payload: Partial<Proposal> & { deal: number }): Promise<Proposal> {
  const { data } = await api.post(`/proposals/`, payload);
  return data;
}