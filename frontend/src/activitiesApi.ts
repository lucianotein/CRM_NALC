import { api } from "./api";

export type ActivityType =
  | "VISITA"
  | "WHATSAPP"
  | "LIGACAO"
  | "REUNIAO"
  | "EMAIL"
  | "TAREFA";

export type ActivityStatus = "PENDING" | "DONE" | "CANCELED";

export type Activity = {
  id: number;
  deal: number;
  type: ActivityType;
  status: ActivityStatus;

  occurred_at: string | null; // quando aconteceu (DONE)
  scheduled_for: string | null; // quando está agendado (PENDING)

  result: string;
  notes: string;

  created_at: string; // quando registrei no CRM
  created_by?: number;
};

export async function listActivities(dealId: number): Promise<Activity[]> {
  const { data } = await api.get(`/activities/`, { params: { deal: dealId } });
  return data;
}

export async function createActivity(
  payload: Partial<Activity> & { deal: number }
): Promise<Activity> {
  const { data } = await api.post(`/activities/`, payload);
  return data;
}

// ✅ novos endpoints (que você criou no backend)
export async function markActivityDone(activityId: number): Promise<Activity> {
  const { data } = await api.post(`/activities/${activityId}/mark-done/`);
  return data;
}

export async function markActivityPending(activityId: number): Promise<Activity> {
  const { data } = await api.post(`/activities/${activityId}/mark-pending/`);
  return data;
}

// ✅ compromissos do dia (home/dashboard vai usar isso depois)
export async function listCommitments(date?: string): Promise<Activity[]> {
  // date: "YYYY-MM-DD"
  const { data } = await api.get(`/activities/commitments/`, {
    params: date ? { date } : undefined,
  });
  return data;
}