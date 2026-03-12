import React, { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Deal, DealStage } from "../types";
import { api } from "../api";
import { updateDealStage } from "../dealsApi";
import ProposalForm from "../components/ProposalForm";

import {
  createActivity,
  listActivities,
  type Activity,
  type ActivityType,
} from "../activitiesApi";

import {
  listAttachments,
  uploadAttachment,
  type AttachmentType,
} from "../attachmentsApi";

import {
  listProposals,
  createProposal,
  type Proposal,
  type ProposalStatus,
} from "../proposalsApi";

import { listProjects } from "../crmApi";

import {
  Plus,
  Upload,
  FileText,
  ClipboardList,
  BadgeDollarSign,
  Building2,
  Layers3,
  Clock,
  CheckCircle2,
  RotateCcw,
  Download,
  ExternalLink,
  Paperclip,
  X,
  Loader2,
  CalendarClock,
  Hash,
} from "lucide-react";

/** ===========================
 * Types
 * =========================== */

type DealWithExtras = Deal & {
  account_name?: string;
  project_name?: string | null;
  valor_total?: string | number | null;
};

type ProjectItem = {
  id: number;
  account: number;
  name: string;
  city?: string | null;
  state?: string | null;
  obra_entrega_prevista?: string | null;
};

/** ===========================
 * Helpers
 * =========================== */

