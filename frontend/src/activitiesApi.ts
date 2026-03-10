// frontend/src/activitiesApi.ts
import { api, ensureCsrf } from "./api";

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

  occurred_at: string | null;   // quando aconteceu (DONE)
  scheduled_for: string | null; // quando está agendado (PENDING)

  result: string;
  notes: string;

  created_at: string; // quando registrei no CRM
  created_by?: number;
};

export async function listActivities(dealId: number): Promise<Activity[]> {
  const { data } = await api.get(`/activities/`, {
    params: { deal: dealId },
  });
  return data;
}

export async function createActivity(
  payload: Partial<Activity> & { deal: number }
): Promise<Activity> {
  await ensureCsrf();
  const { data } = await api.post(`/activities/`, payload);
  return data;
}

export async function markActivityDone(activityId: number): Promise<Activity> {
  await ensureCsrf();
  const { data } = await api.post(`/activities/${activityId}/mark-done/`);
  return data;
}

export async function markActivityPending(activityId: number): Promise<Activity> {
  await ensureCsrf();
  const { data } = await api.post(`/activities/${activityId}/mark-pending/`);
  return data;
}

export async function listCommitments(date?: string): Promise<Activity[]> {
  const { data } = await api.get(`/activities/commitments/`, {
    params: date ? { date } : undefined,
  });
  return data;
}

export async function rescheduleActivity(payload: {
  activityId: number;
  scheduled_for: string;
  note?: string;
}): Promise<Activity> {
  await ensureCsrf();
  const { data } = await api.post(
    `/activities/${payload.activityId}/reschedule/`,
    {
      scheduled_for: payload.scheduled_for,
      note: payload.note || "",
    }
  );
  return data;
}