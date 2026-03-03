import { api, ensureCsrf } from "./api";
import type { DealStage } from "./types";

export type Account = {
  id: number;
  name: string;
  cnpj: string;
  city: string;
  state: string;
  is_active: boolean;
  owner: number;
  created_at: string;
  updated_at: string;
};

export type ContactPerson = {
  id: number;
  account: number;
  name: string;
  role: string;
  phone: string;
  email: string;
  is_primary: boolean;
  created_at: string;
};

export type Project = {
  id: number;
  account: number;
  name: string;
  city: string;
  state: string;
  obra_entrega_prevista: string | null;
  notes: string;
  created_at: string;
  updated_at: string;
};

export async function listAccounts(): Promise<Account[]> {
  const { data } = await api.get("/accounts/");
  return data;
}

export async function createAccount(payload: Partial<Account>): Promise<Account> {
  await ensureCsrf();
  const { data } = await api.post("/accounts/", payload);
  return data;
}

export async function getAccount(id: number): Promise<Account> {
  const { data } = await api.get(`/accounts/${id}/`);
  return data;
}

export async function listContacts(): Promise<ContactPerson[]> {
  const { data } = await api.get("/contacts/");
  return data;
}

export async function createContact(payload: Partial<ContactPerson>): Promise<ContactPerson> {
  await ensureCsrf();
  const { data } = await api.post("/contacts/", payload);
  return data;
}

export async function listProjects(): Promise<Project[]> {
  const { data } = await api.get("/projects/");
  return data;
}

export async function createProject(payload: Partial<Project>): Promise<Project> {
  await ensureCsrf();
  const { data } = await api.post("/projects/", payload);
  return data;
}

export async function createDeal(payload: {
  title: string;
  account: number;
  project?: number | null;
  stage?: DealStage;
}): Promise<any> {
  await ensureCsrf();
  const { data } = await api.post("/deals/", payload);
  return data;
}