function formatBRL(v: unknown) {
  if (v === null || v === undefined || v === "") return null;
  const n = typeof v === "number" ? v : Number(String(v).replace(",", "."));
  if (!Number.isFinite(n)) return null;
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function fmtDT(s?: string | null) {
  if (!s) return "-";
  try {
    return new Date(s).toLocaleString("pt-BR");
  } catch {
    return s;
  }
}

function formatMonthYear(value?: string | null) {
  if (!value) return "";
  const ym = String(value).match(/^(\d{4})-(\d{2})$/);
  if (ym) return `${ym[2]}/${ym[1]}`;

  const ymd = String(value).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (ymd) return `${ymd[2]}/${ymd[1]}`;

  return String(value);
}

function fmtDate(s?: string | null) {
  if (!s) return "-";

  const monthYear = formatMonthYear(s);
  if (monthYear && monthYear !== s) return monthYear;

  try {
    return new Date(s).toLocaleDateString("pt-BR");
  } catch {
    return s;
  }
}

function attachmentUrl(a: any) {
  return a?.file_url || a?.file;
}

function pickLatestAttachment(items: any[]) {
  if (!items || items.length === 0) return null;
  return [...items].sort(
    (x, y) => new Date(y.created_at).getTime() - new Date(x.created_at).getTime()
  )[0];
}


function toIsoFromLocalDT(local: string): string | null {
  const t = (local || "").trim();
  if (!t) return null;
  const [datePart, timePart] = t.split("T");
  if (!datePart || !timePart) return null;
  const [y, m, d] = datePart.split("-").map(Number);
  const [hh, mm] = timePart.split(":").map(Number);
  const dt = new Date(y, (m || 1) - 1, d || 1, hh || 0, mm || 0, 0, 0);
  if (Number.isNaN(dt.getTime())) return null;
  return dt.toISOString();
}

function nowLocalDT(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
}


async function getDeal(id: number): Promise<DealWithExtras> {
  const { data } = await api.get(`/deals/${id}/`);
  return data;
}

/** ===========================
 * Labels
 * =========================== */

const TYPE_LABEL: Record<string, string> = {
  VISITA: "Visita",
  LIGACAO: "Ligação",
  WHATSAPP: "WhatsApp",
  REUNIAO: "Reunião",
  EMAIL: "E-mail",
  TAREFA: "Tarefa",
};

const ATT_TYPE_LABEL: Record<AttachmentType, string> = {
  PROPOSTA: "Proposta",
  CONTRATO: "Contrato",
  MEMORIAL: "Memorial",
  OUTRO: "Outro",
};


function stageLabel(stage: DealStage) {
  const map: Record<DealStage, string> = {
    LEAD: "Lead",
    CONTATO: "Contato",
    PROPOSTA: "Proposta",
    NEGOCIACAO: "Negociação",
    FECHADO_GANHO: "Fechado",
    PERDIDO: "Perdido",
    PAUSADO: "Pausado",
  };
  return map[stage] || stage;
}

function StagePill({ stage }: { stage: DealStage }) {
  return (
    <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-semibold text-slate-700">
      {stageLabel(stage)}
    </span>
  );
}

function StatusPill({ status }: { status: string }) {
  const base =
    "text-[11px] px-2.5 py-1 rounded-full border inline-flex items-center gap-1 font-semibold";

  if (status === "PENDING") {
    return (
      <span className={`${base} bg-amber-50 border-amber-200 text-amber-800`}>
        PENDENTE
      </span>
    );
  }
  if (status === "DONE") {
    return (
      <span className={`${base} bg-emerald-50 border-emerald-200 text-emerald-800`}>
        FEITO
      </span>
    );
  }
  if (status === "CANCELED") {
    return (
      <span className={`${base} bg-slate-50 border-slate-200 text-slate-600`}>
        CANCELADO
      </span>
    );
  }

  return (
    <span className={`${base} bg-slate-50 border-slate-200 text-slate-700`}>
      {status}
    </span>
  );
}

/** ===========================
 * UI classes
 * =========================== */

const btnBase =
  "inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-2.5 text-sm transition " +
  "focus:outline-none focus:ring-4 focus:ring-slate-200 disabled:opacity-50 disabled:cursor-not-allowed";

const btnPrimary =
  btnBase + " bg-slate-900 text-white hover:bg-slate-800 active:bg-slate-950";

const btnSecondary =
  btnBase +
  " border border-slate-200 bg-white text-slate-800 hover:bg-slate-50 active:bg-slate-100";

const inputCls =
  "w-full rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-slate-900 placeholder:text-slate-400 " +
  "outline-none focus:ring-4 focus:ring-slate-200 focus:border-slate-300";


/** ===========================
 * Page
 * =========================== */

export default function DealDetail() {
  const { id } = useParams();
  const dealId = Number(id);
  const qc = useQueryClient();

  const dealQ = useQuery({
    queryKey: ["deal", dealId],
    queryFn: () => getDeal(dealId),
    enabled: Number.isFinite(dealId),
  });

  const actsQ = useQuery({
    queryKey: ["activities", dealId],
    queryFn: () => listActivities(dealId),
    enabled: Number.isFinite(dealId),
  });

  const attsQ = useQuery({
    queryKey: ["attachments", dealId],
    queryFn: () => listAttachments(dealId),
    enabled: Number.isFinite(dealId),
  });

  const propsQ = useQuery({
    queryKey: ["proposals", dealId],
    queryFn: () => listProposals(dealId),
    enabled: Number.isFinite(dealId),
  });

  const projectsQ = useQuery({
    queryKey: ["projects"],
    queryFn: listProjects,
  });

  const updateStageMut = useMutation({
    mutationFn: ({ stage }: { stage: DealStage }) =>
      updateDealStage(dealId, stage),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["deal", dealId] });
      await qc.invalidateQueries({ queryKey: ["deals"] });
    },
  });

  const updateDealTitleMut = useMutation({
    mutationFn: async (title: string) => {
      const { data } = await api.patch(`/deals/${dealId}/`, { title });
      return data;
    },
    onSuccess: async () => {
      setIsEditingTitle(false);
      await qc.invalidateQueries({ queryKey: ["deal", dealId] });
      await qc.invalidateQueries({ queryKey: ["deals"] });
    },
  });

  const [openAct, setOpenAct] = useState(false);
  const [openUpload, setOpenUpload] = useState(false);
  const [openProposal, setOpenProposal] = useState(false);
  const [openReschedule, setOpenReschedule] = useState(false);
  const [rescheduleAct, setRescheduleAct] = useState<any | null>(null);
  const [editingProposal, setEditingProposal] = useState<Proposal | null>(null);

  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState("");

  const createActMut = useMutation({
    mutationFn: createActivity,
    onSuccess: async () => {
      setOpenAct(false);
      await qc.invalidateQueries({ queryKey: ["activities", dealId] });
      await qc.invalidateQueries({ queryKey: ["deal", dealId] });
      await qc.invalidateQueries({ queryKey: ["deals"] });
    },
  });

  const uploadMut = useMutation({
    mutationFn: uploadAttachment,
    onSuccess: async () => {
      setOpenUpload(false);
      await qc.invalidateQueries({ queryKey: ["attachments", dealId] });
    },
  });

  

  const rescheduleMut = useMutation({
    mutationFn: async (input: {
      activityId: number;
      scheduled_for: string;
      note: string;
    }) => {
      const { data } = await api.post(
        `/activities/${input.activityId}/reschedule/`,
        { scheduled_for: input.scheduled_for, note: input.note }
      );
      return data;
    },
    onSuccess: async (updated) => {
      qc.setQueryData(["activities", dealId], (old: any) => {
        const arr = (old || []) as any[];
        return arr.map((a) => (a.id === updated.id ? { ...a, ...updated } : a));
      });

      setOpenReschedule(false);
      setRescheduleAct(null);

      await qc.invalidateQueries({ queryKey: ["activities", dealId] });
      await qc.invalidateQueries({ queryKey: ["deal", dealId] });
      await qc.invalidateQueries({ queryKey: ["deals"] });
    },
  });

  const createProposalMut = useMutation({
    mutationFn: async (input: {
      proposal: Partial<Proposal> & { deal: number };
      file?: File | null;
    }) => {
      const created = await createProposal(input.proposal);

      if (input.file) {
        await uploadAttachment({
          deal: input.proposal.deal,
          type: "PROPOSTA",
          version_label: created.version_label || "",
          file: input.file,
        });
      }

      return created;
    },
    onSuccess: async () => {
      setOpenProposal(false);
      await qc.invalidateQueries({ queryKey: ["proposals", dealId] });
      await qc.invalidateQueries({ queryKey: ["attachments", dealId] });
      await qc.invalidateQueries({ queryKey: ["deal", dealId] });
      await qc.invalidateQueries({ queryKey: ["deals"] });
    },
  });

  const updateProposalStatusMut = useMutation({
    mutationFn: async (input: { proposalId: number; status: ProposalStatus }) => {
      const { data } = await api.patch(`/proposals/${input.proposalId}/`, {
        status: input.status,
      });
      return data;
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["proposals", dealId] });
    },
  });

  const updateProposalMut = useMutation({
    mutationFn: async (input: {
      proposalId: number;
      proposal: Partial<Proposal>;
      file?: File | null;
    }) => {
      const payload = { ...input.proposal } as any;
      delete payload._file;
      const { data } = await api.patch(`/proposals/${input.proposalId}/`, payload);

      if (input.file) {
        await uploadAttachment({
          deal: dealId,
          type: "PROPOSTA",
          version_label: data.version_label || "",
          file: input.file,
        });
      }

      return data;
    },
    onSuccess: async () => {
      setEditingProposal(null);
      await qc.invalidateQueries({ queryKey: ["proposals", dealId] });
      await qc.invalidateQueries({ queryKey: ["attachments", dealId] });
    },
  });

  const markDoneMut = useMutation({
    mutationFn: async (activityId: number) => {
      const { data } = await api.post(`/activities/${activityId}/mark-done/`);
      return data;
    },
    onSuccess: async (updated) => {
      qc.setQueryData(["activities", dealId], (old: any) => {
        const arr = (old || []) as any[];
        return arr.map((a) => (a.id === updated.id ? { ...a, ...updated } : a));
      });

      await qc.invalidateQueries({ queryKey: ["activities", dealId] });
      await qc.invalidateQueries({ queryKey: ["deal", dealId] });
      await qc.invalidateQueries({ queryKey: ["deals"] });
    },
  });

  const markPendingMut = useMutation({
    mutationFn: async (activityId: number) => {
      const { data } = await api.post(`/activities/${activityId}/mark-pending/`);
      return data;
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["activities", dealId] });
      await qc.invalidateQueries({ queryKey: ["deal", dealId] });
      await qc.invalidateQueries({ queryKey: ["deals"] });
    },
  });

  const activities = useMemo(() => {
    const arr = (actsQ.data || []) as any[];
    return [...arr].sort((a, b) => {
      const aPending = a.status === "PENDING" && a.scheduled_for;
      const bPending = b.status === "PENDING" && b.scheduled_for;

      if (aPending && bPending) {
        return (
          new Date(a.scheduled_for).getTime() - new Date(b.scheduled_for).getTime()
        );
      }
      if (aPending && !bPending) return -1;
      if (!aPending && bPending) return 1;

      const da = new Date(a.occurred_at || a.created_at).getTime();
      const db = new Date(b.occurred_at || b.created_at).getTime();
      return db - da;
    });
  }, [actsQ.data]);

  const attachments = useMemo(() => {
    const arr = attsQ.data || [];
    return [...arr].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }, [attsQ.data]);

  const proposalAttachmentByVersion = useMemo(() => {
    const map = new Map<string, any>();
    const proposalAtts = (attachments || []).filter(
      (a: any) => a.type === "PROPOSTA"
    );

    const groups: Record<string, any[]> = {};
    for (const a of proposalAtts) {
      const key = (a.version_label || "").trim();
      if (!groups[key]) groups[key] = [];
      groups[key].push(a);
    }

    for (const key of Object.keys(groups)) {
      map.set(key, pickLatestAttachment(groups[key]));
    }

    return map;
  }, [attachments]);

  const proposals = useMemo(() => {
    const arr = propsQ.data || [];
    return [...arr].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }, [propsQ.data]);

  const proposalSummary = useMemo(() => {
    const base = {
      total: 0,
      DRAFT: 0,
      SENT: 0,
      ACCEPTED: 0,
      REJECTED: 0,
    };

    for (const p of proposals) {
      const valor = Number(p.valor_total || 0) || 0;
      base.total += valor;

      if (p.status === "DRAFT") base.DRAFT += valor;
      if (p.status === "SENT") base.SENT += valor;
      if (p.status === "ACCEPTED") base.ACCEPTED += valor;
      if (p.status === "REJECTED") base.REJECTED += valor;
    }

    return base;
  }, [proposals]);

  const accountIdForProjects = (dealQ.data as any)?.account ?? null;

  const accountProjects = useMemo(() => {
    const all = (projectsQ.data || []) as ProjectItem[];
    if (!accountIdForProjects) return [];
    return all.filter((p) => p.account === accountIdForProjects);
  }, [projectsQ.data, accountIdForProjects]);

  const projectNameById = useMemo(() => {
    const m = new Map<number, string>();
    accountProjects.forEach((p) => m.set(p.id, p.name));
    return m;
  }, [accountProjects]);

  function renderProposalProjects(p: Proposal) {
    const ids = (p as any).projects as number[] | undefined;
    if (!ids || ids.length === 0) return "-";
    const names = ids.map((id) => projectNameById.get(id) || `#${id}`).join(", ");
    return names || "-";
  }

  if (dealQ.isLoading) return <div className="p-6 text-slate-700">Carregando...</div>;
  if (dealQ.isError || !dealQ.data) {
    return <div className="p-6 text-red-600">Oportunidade não encontrada.</div>;
  }

  const d = dealQ.data;
  const valor = formatBRL((d as any).valor_total);

  useEffect(() => {
    if (d?.title) {
      setTitleDraft(d.title);
    }
  }, [d?.title]);

  const busy =
    updateStageMut.isPending ||
    updateDealTitleMut.isPending ||
    createActMut.isPending ||
    uploadMut.isPending ||
    createProposalMut.isPending ||
    updateProposalMut.isPending ||
    updateProposalStatusMut.isPending ||
    markDoneMut.isPending ||
    markPendingMut.isPending ||
    rescheduleMut.isPending;

  const busyText = updateStageMut.isPending
    ? "Atualizando etapa..."
    : updateDealTitleMut.isPending
    ? "Atualizando título..."
    : createActMut.isPending
    ? "Salvando atividade..."
    : uploadMut.isPending
    ? "Enviando arquivo..."
    : createProposalMut.isPending
    ? "Registrando proposta..."
    : updateProposalMut.isPending
    ? "Atualizando proposta..."
    : updateProposalStatusMut.isPending
    ? "Atualizando status da proposta..."
    : markDoneMut.isPending
    ? "Concluindo..."
    : markPendingMut.isPending
    ? "Reabrindo..."
    : rescheduleMut.isPending
    ? "Reagendando..."
    : "";

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="sticky top-0 z-30 border-b border-slate-200 bg-white/80 backdrop-blur">
        <div className="mx-auto max-w-6xl px-6 py-4">
          <div className="flex flex-wrap items-center gap-2 text-sm text-slate-600">
            <Link to="/deals" className="hover:text-slate-900 font-medium">
              Kanban
            </Link>

            <span className="text-slate-400">/</span>

            <Link
              to={`/accounts/${(d as any).account}`}
              className="hover:text-slate-900 font-medium"
            >
              {(d as any).account_name || `Construtora #${(d as any).account}`}
            </Link>

            <span className="text-slate-400">/</span>

            <span className="text-slate-900 font-semibold truncate">{d.title}</span>
          </div>

          <div className="mt-3 flex items-center gap-3">
            <Link to={`/accounts/${(d as any).account}`} className={btnSecondary}>
              <Building2 className="h-4 w-4" />
              Retornar para Construtora
            </Link>

            <div className="min-w-0">
              <div className="flex items-center gap-2 min-w-0 flex-wrap">
                {isEditingTitle ? (
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <input
                      value={titleDraft}
                      onChange={(e) => setTitleDraft(e.target.value)}
                      className="min-w-[260px] max-w-[420px] rounded-2xl border border-slate-200 bg-white px-4 py-2 text-base font-semibold text-slate-900 outline-none focus:ring-4 focus:ring-slate-200 focus:border-slate-300"
                      placeholder="Título do lead"
                    />
                    <button
                      onClick={() => {
                        const t = titleDraft.trim();
                        if (!t) return;
                        updateDealTitleMut.mutate(t);
                      }}
                      className={btnPrimary}
                      type="button"
                    >
                      Salvar
                    </button>
                    <button
                      onClick={() => {
                        setTitleDraft(d.title || "");
                        setIsEditingTitle(false);
                      }}
                      className={btnSecondary}
                      type="button"
                    >
                      Cancelar
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="text-lg font-semibold tracking-tight text-slate-900 truncate">
                      {d.title}
                    </div>
                    <button
                      onClick={() => setIsEditingTitle(true)}
                      className={btnSecondary}
                      type="button"
                    >
                      Editar título
                    </button>
                  </>
                )}

                <StagePill stage={d.stage} />
              </div>

              <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-600">
                <Link
                  to={`/accounts/${(d as any).account}`}
                  className="inline-flex items-center gap-1 hover:text-slate-900 text-slate-600"
                >
                  <Building2 className="h-3.5 w-3.5 text-slate-400" />
                  {(d as any).account_name || `#${(d as any).account}`}
                </Link>

                {(d as any).project ? (
                  <span className="inline-flex items-center gap-1">
                    <Layers3 className="h-3.5 w-3.5 text-slate-400" />
                    {(d as any).project_name || `#${(d as any).project}`}
                  </span>
                ) : null}

                <span className="inline-flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5 text-slate-400" />
                  Último contato:{" "}
                  {(d as any).last_contact_at ? fmtDT((d as any).last_contact_at) : "-"}
                </span>

                {valor ? (
                  <span className="inline-flex items-center gap-1">
                    <BadgeDollarSign className="h-3.5 w-3.5 text-slate-400" />
                    {valor}
                  </span>
                ) : null}
              </div>
            </div>

            <div className="ml-auto flex items-center gap-2">
              <button onClick={() => setOpenUpload(true)} className={btnSecondary}>
                <Upload className="h-4 w-4" />
                Anexar
              </button>

              <button onClick={() => setOpenProposal(true)} className={btnPrimary}>
                <Plus className="h-4 w-4" />
                Proposta
              </button>

              <button onClick={() => setOpenAct(true)} className={btnSecondary}>
                <ClipboardList className="h-4 w-4" />
                Atividade
              </button>
            </div>
          </div>

          {busy && (
            <div className="mt-3 flex items-center gap-2 text-sm text-slate-600">
              <Loader2 className="h-4 w-4 animate-spin" />
              {busyText}
            </div>
          )}
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-6 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6">
          <div className="grid gap-6">
            <Card
              title="Propostas"
              icon={<FileText className="h-4 w-4 text-slate-700" />}
              subtitle={`${proposals.length} registro(s)`}
            >
              {propsQ.isLoading && (
                <div className="text-sm text-slate-600">Carregando propostas...</div>
              )}
              {propsQ.isError && (
                <div className="text-sm text-red-600">Erro ao carregar propostas.</div>
              )}

              <div className="grid gap-3">
                {proposals.map((p) => {
                  const key = (p.version_label || "").trim();
                  const att = proposalAttachmentByVersion.get(key);
                  const url = att ? attachmentUrl(att) : null;

                  return (
                    <div
                      key={p.id}
                      className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="text-sm font-semibold text-slate-900">
                            Proposta{" "}
                            {p.version_label ? (
                              <span className="text-xs text-slate-500">• {p.version_label}</span>
                            ) : null}
                          </div>

                          <div className="mt-2 flex flex-col gap-2 md:flex-row md:items-center md:gap-3">
                            <div className="text-xs text-slate-600">
                              Criada em: {fmtDT(p.created_at)}
                            </div>

                            <div className="w-full md:w-[220px]">
                              <select
                                value={p.status}
                                onChange={(e) =>
                                  updateProposalStatusMut.mutate({
                                    proposalId: p.id,
                                    status: e.target.value as ProposalStatus,
                                  })
                                }
                                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:ring-4 focus:ring-slate-200 focus:border-slate-300"
                              >
                                <option value="DRAFT">Rascunho</option>
                                <option value="SENT">Enviada</option>
                                <option value="ACCEPTED">Aceita</option>
                                <option value="REJECTED">Recusada</option>
                              </select>
                            </div>
                          </div>

                          <div className="mt-2 text-xs text-slate-600">
                            Empreendimentos:{" "}
                            <span className="font-semibold text-slate-800">
                              {renderProposalProjects(p)}
                            </span>
                          </div>

                          <div className="mt-2 text-xs text-slate-600">
                            Total:{" "}
                            <span className="font-semibold text-slate-900">
                              {formatBRL(p.valor_total) || "-"}
                            </span>{" "}
                            • Entrada:{" "}
                            <span className="font-semibold text-slate-900">
                              {formatBRL(p.valor_entrada) || "-"}
                            </span>
                          </div>

                          <div className="mt-1 text-xs text-slate-600">
                            Permuta:{" "}
                            <span className="font-semibold text-slate-900">
                              {p.tem_permuta ? `Sim (${p.permuta_tipo || "-"})` : "Não"}
                            </span>
                            {p.tem_permuta ? (
                              <>
                                {" "}
                                • Valor permuta:{" "}
                                <span className="font-semibold text-slate-900">
                                  {formatBRL((p as any).valor_permuta) || "-"}
                                </span>
                              </>
                            ) : null}
                          </div>

                          <div className="mt-1 text-xs text-slate-600">
                            Entrega obra:{" "}
                            <span className="font-semibold text-slate-900">
                              {fmtDate((p as any).obra_entrega_prevista)}
                            </span>{" "}
                            • Entrega elevadores:{" "}
                            <span className="font-semibold text-slate-900">
                              {fmtDate((p as any).elevador_entrega_prevista)}
                            </span>
                          </div>

                          {(p as any).notes ? (
                            <div className="mt-3 text-sm text-slate-700 whitespace-pre-wrap">
                              {(p as any).notes}
                            </div>
                          ) : null}
                        </div>

                        <div className="shrink-0 text-right">
                          <div className="text-[11px] text-slate-500">
                            <span className="inline-flex items-center gap-1">
                              <Hash className="h-3.5 w-3.5 text-slate-400" /> #{p.id}
                            </span>
                          </div>
                          <div className="mt-3">
                            <button
                              onClick={() => setEditingProposal(p)}
                              className={btnSecondary}
                            >
                              Editar
                            </button>
                          </div>

                          {url ? (
                            <div className="mt-3 flex flex-col gap-2">
                              <a href={url} target="_blank" rel="noreferrer" className={btnPrimary}>
                                <ExternalLink className="h-4 w-4" />
                                Abrir
                              </a>
                              <a href={url} download className={btnSecondary}>
                                <Download className="h-4 w-4" />
                                Baixar
                              </a>
                            </div>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  );
                })}

                {proposals.length === 0 && !propsQ.isLoading && (
                  <EmptyState>
                    Nenhuma proposta registrada. Clique em <b>“Proposta”</b>.
                  </EmptyState>
                )}
              </div>
            </Card>

            <Card
              title="Arquivos"
              icon={<Paperclip className="h-4 w-4 text-slate-700" />}
              subtitle={`${attachments.length} arquivo(s)`}
            >
              {attsQ.isLoading && (
                <div className="text-sm text-slate-600">Carregando anexos...</div>
              )}
              {attsQ.isError && (
                <div className="text-sm text-red-600">Erro ao carregar anexos.</div>
              )}

              <div className="grid gap-3">
                {attachments.map((a: any) => {
                  const url = attachmentUrl(a);
                  return (
                    <div
                      key={a.id}
                      className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="text-sm font-semibold text-slate-900">
                            {ATT_TYPE_LABEL[a.type as keyof typeof ATT_TYPE_LABEL] || a.type}
                            {a.version_label ? (
                              <span className="text-xs text-slate-500"> • {a.version_label}</span>
                            ) : null}
                          </div>
                          <div className="mt-1 text-xs text-slate-600">
                            Enviado em: {fmtDT(a.created_at)}
                          </div>
                        </div>

                        {url ? (
                          <a href={url} target="_blank" rel="noreferrer" className={btnSecondary}>
                            <ExternalLink className="h-4 w-4" />
                            Abrir
                          </a>
                        ) : null}
                      </div>
                    </div>
                  );
                })}

                {attachments.length === 0 && !attsQ.isLoading && (
                  <EmptyState>
                    Nenhum arquivo anexado. Clique em <b>“Anexar”</b>.
                  </EmptyState>
                )}
              </div>
            </Card>

            <Card
              title="Atividades"
              icon={<ClipboardList className="h-4 w-4 text-slate-700" />}
              subtitle={`${activities.length} registro(s)`}
            >
              {actsQ.isLoading && (
                <div className="text-sm text-slate-600">Carregando atividades...</div>
              )}
              {actsQ.isError && (
                <div className="text-sm text-red-600">Erro ao carregar atividades.</div>
              )}

              <div className="grid gap-3">
                {activities.map((a: any) => {
                  const isPending = a.status === "PENDING";
                  const whenLabel = isPending ? "Agendado" : "Aconteceu";
                  const whenValue = isPending ? fmtDT(a.scheduled_for) : fmtDT(a.occurred_at);

                  return (
                    <div
                      key={a.id}
                      className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <div className="text-sm font-semibold text-slate-900">
                              {(TYPE_LABEL as any)[a.type] || a.type}
                            </div>
                            <StatusPill status={a.status} />
                          </div>

                          <div className="mt-1 text-xs text-slate-600 inline-flex items-center gap-2">
                            <CalendarClock className="h-3.5 w-3.5 text-slate-400" />
                            {whenLabel}: <span className="font-semibold">{whenValue}</span>
                          </div>

                          {a.result ? (
                            <div className="mt-3 text-sm text-slate-800">
                              <span className="text-slate-500">Resultado:</span> {a.result}
                            </div>
                          ) : null}

                          {a.notes ? (
                            <div className="mt-2 text-sm text-slate-700 whitespace-pre-wrap">
                              {a.notes}
                            </div>
                          ) : null}

                          <div className="mt-3 text-[11px] text-slate-500">
                            Registrado em: {fmtDT(a.created_at)}
                          </div>
                        </div>

                        <div className="shrink-0 flex flex-col gap-2">
                          {isPending ? (
                            <button onClick={() => markDoneMut.mutate(a.id)} className={btnPrimary}>
                              <CheckCircle2 className="h-4 w-4" />
                              Concluir
                            </button>
                          ) : a.status === "DONE" ? (
                            <button
                              onClick={() => {
                                setRescheduleAct(a);
                                setOpenReschedule(true);
                              }}
                              className={btnSecondary}
                            >
                              <RotateCcw className="h-4 w-4" />
                              Reabrir
                            </button>
                          ) : null}

                          {a.status === "DONE" ? (
                            <button
                              onClick={() => markPendingMut.mutate(a.id)}
                              className={btnSecondary}
                              title="Voltar para pendente"
                            >
                              <Clock className="h-4 w-4" />
                              Pendente
                            </button>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  );
                })}

                {activities.length === 0 && !actsQ.isLoading && (
                  <EmptyState>
                    Nenhuma atividade registrada. Clique em <b>“Atividade”</b>.
                  </EmptyState>
                )}
              </div>
            </Card>
          </div>

          <div className="grid gap-6">
            <Card
              title="Resumo"
              icon={<BadgeDollarSign className="h-4 w-4 text-slate-700" />}
              subtitle="Dados principais"
            >
              <div className="grid gap-3">
                <InfoRow
                  label="Construtora"
                  value={(d as any).account_name || `#${(d as any).account}`}
                  icon={<Building2 className="h-4 w-4 text-slate-400" />}
                />
                <InfoRow
                  label="Obra"
                  value={
                    (d as any).project
                      ? (d as any).project_name || `#${(d as any).project}`
                      : "-"
                  }
                  icon={<Layers3 className="h-4 w-4 text-slate-400" />}
                />
                <InfoRow
                  label="Último contato"
                  value={(d as any).last_contact_at ? fmtDT((d as any).last_contact_at) : "-"}
                  icon={<Clock className="h-4 w-4 text-slate-400" />}
                />
                <div className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3">
                  <div className="mt-0.5">
                    <BadgeDollarSign className="h-4 w-4 text-slate-400" />
                  </div>

                  <div className="min-w-0">
                    <div className="text-xs text-slate-500">Valor em propostas</div>
                    <div className="text-sm font-semibold text-slate-900">
                      {formatBRL(proposalSummary.total) || "-"}
                    </div>

                    <div className="mt-2 space-y-1 text-xs text-slate-600">
                      <div>
                        Rascunho:{" "}
                        <span className="font-semibold text-slate-900">
                          {formatBRL(proposalSummary.DRAFT) || "R$ 0,00"}
                        </span>
                      </div>
                      <div>
                        Enviada:{" "}
                        <span className="font-semibold text-slate-900">
                          {formatBRL(proposalSummary.SENT) || "R$ 0,00"}
                        </span>
                      </div>
                      <div>
                        Aceita:{" "}
                        <span className="font-semibold text-slate-900">
                          {formatBRL(proposalSummary.ACCEPTED) || "R$ 0,00"}
                        </span>
                      </div>
                      <div>
                        Recusada:{" "}
                        <span className="font-semibold text-slate-900">
                          {formatBRL(proposalSummary.REJECTED) || "R$ 0,00"}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-5">
                <label className="text-xs font-semibold text-slate-700">Etapa</label>
                <select
                  value={d.stage}
                  onChange={(e) =>
                    updateStageMut.mutate({ stage: e.target.value as DealStage })
                  }
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none focus:ring-4 focus:ring-slate-200 focus:border-slate-300"
                >
                  <option value="LEAD">Lead</option>
                  <option value="CONTATO">Contato</option>
                  <option value="PROPOSTA">Proposta</option>
                  <option value="NEGOCIACAO">Negociação</option>
                  <option value="FECHADO_GANHO">Fechado</option>
                  <option value="PERDIDO">Perdido</option>
                  <option value="PAUSADO">Pausado</option>
                </select>
              </div>
            </Card>

            <Card
              title="Ações rápidas"
              icon={<Plus className="h-4 w-4 text-slate-700" />}
              subtitle="Operações comuns"
            >
              <div className="grid gap-2">
                <button onClick={() => setOpenProposal(true)} className={btnPrimary}>
                  <Plus className="h-4 w-4" />
                  Registrar proposta
                </button>

                <button onClick={() => setOpenAct(true)} className={btnSecondary}>
                  <ClipboardList className="h-4 w-4" />
                  Registrar atividade
                </button>

                <button onClick={() => setOpenUpload(true)} className={btnSecondary}>
                  <Upload className="h-4 w-4" />
                  Anexar arquivo
                </button>
              </div>
            </Card>
          </div>
        </div>
      </div>

      {openAct && (
        <Modal title="Registrar atividade" onClose={() => setOpenAct(false)}>
          <ActivityForm
            loading={createActMut.isPending}
            onSubmit={(payload) => createActMut.mutate({ ...payload, deal: dealId })}
          />
        </Modal>
      )}

      {openUpload && (
        <Modal title="Anexar arquivo" onClose={() => setOpenUpload(false)}>
          <UploadForm
            loading={uploadMut.isPending}
            onSubmit={(payload) => uploadMut.mutate({ ...payload, deal: dealId })}
          />
        </Modal>
      )}

      {openProposal && (
        <Modal title="Registrar proposta" onClose={() => setOpenProposal(false)}>
          <ProposalForm
            loading={createProposalMut.isPending}
            projects={accountProjects.map((p) => ({
              id: p.id,
              name: p.name,
              obra_entrega_prevista: p.obra_entrega_prevista,
            }))}
            submitLabel="Registrar proposta"
            showFileField={true}
            onSubmit={(payload) =>
              createProposalMut.mutate({
                proposal: { ...payload, deal: dealId },
                file: (payload as any)._file || null,
              })
            }
          />
        </Modal>
      )}

      {editingProposal && (
        <Modal
          title={`Editar proposta${editingProposal.version_label ? ` • ${editingProposal.version_label}` : ""}`}
          onClose={() => setEditingProposal(null)}
        >
          <ProposalForm
            loading={updateProposalMut.isPending}
            projects={accountProjects.map((p) => ({
              id: p.id,
              name: p.name,
              obra_entrega_prevista: p.obra_entrega_prevista,
            }))}
            initialData={{
              ...editingProposal,
              projects: ((editingProposal as any).projects || []) as number[],
            }}
            submitLabel="Salvar alterações"
            showFileField={true}
            onSubmit={(payload) =>
              updateProposalMut.mutate({
                proposalId: editingProposal.id,
                proposal: payload,
                file: (payload as any)._file || null,
              })
            }
          />
        </Modal>
      )}

      {openReschedule && rescheduleAct && (
        <Modal
          title="Reabrir / Reagendar"
          onClose={() => {
            setOpenReschedule(false);
            setRescheduleAct(null);
          }}
        >
          <RescheduleForm
            loading={rescheduleMut.isPending}
            defaultLocalDT={nowLocalDT()}
            onSubmit={({ localDT, note }) => {
              const iso = toIsoFromLocalDT(localDT);
              if (!iso) {
                alert("Data/hora inválida.");
                return;
              }
              rescheduleMut.mutate({
                activityId: rescheduleAct.id,
                scheduled_for: iso,
                note: note || "",
              });
            }}
          />
        </Modal>
      )}
    </div>
  );
}

/** ===========================
 * UI Components
 * =========================== */

function Card({
  title,
  subtitle,
  icon,
  children,
}: {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-3 mb-4">
        {icon ? (
          <div className="h-9 w-9 rounded-2xl bg-slate-100 flex items-center justify-center">
            {icon}
          </div>
        ) : null}
        <div className="min-w-0">
          <div className="text-sm font-semibold text-slate-900">{title}</div>
          {subtitle ? <div className="text-xs text-slate-500">{subtitle}</div> : null}
        </div>
      </div>
      {children}
    </div>
  );
}

function EmptyState({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
      {children}
    </div>
  );
}

function InfoRow({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3">
      <div className="mt-0.5">{icon}</div>
      <div className="min-w-0">
        <div className="text-xs text-slate-500">{label}</div>
        <div className="text-sm font-semibold text-slate-900 truncate">{value}</div>
      </div>
    </div>
  );
}

/** ===========================
 * Forms
 * =========================== */

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1">
      <label className="text-xs font-semibold text-slate-700">{label}</label>
      {children}
    </div>
  );
}

