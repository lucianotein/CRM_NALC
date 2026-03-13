export type Me = {
  id: number;
  username: string;
  email: string;
};

export type DealStage =
  | "LEAD"
  | "CONTATO"
  | "PROPOSTA"
  | "NEGOCIACAO"
  | "FECHADO_GANHO"
  | "PERDIDO"
  | "PAUSADO";

export type Deal = {
  id: number;
  title: string;
  stage: DealStage;

  account: number; // FK
  project: number | null; // compatibilidade temporária
  projects?: number[]; // múltiplos empreendimentos
  project_names?: string[]; // nomes vindos da API para exibição
  owner: number;

  valor_total: string | null;
  valor_entrada: string | null;

  elevador_entrega_prevista: string | null;
  last_contact_at: string | null;

  created_at: string;
  updated_at: string;
};