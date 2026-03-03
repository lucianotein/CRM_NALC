// frontend/src/attachmentsApi.ts
import { api } from "./api";

export type AttachmentType = "PROPOSTA" | "CONTRATO" | "MEMORIAL" | "OUTRO";

export type DealAttachment = {
  id: number;
  deal: number;
  type: AttachmentType;
  version_label: string;
  file: string;        // path relativo (pode vir)
  file_url?: string;   // URL absoluta (a gente garantiu no serializer)
  created_at: string;
  created_by: number;
};

export async function listAttachments(dealId: number): Promise<DealAttachment[]> {
  const { data } = await api.get(`/attachments/?deal=${dealId}`);
  return data;
}

export async function uploadAttachment(payload: {
  deal: number;
  type: AttachmentType;
  version_label?: string;
  file: File;
}): Promise<DealAttachment> {
  const fd = new FormData();
  fd.append("deal", String(payload.deal));
  fd.append("type", payload.type);
  fd.append("version_label", payload.version_label || "");
  fd.append("file", payload.file);

  const { data } = await api.post(`/attachments/`, fd, {
    headers: { "Content-Type": "multipart/form-data" },
  });

  return data;
}