function PrimaryButton({
  loading,
  disabled,
  children,
}: {
  loading: boolean;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button disabled={disabled} className={btnPrimary + " w-full"}>
      {loading ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          Salvando...
        </>
      ) : (
        children
      )}
    </button>
  );
}

function UploadForm({
  loading,
  onSubmit,
}: {
  loading: boolean;
  onSubmit: (payload: {
    deal: number;
    type: AttachmentType;
    version_label?: string;
    file: File;
  }) => void;
}) {
  const [type, setType] = useState<AttachmentType>("OUTRO");
  const [version, setVersion] = useState("");
  const [file, setFile] = useState<File | null>(null);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!file) return;
        onSubmit({ deal: 0, type, version_label: version || "", file });
      }}
      className="grid gap-4"
    >
      <Field label="Tipo">
        <select
          value={type}
          onChange={(e) => setType(e.target.value as AttachmentType)}
          className={inputCls}
        >
          <option value="OUTRO">Outro</option>
          <option value="MEMORIAL">Memorial</option>
          <option value="CONTRATO">Contrato</option>
          <option value="PROPOSTA">Proposta</option>
        </select>
      </Field>

      <Field label="Versão (opcional)">
        <input
          value={version}
          onChange={(e) => setVersion(e.target.value)}
          placeholder="Ex: v1, v2, revA..."
          className={inputCls}
        />
      </Field>

      <Field label="Arquivo">
        <input
          type="file"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
          className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900"
        />
        <div className="text-[11px] text-slate-500">
          PDF, DOCX, imagens… (backend salva em <b>media/deals/&lt;id&gt;/</b>)
        </div>
      </Field>

      <PrimaryButton loading={loading} disabled={loading || !file}>
        Enviar
      </PrimaryButton>
    </form>
  );
}

function ActivityForm({
  loading,
  onSubmit,
}: {
  loading: boolean;
  onSubmit: (payload: Partial<Activity>) => void;
}) {
  const [type, setType] = useState<ActivityType>("VISITA");
  const [isCommitment, setIsCommitment] = useState(false);

  const [occurredAt, setOccurredAt] = useState<string>(() => nowLocalDT());
  const [scheduledFor, setScheduledFor] = useState<string>(() => {
    const d = new Date();
    d.setHours(d.getHours() + 2);
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
      d.getHours()
    )}:${pad(d.getMinutes())}`;
  });

  const [result, setResult] = useState("");
  const [notes, setNotes] = useState("");

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();

        if (isCommitment) {
          const iso = toIsoFromLocalDT(scheduledFor);
          if (!iso) return alert("Data/hora inválida.");
          if (new Date(iso).getTime() < Date.now()) {
            return alert("Compromisso precisa ser no futuro.");
          }

          onSubmit({
            type,
            status: "PENDING" as any,
            scheduled_for: iso,
            occurred_at: null,
            result: result || "",
            notes: notes || "",
          });
          return;
        }

        onSubmit({
          type,
          status: "DONE" as any,
          occurred_at: toIsoFromLocalDT(occurredAt),
          scheduled_for: null,
          result: result || "",
          notes: notes || "",
        });
      }}
      className="grid gap-4"
    >
      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <label className="flex items-center gap-2 text-sm text-slate-900">
          <input
            type="checkbox"
            checked={isCommitment}
            onChange={(e) => setIsCommitment(e.target.checked)}
          />
          <span className="font-semibold">Agendar como compromisso (data futura)</span>
        </label>
        <div className="mt-1 text-xs text-slate-600">
          Se marcado, fica como <b>PENDENTE</b> até você concluir.
        </div>
      </div>

      <Field label="Tipo">
        <select
          value={type}
          onChange={(e) => setType(e.target.value as ActivityType)}
          className={inputCls}
        >
          <option value="VISITA">Visita</option>
          <option value="LIGACAO">Ligação</option>
          <option value="WHATSAPP">WhatsApp</option>
          <option value="REUNIAO">Reunião</option>
          <option value="EMAIL">Email</option>
          <option value="TAREFA">Tarefa</option>
        </select>
      </Field>

      {isCommitment ? (
        <Field label="Agendar para">
          <input
            type="datetime-local"
            value={scheduledFor}
            onChange={(e) => setScheduledFor(e.target.value)}
            className={inputCls}
            required
          />
        </Field>
      ) : (
        <Field label="Data/Hora que aconteceu">
          <input
            type="datetime-local"
            value={occurredAt}
            onChange={(e) => setOccurredAt(e.target.value)}
            className={inputCls}
          />
        </Field>
      )}

      <Field label="Resultado (curto)">
        <input
          value={result}
          onChange={(e) => setResult(e.target.value)}
          placeholder="Ex: Cliente pediu proposta com permuta"
          className={inputCls}
        />
      </Field>

      <Field label="Observações">
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={5}
          placeholder="Detalhes / próximos passos..."
          className={inputCls}
        />
      </Field>

      <PrimaryButton loading={loading} disabled={loading}>
        {isCommitment ? "Agendar" : "Registrar"}
      </PrimaryButton>
    </form>
  );
}


/** ===========================
 * Reschedule
 * =========================== */

function RescheduleForm({
  loading,
  defaultLocalDT,
  onSubmit,
}: {
  loading: boolean;
  defaultLocalDT: string;
  onSubmit: (payload: { localDT: string; note: string }) => void;
}) {
  const [localDT, setLocalDT] = useState(defaultLocalDT);
  const [note, setNote] = useState("");

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit({ localDT, note });
      }}
      className="grid gap-4"
    >
      <Field label="Nova data/hora">
        <input
          type="datetime-local"
          value={localDT}
          onChange={(e) => setLocalDT(e.target.value)}
          className={inputCls}
          required
        />
      </Field>

      <Field label="Comentário (opcional)">
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={4}
          placeholder="Ex: remarcado..."
          className={inputCls}
        />
      </Field>

      <PrimaryButton loading={loading} disabled={loading}>
        Reabrir e reagendar
      </PrimaryButton>
    </form>
  );
}

/** ===========================
 * Modal
 * =========================== */

function Modal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 bg-black/40 p-4">
      <div className="grid h-full place-items-center">
        <div className="w-full max-w-3xl rounded-3xl border border-slate-200 bg-white shadow-2xl max-h-[92vh] overflow-hidden">
          <div className="flex items-center gap-3 border-b border-slate-200 px-6 py-4">
            <div className="text-base font-semibold text-slate-900">{title}</div>
            <button onClick={onClose} className={btnSecondary + " ml-auto"}>
              <X className="h-4 w-4" />
              Fechar
            </button>
          </div>

          <div className="overflow-y-auto px-6 py-5 max-h-[calc(92vh-80px)]">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}