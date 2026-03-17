import React, { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { listAllProposals, type Proposal } from "../proposalsApi";

import {
  createContact,
  createProject,
  getAccount,
  listContacts,
  listProjects,
  updateAccount,
  deleteAccount,
  updateContact,
  deleteContact,
  updateProject,
  deleteProject,
  listUsers,
  transferAccount,
  type CRMUser,
} from "../crmApi";

// ✅ Oportunidades (Kanban)
import { createDeal, listDeals } from "../dealsApi";
import type { DealStage } from "../types";

import {
  Building2,
  ChevronLeft,
  Plus,
  UserRound,
  Phone,
  Mail,
  Briefcase,
  MapPin,
  Hash,
  Layers3,
  CalendarClock,
  BadgeDollarSign,
  X,
  Loader2,
  Pencil,
  Trash2,
} from "lucide-react";

import { api } from "../api";

async function getMe() {
  const { data } = await api.get("/auth/me/");
  return data;
}

function formatBRL(v: unknown) {
  if (v === null || v === undefined || v === "") return null;
  const n = typeof v === "number" ? v : Number(String(v).replace(",", "."));
  if (!Number.isFinite(n)) return null;
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function toNumber(v: unknown): number {
  if (v === null || v === undefined || v === "") return NaN;
  const n = typeof v === "number" ? v : Number(String(v).replace(",", "."));
  return Number.isFinite(n) ? n : NaN;
}

function formatMonthYear(value?: string | null) {
  if (!value) return "";
  const ym = String(value).match(/^(\d{4})-(\d{2})$/);
  if (ym) return `${ym[2]}/${ym[1]}`;

  const ymd = String(value).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (ymd) return `${ymd[2]}/${ymd[1]}`;

  return String(value);
}

function parseMonthYearInput(value: string) {
  const raw = String(value || "").trim();

  if (!raw) return "";

  const m = raw.match(/^(\d{2})\/(\d{4})$/);
  if (!m) return null;

  const month = Number(m[1]);
  const year = m[2];

  if (month < 1 || month > 12) return null;

  return `${year}-${String(month).padStart(2, "0")}`;
}

function normalizeMonthYearTyping(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 6);

  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)}/${digits.slice(2)}`;
}

export default function AccountDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const accountId = Number(id);
  const qc = useQueryClient();
  const meQ = useQuery({
    queryKey: ["me"],
    queryFn: getMe,
  });

  const accQ = useQuery({
    queryKey: ["account", accountId],
    queryFn: () => getAccount(accountId),
    enabled: Number.isFinite(accountId),
  });

  // (por enquanto) buscamos tudo e filtramos local
  const contactsQ = useQuery({ queryKey: ["contacts"], queryFn: listContacts });
  const projectsQ = useQuery({ queryKey: ["projects"], queryFn: listProjects });
  const dealsQ = useQuery({ queryKey: ["deals"], queryFn: listDeals });
  const proposalsQ = useQuery({
    queryKey: ["proposals"],
    queryFn: listAllProposals,
  });

  const usersQ = useQuery({
    queryKey: ["users"],
    queryFn: listUsers,
  });

  const contacts = useMemo(
    () => (contactsQ.data || []).filter((c: any) => c.account === accountId),
    [contactsQ.data, accountId]
  );

  const projects = useMemo(
    () => (projectsQ.data || []).filter((p: any) => p.account === accountId),
    [projectsQ.data, accountId]
  );

  const deals = useMemo(
    () => (dealsQ.data || []).filter((d: any) => d.account === accountId),
    [dealsQ.data, accountId]
  );

  const comerciais = useMemo(
    () => (usersQ.data || []).filter((u: CRMUser) => u.role === "COMERCIAL"),
    [usersQ.data]
  );

  const proposalsByDeal = useMemo(() => {
    const map: Record<number, Proposal[]> = {};

    for (const p of proposalsQ.data || []) {
      const dealId = Number(p.deal);
      if (!Number.isFinite(dealId)) continue;
      if (!map[dealId]) map[dealId] = [];
      map[dealId].push(p);
    }

    return map;
  }, [proposalsQ.data]);

  const [openContact, setOpenContact] = useState(false);
  const [openProject, setOpenProject] = useState(false);
  const [openDeal, setOpenDeal] = useState(false);
  const [dealError, setDealError] = useState<string | null>(null);

  const [openEditAccount, setOpenEditAccount] = useState(false);
  const [editContact, setEditContact] = useState<any | null>(null);
  const [editProject, setEditProject] = useState<any | null>(null);

  const [openTransferAccount, setOpenTransferAccount] = useState(false);
  const [selectedComercialId, setSelectedComercialId] = useState<number | "">("");
  const [transferError, setTransferError] = useState<string | null>(null);

  // ---------------- Mutations: create ----------------

  const mutContact = useMutation({
    mutationFn: createContact,
    onSuccess: async () => {
      setOpenContact(false);
      await qc.invalidateQueries({ queryKey: ["contacts"] });
    },
  });

  const mutProject = useMutation({
    mutationFn: createProject,
    onSuccess: async () => {
      setOpenProject(false);
      await qc.invalidateQueries({ queryKey: ["projects"] });
    },
  });

  const mutDeal = useMutation({
    mutationFn: createDeal,
    onSuccess: async () => {
      setDealError(null);
      setOpenDeal(false);
      await qc.invalidateQueries({ queryKey: ["deals"] });
      await qc.invalidateQueries({ queryKey: ["proposals"] });
    },
    onError: (error: any) => {
      const detail = error?.response?.data?.detail;

      if (error?.response?.status === 403) {
        setDealError(
          detail ||
            "Você não pode cadastrar uma oportunidade nesta construtora porque ela está atribuída a outro comercial. Solicite ao administrador a transferência da conta para você."
        );
        return;
      }

      setDealError("Não foi possível cadastrar a oportunidade. Tente novamente.");
    },
  });

  // ---------------- Mutations: account ----------------

  const mutUpdateAccount = useMutation({
    mutationFn: (payload: any) => updateAccount(accountId, payload),
    onSuccess: async () => {
      setOpenEditAccount(false);
      await qc.invalidateQueries({ queryKey: ["account", accountId] });
      await qc.invalidateQueries({ queryKey: ["accounts"] });
    },
  });

  const mutDeleteAccount = useMutation({
    mutationFn: () => deleteAccount(accountId),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["accounts"] });
      await qc.invalidateQueries({ queryKey: ["contacts"] });
      await qc.invalidateQueries({ queryKey: ["projects"] });
      await qc.invalidateQueries({ queryKey: ["deals"] });
      await qc.invalidateQueries({ queryKey: ["proposals"] });
      navigate("/accounts");
    },
  });

  const mutTransferAccount = useMutation({
    mutationFn: (newComercialId: number) => transferAccount(accountId, newComercialId),
    onSuccess: async () => {
      setTransferError(null);
      setOpenTransferAccount(false);
      setSelectedComercialId("");
      await qc.invalidateQueries({ queryKey: ["account", accountId] });
      await qc.invalidateQueries({ queryKey: ["accounts"] });
      await qc.invalidateQueries({ queryKey: ["deals"] });
      alert("Construtora transferida com sucesso.");
    },
    onError: (error: any) => {
      const detail =
        error?.response?.data?.detail || "Não foi possível transferir a construtora.";
      setTransferError(detail);
    },
  });

  // ---------------- Mutations: contacts/projects ----------------

  const mutUpdateContact = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: any }) =>
      updateContact(id, payload),
    onSuccess: async () => {
      setEditContact(null);
      await qc.invalidateQueries({ queryKey: ["contacts"] });
    },
  });

  const mutDeleteContact = useMutation({
    mutationFn: (id: number) => deleteContact(id),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["contacts"] });
    },
  });

  const mutUpdateProject = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: any }) =>
      updateProject(id, payload),
    onSuccess: async () => {
      setEditProject(null);
      await qc.invalidateQueries({ queryKey: ["projects"] });
    },
  });

  const mutDeleteProject = useMutation({
    mutationFn: (id: number) => deleteProject(id),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["projects"] });
    },
  });

  // ---------------- Loading / errors ----------------

  if (accQ.isLoading || meQ.isLoading) {
    return <div className="p-6 text-slate-700">Carregando...</div>;
  }

  if (accQ.isError || !accQ.data) {
    return <div className="p-6 text-red-600">Conta não encontrada.</div>;
  }

  const a: any = accQ.data;
  const me = meQ.data;

  const canDeleteAccount =
  me?.role === "ADMINISTRADOR" || Number(me?.id) === Number(a.owner);

  const totalPipeline = deals.reduce((acc: number, d: any) => {
    const proposals = proposalsByDeal[d.id] || [];

    if (proposals.length > 0) {
      const totalProps = proposals.reduce((sum, p) => {
        const n = toNumber(p.valor_total);
        return Number.isFinite(n) ? sum + n : sum;
      }, 0);

      return acc + totalProps;
    }

    const rawValue = d.valor_total ?? d.value ?? d.amount ?? d.valor ?? null;
    const n = toNumber(rawValue);
    return Number.isFinite(n) ? acc + n : acc;
  }, 0);

  const busy =
    mutContact.isPending ||
    mutProject.isPending ||
    mutDeal.isPending ||
    mutUpdateAccount.isPending ||
    mutDeleteAccount.isPending ||
    mutUpdateContact.isPending ||
    mutDeleteContact.isPending ||
    mutUpdateProject.isPending ||
    mutDeleteProject.isPending;

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="sticky top-0 z-30 border-b border-slate-200 bg-white/80 backdrop-blur">
        <div className="mx-auto max-w-6xl px-6 py-4">
          <div className="flex items-center gap-3">
            <Link
              to="/accounts"
              className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm hover:bg-slate-50 transition"
              title="Voltar"
            >
              <ChevronLeft className="h-4 w-4" />
              Construtoras
            </Link>

            <div className="ml-1 flex items-center gap-3 min-w-0">
              <div className="h-10 w-10 rounded-2xl bg-slate-900 text-white flex items-center justify-center shadow-sm">
                <Building2 className="h-5 w-5" />
              </div>

              <div className="min-w-0">
                <div className="text-lg font-semibold tracking-tight text-slate-900 truncate">
                  {a.name}
                </div>

                <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-600">
                  {a.cnpj ? (
                    <span className="inline-flex items-center gap-1">
                      <Hash className="h-3.5 w-3.5 text-slate-400" />
                      CNPJ: {a.cnpj}
                    </span>
                  ) : (
                    <span className="text-slate-400">CNPJ não informado</span>
                  )}

                  <span className="inline-flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5 text-slate-400" />
                    {a.city || "-"} / {a.state || "-"}
                  </span>
                </div>

                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                  <span className="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 font-semibold text-blue-700">
                    Criado por: {a.owner_name || "-"}
                  </span>

                  <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 font-semibold text-emerald-700">
                    Comercial responsável: {a.comercial_responsavel_name || "-"}
                  </span>
                </div>
              </div>
            </div>

            <div className="ml-auto flex items-center gap-2">
              <button
                onClick={() => setOpenEditAccount(true)}
                className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 hover:bg-slate-50 transition focus:outline-none focus:ring-4 focus:ring-slate-200"
              >
                <Pencil className="h-4 w-4" />
                Editar
              </button>

              <button
                onClick={() => {
                  setTransferError(null);
                  setSelectedComercialId(
                    a.comercial_responsavel ? Number(a.comercial_responsavel) : ""
                  );
                  setOpenTransferAccount(true);
                }}
                className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 hover:bg-slate-50 transition focus:outline-none focus:ring-4 focus:ring-slate-200"
              >
                <UserRound className="h-4 w-4" />
                Transferir conta
              </button>

              <button
                onClick={() => setOpenDeal(true)}
                className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 active:bg-slate-950 transition focus:outline-none focus:ring-4 focus:ring-slate-200"
              >
                <Plus className="h-4 w-4" />
                Cadastrar Lead
              </button>
            </div>
          </div>

          {busy && (
            <div className="mt-3 flex items-center gap-2 text-sm text-slate-600">
              <Loader2 className="h-4 w-4 animate-spin" />
              Salvando...
            </div>
          )}
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-6 py-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="text-xs text-slate-500">Oportunidades</div>
            <div className="mt-1 text-2xl font-semibold text-slate-900">{deals.length}</div>
            <div className="mt-2 text-xs text-slate-600">Abertas no pipeline</div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="text-xs text-slate-500">Valor no pipeline</div>
            <div className="mt-1 text-2xl font-semibold text-slate-900">
              {totalPipeline
                ? totalPipeline.toLocaleString("pt-BR", {
                    style: "currency",
                    currency: "BRL",
                  })
                : "R$ 0,00"}
            </div>
            <div className="mt-2 text-xs text-slate-600">Somatório dos valores informados</div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="text-xs text-slate-500">Cadastros</div>
            <div className="mt-1 text-2xl font-semibold text-slate-900">
              {contacts.length + projects.length}
            </div>
            <div className="mt-2 text-xs text-slate-600">
              {contacts.length} contato(s) • {projects.length} empreendimento(s)
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <SectionCard
            title="Contatos"
            icon={<UserRound className="h-4 w-4 text-slate-700" />}
            actionLabel="Novo contato"
            onAction={() => setOpenContact(true)}
          >
            <div className="grid gap-3">
              {contacts.map((c: any) => (
                <div
                  key={c.id}
                  className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-slate-900 truncate">
                        {c.name}
                      </div>

                      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-600">
                        <span className="inline-flex items-center gap-1">
                          <Briefcase className="h-3.5 w-3.5 text-slate-400" />
                          {c.role || "-"}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <Phone className="h-3.5 w-3.5 text-slate-400" />
                          {c.phone || "-"}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <Mail className="h-3.5 w-3.5 text-slate-400" />
                          {c.email || "-"}
                        </span>
                      </div>
                    </div>

                    <div className="shrink-0 flex items-center gap-2">
                      <button
                        onClick={() => setEditContact(c)}
                        className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold hover:bg-slate-50 transition"
                        title="Editar contato"
                      >
                        <Pencil className="h-4 w-4" />
                        Editar
                      </button>

                      <button
                        onClick={() => {
                          const ok = window.confirm(`Excluir o contato "${c.name}"?`);
                          if (!ok) return;
                          mutDeleteContact.mutate(c.id);
                        }}
                        className="inline-flex items-center gap-2 rounded-2xl border border-red-200 bg-white px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-50 transition"
                        title="Excluir contato"
                      >
                        <Trash2 className="h-4 w-4" />
                        Excluir
                      </button>
                    </div>
                  </div>
                </div>
              ))}

              {contacts.length === 0 && <EmptyState text="Nenhum contato cadastrado." />}
            </div>
          </SectionCard>

          <SectionCard
            title="Empreendimentos"
            icon={<Layers3 className="h-4 w-4 text-slate-700" />}
            actionLabel="Novo empreendimento"
            onAction={() => setOpenProject(true)}
          >
            <div className="grid gap-3">
              {projects.map((p: any) => (
                <div
                  key={p.id}
                  className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-slate-900">{p.name}</div>
                      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-600">
                        <span className="inline-flex items-center gap-1">
                          <CalendarClock className="h-3.5 w-3.5 text-slate-400" />
                          Entrega: {formatMonthYear(p.obra_entrega_prevista) || "-"}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <MapPin className="h-3.5 w-3.5 text-slate-400" />
                          {p.city || "-"} / {p.state || "-"}
                        </span>
                      </div>
                    </div>

                    <div className="shrink-0 flex items-center gap-2">
                      <button
                        onClick={() => setEditProject(p)}
                        className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold hover:bg-slate-50 transition"
                        title="Editar empreendimento"
                      >
                        <Pencil className="h-4 w-4" />
                        Editar
                      </button>

                      <button
                        onClick={() => {
                          const ok = window.confirm(
                            `Excluir o empreendimento "${p.name}"?\n\nObs: oportunidades ligadas a esse empreendimento ficam com project = null (SET_NULL).`
                          );
                          if (!ok) return;
                          mutDeleteProject.mutate(p.id);
                        }}
                        className="inline-flex items-center gap-2 rounded-2xl border border-red-200 bg-white px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-50 transition"
                        title="Excluir empreendimento"
                      >
                        <Trash2 className="h-4 w-4" />
                        Excluir
                      </button>
                    </div>
                  </div>
                </div>
              ))}

              {projects.length === 0 && <EmptyState text="Nenhum empreendimento cadastrado." />}
            </div>
          </SectionCard>

          <div className="lg:col-span-2">
            <SectionCard
              title="Oportunidades"
              icon={<BadgeDollarSign className="h-4 w-4 text-slate-700" />}
              actionLabel="Cadastrar Lead"
              onAction={() => setOpenDeal(true)}
            >
              <div className="grid gap-3">
                {deals.map((d: any) => {
                  const proposals = proposalsByDeal[d.id] || [];
                  const rawLeadValue =
                    d.valor_total ?? d.value ?? d.amount ?? d.valor ?? null;
                  const leadBRL = formatBRL(rawLeadValue);

                  return (
                    <Link
                      key={d.id}
                      to={`/deals/${d.id}`}
                      className="group block rounded-2xl border border-slate-200 bg-white p-4 shadow-sm hover:shadow-md hover:border-slate-300 transition"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="text-sm font-semibold text-slate-900 truncate">
                            {d.title}
                          </div>

                          {Array.isArray(d.project_names) && d.project_names.length > 0 && (
                            <div className="mt-1 text-xs text-slate-500">
                              Empreendimentos: {d.project_names.join(" • ")}
                            </div>
                          )}

                          <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px]">
                            <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 font-semibold text-emerald-700">
                              Comercial: {d.owner_name || "-"}
                            </span>

                            <span className="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 font-semibold text-blue-700">
                              Criado por: {d.created_by_name || "-"}
                            </span>
                          </div>

                          <div className="mt-2 text-xs text-slate-600">
                            Etapa:{" "}
                            <span className="font-semibold text-slate-800">
                              {d.stage || "-"}
                            </span>
                          </div>
                        </div>

                        <div className="shrink-0 text-right">
                          <div className="text-xs text-slate-500">
                            {proposals.length > 0 ? "Propostas" : "Lead"}
                          </div>

                          {proposals.length > 0 ? (
                            <div className="mt-1 flex flex-col items-end gap-1">
                              {proposals.map((p, idx) => (
                                <div key={p.id} className="text-sm font-semibold text-slate-900">
                                  P{idx + 1}: {formatBRL(p.valor_total) || "-"}
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="text-sm font-semibold text-slate-900">
                              {leadBRL || "-"}
                            </div>
                          )}
                        </div>
                      </div>
                    </Link>
                  );
                })}

                {deals.length === 0 && <EmptyState text="Nenhuma oportunidade cadastrada." />}
              </div>
            </SectionCard>
          </div>
        </div>
      </div>

      {openEditAccount && (
      <Modal title="Editar Construtora" onClose={() => setOpenEditAccount(false)}>
        <AccountEditForm
          initial={a}
          loading={mutUpdateAccount.isPending || mutDeleteAccount.isPending}
          canDelete={canDeleteAccount}
          onSubmit={(payload) => mutUpdateAccount.mutate(payload)}
          onDelete={() => {
            const msg =
              "Tem certeza que deseja EXCLUIR esta construtora?\n\n" +
              "Isso vai apagar também:\n" +
              `- ${projects.length} empreendimento(s)\n` +
              `- ${contacts.length} contato(s)\n` +
              `- ${deals.length} oportunidade(s)\n` +
              "E tudo ligado às oportunidades (atividades, propostas, anexos, etc).\n\n" +
              "Essa ação NÃO pode ser desfeita.";
            const ok = window.confirm(msg);
            if (!ok) return;
            mutDeleteAccount.mutate();
          }}
        />
      </Modal>
    )}

      {editContact && (
        <Modal title="Editar Contato" onClose={() => setEditContact(null)}>
          <ContactEditForm
            initial={editContact}
            loading={mutUpdateContact.isPending}
            onSubmit={(payload: any) =>
              mutUpdateContact.mutate({ id: editContact.id, payload })
            }
          />
        </Modal>
      )}

      {editProject && (
        <Modal title="Editar Empreendimento" onClose={() => setEditProject(null)}>
          <ProjectEditForm
            initial={editProject}
            loading={mutUpdateProject.isPending}
            onSubmit={(payload: any) =>
              mutUpdateProject.mutate({ id: editProject.id, payload })
            }
          />
        </Modal>
      )}

      {openTransferAccount && (
        <Modal
          title="Transferir Construtora"
          onClose={() => {
            setOpenTransferAccount(false);
            setTransferError(null);
          }}
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!selectedComercialId) {
                setTransferError("Selecione o novo comercial responsável.");
                return;
              }
              mutTransferAccount.mutate(Number(selectedComercialId));
            }}
            className="grid gap-4"
          >
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
              <div>
                <b>Construtora:</b> {a.name}
              </div>
              <div className="mt-1">
                <b>Comercial atual:</b>{" "}
                {a.comercial_responsavel_name || a.owner_name || "-"}
              </div>
              <div className="mt-2 text-xs text-slate-500">
                As oportunidades abertas desta construtora serão transferidas para o novo comercial.
                O criador original das oportunidades será preservado.
              </div>
            </div>

            <Field label="Novo comercial responsável">
              <select
                value={selectedComercialId}
                onChange={(e) =>
                  setSelectedComercialId(e.target.value ? Number(e.target.value) : "")
                }
                className={inputCls}
              >
                <option value="">Selecione...</option>
                {comerciais.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.full_name || u.username}
                  </option>
                ))}
              </select>
            </Field>

            {transferError && (
              <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {transferError}
              </div>
            )}

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  setOpenTransferAccount(false);
                  setTransferError(null);
                }}
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition"
              >
                Cancelar
              </button>

              <PrimaryButton
                loading={mutTransferAccount.isPending}
                disabled={!selectedComercialId}
              >
                Transferir
              </PrimaryButton>
            </div>
          </form>
        </Modal>
      )}

      {openContact && (
        <Modal title="Novo Contato" onClose={() => setOpenContact(false)}>
          <ContactForm
            loading={mutContact.isPending}
            onSubmit={(payload: any) =>
              mutContact.mutate({ ...payload, account: accountId })
            }
          />
        </Modal>
      )}

      {openProject && (
        <Modal title="Novo Empreendimento" onClose={() => setOpenProject(false)}>
          <ProjectForm
            loading={mutProject.isPending}
            onSubmit={(payload: any) =>
              mutProject.mutate({ ...payload, account: accountId })
            }
          />
        </Modal>
      )}

      {openDeal && (
        <Modal
          title="Nova Oportunidade"
          onClose={() => {
            setDealError(null);
            setOpenDeal(false);
          }}
        >
          <DealForm
            loading={mutDeal.isPending}
            errorMessage={dealError}
            projects={projects}
            existingDeals={deals}
            onCreateProject={(payload: any) =>
              mutProject.mutateAsync({ ...payload, account: accountId })
            }
            onSubmit={(payload: any) => {
              setDealError(null);
              mutDeal.mutate({
                ...payload,
                account: accountId,
                stage: "LEAD" as DealStage,
              });
            }}
          />
        </Modal>
      )}
    </div>
  );
}

function SectionCard({
  title,
  icon,
  actionLabel,
  onAction,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  actionLabel: string;
  onAction: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-3 mb-4">
        <div className="h-9 w-9 rounded-2xl bg-slate-100 flex items-center justify-center">
          {icon}
        </div>
        <div className="text-sm font-semibold text-slate-900">{title}</div>

        <button
          onClick={onAction}
          className="ml-auto inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-800 transition focus:outline-none focus:ring-4 focus:ring-slate-200"
        >
          <Plus className="h-4 w-4" />
          {actionLabel}
        </button>
      </div>

      {children}
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
      {text}
    </div>
  );
}

function AccountEditForm({
  initial,
  loading,
  canDelete,
  onSubmit,
  onDelete,
}: {
  initial: any;
  loading: boolean;
  canDelete: boolean;
  onSubmit: (payload: any) => void;
  onDelete: () => void;
}) {
  const [name, setName] = useState(initial?.name || "");
  const [cnpj, setCnpj] = useState(initial?.cnpj || "");
  const [city, setCity] = useState(initial?.city || "");
  const [state, setState] = useState(initial?.state || "");
  const [isActive, setIsActive] = useState(Boolean(initial?.is_active ?? true));

  const canSubmit = name.trim().length > 0 && !loading;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit({
          name,
          cnpj,
          city,
          state: (state || "").toUpperCase().slice(0, 2),
          is_active: isActive,
        });
      }}
      className="grid gap-4"
    >
      <Field label="Nome da construtora">
        <input
          placeholder="Nome"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          className={inputCls}
        />
      </Field>

      <Field label="CNPJ">
        <input
          placeholder="00.000.000/0000-00"
          value={cnpj}
          onChange={(e) => setCnpj(e.target.value)}
          className={inputCls}
        />
      </Field>

      <div className="grid grid-cols-1 md:grid-cols-[1fr_120px] gap-4">
        <Field label="Cidade">
          <input
            placeholder="Cidade"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            className={inputCls}
          />
        </Field>

        <Field label="UF">
          <input
            placeholder="UF"
            value={state}
            onChange={(e) => setState(e.target.value.toUpperCase())}
            maxLength={2}
            className={inputCls}
          />
        </Field>
      </div>

      <div className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 p-3">
        <div>
          <div className="text-sm font-semibold text-slate-900">Ativa</div>
          <div className="text-xs text-slate-600">Desative para “arquivar” sem excluir.</div>
        </div>
        <label className="inline-flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
            className="h-4 w-4"
          />
          {isActive ? "Sim" : "Não"}
        </label>
      </div>

      <PrimaryButton loading={loading} disabled={!canSubmit}>
        Salvar alterações
      </PrimaryButton>

      {canDelete && (
        <button
          type="button"
          onClick={onDelete}
          disabled={loading}
          className="inline-flex items-center justify-center gap-2 w-full rounded-2xl border border-red-200 bg-white px-4 py-2.5 text-sm font-semibold text-red-700 hover:bg-red-50 transition disabled:opacity-60 disabled:cursor-not-allowed"
        >
          <Trash2 className="h-4 w-4" />
          Excluir construtora
        </button>
      )}

      <div className="text-xs text-slate-500">
        * Excluir remove permanentemente a construtora e tudo ligado a ela.
      </div>
    </form>
  );
}

function ContactForm({
  loading,
  onSubmit,
}: {
  loading: boolean;
  onSubmit: (payload: any) => void;
}) {
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");

  const canSubmit = name.trim().length > 0 && !loading;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit({ name, role, phone, email, is_primary: false });
      }}
      className="grid gap-4"
    >
      <Field label="Nome">
        <input
          placeholder="Nome"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          className={inputCls}
        />
      </Field>

      <Field label="Cargo / Função">
        <input
          placeholder="Cargo / Função"
          value={role}
          onChange={(e) => setRole(e.target.value)}
          className={inputCls}
        />
      </Field>

      <Field label="Telefone">
        <input
          placeholder="Telefone"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          className={inputCls}
        />
      </Field>

      <Field label="Email">
        <input
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={inputCls}
        />
      </Field>

      <PrimaryButton loading={loading} disabled={!canSubmit}>
        Salvar
      </PrimaryButton>
    </form>
  );
}

function ContactEditForm({
  initial,
  loading,
  onSubmit,
}: {
  initial: any;
  loading: boolean;
  onSubmit: (payload: any) => void;
}) {
  const [name, setName] = useState(initial?.name || "");
  const [role, setRole] = useState(initial?.role || "");
  const [phone, setPhone] = useState(initial?.phone || "");
  const [email, setEmail] = useState(initial?.email || "");
  const [isPrimary, setIsPrimary] = useState(Boolean(initial?.is_primary));

  const canSubmit = name.trim().length > 0 && !loading;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit({
          name,
          role,
          phone,
          email,
          is_primary: isPrimary,
        });
      }}
      className="grid gap-4"
    >
      <Field label="Nome">
        <input
          placeholder="Nome"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          className={inputCls}
        />
      </Field>

      <Field label="Cargo / Função">
        <input
          placeholder="Cargo / Função"
          value={role}
          onChange={(e) => setRole(e.target.value)}
          className={inputCls}
        />
      </Field>

      <Field label="Telefone">
        <input
          placeholder="Telefone"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          className={inputCls}
        />
      </Field>

      <Field label="Email">
        <input
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={inputCls}
        />
      </Field>

      <div className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 p-3">
        <div>
          <div className="text-sm font-semibold text-slate-900">Contato principal</div>
          <div className="text-xs text-slate-600">Marque se for o contato preferencial.</div>
        </div>
        <label className="inline-flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={isPrimary}
            onChange={(e) => setIsPrimary(e.target.checked)}
            className="h-4 w-4"
          />
          {isPrimary ? "Sim" : "Não"}
        </label>
      </div>

      <PrimaryButton loading={loading} disabled={!canSubmit}>
        Salvar alterações
      </PrimaryButton>
    </form>
  );
}

function ProjectForm({
  loading,
  onSubmit,
}: {
  loading: boolean;
  onSubmit: (payload: any) => void;
}) {
  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("PR");
  const [obra, setObra] = useState("");

  const obraParsed = parseMonthYearInput(obra);
  const obraMissing = obra.trim().length === 0;
  const obraInvalid = obra.trim().length > 0 && obraParsed === null;

  const canSubmit =
    name.trim().length > 0 &&
    !loading &&
    !obraMissing &&
    !obraInvalid;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();

        if (obraMissing || obraInvalid) return;

        onSubmit({
          name,
          city,
          state: (state || "").toUpperCase().slice(0, 2),
          obra_entrega_prevista: obraParsed || null,
          notes: "",
        });
      }}
      className="grid gap-4"
    >
      <Field label="Nome do empreendimento">
        <input
          placeholder="Nome do empreendimento"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          className={inputCls}
        />
      </Field>

      <div className="grid grid-cols-1 md:grid-cols-[1fr_120px] gap-4">
        <Field label="Cidade">
          <input
            placeholder="Cidade"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            className={inputCls}
          />
        </Field>

        <Field label="UF">
          <input
            placeholder="UF"
            value={state}
            onChange={(e) => setState(e.target.value.toUpperCase())}
            maxLength={2}
            className={inputCls}
          />
        </Field>
      </div>

      <Field label="Entrega obra (MM/AAAA) *">
        <div className="grid gap-1">
          <input
            placeholder="12/2026"
            value={obra}
            onChange={(e) => setObra(normalizeMonthYearTyping(e.target.value))}
            className={inputCls}
          />
          {obraMissing && (
            <div className="text-xs text-red-600">
              Informe a entrega da obra.
            </div>
          )}
          {!obraMissing && obraInvalid && (
            <div className="text-xs text-red-600">
              Informe no formato MM/AAAA.
            </div>
          )}
        </div>
      </Field>

      <PrimaryButton loading={loading} disabled={!canSubmit}>
        Salvar
      </PrimaryButton>
    </form>
  );
}

function ProjectEditForm({
  initial,
  loading,
  onSubmit,
}: {
  initial: any;
  loading: boolean;
  onSubmit: (payload: any) => void;
}) {
  const [name, setName] = useState(initial?.name || "");
  const [city, setCity] = useState(initial?.city || "");
  const [state, setState] = useState(initial?.state || "PR");
  const [obra, setObra] = useState(
    formatMonthYear(initial?.obra_entrega_prevista || "")
  );

  const obraParsed = parseMonthYearInput(obra);
  const obraMissing = obra.trim().length === 0;
  const obraInvalid = obra.trim().length > 0 && obraParsed === null;

  const canSubmit =
    name.trim().length > 0 &&
    !loading &&
    !obraMissing &&
    !obraInvalid;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();

        if (obraMissing || obraInvalid) return;

        onSubmit({
          name,
          city,
          state: (state || "").toUpperCase().slice(0, 2),
          obra_entrega_prevista: obraParsed || null,
        });
      }}
      className="grid gap-4"
    >
      <Field label="Nome do empreendimento">
        <input
          placeholder="Nome do empreendimento"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          className={inputCls}
        />
      </Field>

      <div className="grid grid-cols-1 md:grid-cols-[1fr_120px] gap-4">
        <Field label="Cidade">
          <input
            placeholder="Cidade"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            className={inputCls}
          />
        </Field>

        <Field label="UF">
          <input
            placeholder="UF"
            value={state}
            onChange={(e) => setState(e.target.value.toUpperCase())}
            maxLength={2}
            className={inputCls}
          />
        </Field>
      </div>

      <Field label="Entrega obra (MM/AAAA) *">
        <div className="grid gap-1">
          <input
            placeholder="12/2026"
            value={obra}
            onChange={(e) => setObra(normalizeMonthYearTyping(e.target.value))}
            className={inputCls}
          />
          {obraMissing && (
            <div className="text-xs text-red-600">
              Informe a entrega da obra.
            </div>
          )}
          {!obraMissing && obraInvalid && (
            <div className="text-xs text-red-600">
              Informe no formato MM/AAAA.
            </div>
          )}
        </div>
      </Field>

      <PrimaryButton loading={loading} disabled={!canSubmit}>
        Salvar alterações
      </PrimaryButton>
    </form>
  );
}


function DealForm({
  loading,
  errorMessage,
  projects,
  existingDeals,
  onSubmit,
  onCreateProject,
}: {
  loading: boolean;
  errorMessage?: string | null;
  projects: any[];
  existingDeals: any[];
  onSubmit: (payload: any) => void;
  onCreateProject: (payload: any) => Promise<any>;
}) {
  const [title, setTitle] = useState("");
  const [value, setValue] = useState<string>("");
  const [selectedProjects, setSelectedProjects] = useState<number[]>([]);

  const [showInlineProject, setShowInlineProject] = useState(false);
  const [projectName, setProjectName] = useState("");
  const [projectCity, setProjectCity] = useState("");
  const [projectState, setProjectState] = useState("PR");
  const [projectObra, setProjectObra] = useState("");
  const [triedInlineProjectSave, setTriedInlineProjectSave] = useState(false);

  const projectObraParsed = parseMonthYearInput(projectObra);
  const projectObraMissing = projectObra.trim().length === 0;
  const projectObraInvalid =
    projectObra.trim().length > 0 && projectObraParsed === null;

  const selectedProjectObjects = projects.filter((p: any) =>
    selectedProjects.includes(p.id)
  );

  const suggestedTitle = useMemo(() => {
    if (selectedProjectObjects.length === 0) return "";
    if (selectedProjectObjects.length === 1) return selectedProjectObjects[0].name;

    const first = selectedProjectObjects[0]?.name || "Empreendimento";
    return `${first} + ${selectedProjectObjects.length - 1} empreendimento(s)`;
  }, [selectedProjectObjects]);

  const effectiveTitle = title.trim() || suggestedTitle;

  const conflictingDeals = useMemo(() => {
    return (existingDeals || []).filter((d: any) => {
      const ids =
        Array.isArray(d?.projects) && d.projects.length > 0
          ? d.projects.map((x: any) => Number(x))
          : d?.project
          ? [Number(d.project)]
          : [];

      return ids.some((id: number) => selectedProjects.includes(id));
    });
  }, [existingDeals, selectedProjects]);

  const conflictingProjectNames = useMemo(() => {
    const names = new Set<string>();

    for (const p of projects) {
      if (!selectedProjects.includes(p.id)) continue;

      const exists = conflictingDeals.some((d: any) => {
        const ids =
          Array.isArray(d?.projects) && d.projects.length > 0
            ? d.projects.map((x: any) => Number(x))
            : d?.project
            ? [Number(d.project)]
            : [];

        return ids.includes(Number(p.id));
      });

      if (exists) names.add(p.name);
    }

    return Array.from(names);
  }, [projects, selectedProjects, conflictingDeals]);

  const conflictingDealTitles = useMemo(() => {
    return Array.from(
      new Set(
        conflictingDeals
          .map((d: any) => String(d?.title || "").trim())
          .filter(Boolean)
      )
    );
  }, [conflictingDeals]);

  const canSubmit =
    selectedProjects.length > 0 &&
    effectiveTitle.trim().length > 0 &&
    !loading;

  async function handleCreateInlineProject() {
    setTriedInlineProjectSave(true);

    if (!projectName.trim()) return;
    if (projectObraMissing) return;
    if (projectObraInvalid) return;

    const created = await onCreateProject({
      name: projectName,
      city: projectCity,
      state: (projectState || "").toUpperCase().slice(0, 2),
      obra_entrega_prevista: projectObraParsed || null,
      notes: "",
    });

    if (created?.id) {
      setSelectedProjects((prev) =>
        prev.includes(created.id) ? prev : [...prev, created.id]
      );
    }

    setProjectName("");
    setProjectCity("");
    setProjectState("PR");
    setProjectObra("");
    setTriedInlineProjectSave(false);
    setShowInlineProject(false);
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();

        if (!canSubmit) return;

        onSubmit({
          title: effectiveTitle,
          projects: selectedProjects,
          project: selectedProjects[0] ?? null,
          valor_total: value ? Number(String(value).replace(",", ".")) : null,
        });
      }}
      className="grid gap-4"
    >
      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <div className="mb-2 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="text-sm font-semibold text-slate-900">Empreendimentos</div>
            <div className="text-xs text-slate-600">
              Selecione um ou mais empreendimentos desta construtora.
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowInlineProject((v) => !v)}
            className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-2xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition shrink-0"
          >
            <Plus className="h-4 w-4 text-slate-500" />
            {showInlineProject ? "Ocultar formulário" : "Novo empreendimento"}
          </button>
        </div>

        {projects.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-3 text-sm text-slate-600">
            Nenhum empreendimento cadastrado ainda.
          </div>
        ) : (
          <div className="grid gap-2">
            {projects.map((p: any) => {
              const checked = selectedProjects.includes(p.id);

              return (
                <label
                  key={p.id}
                  className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800"
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={(e) =>
                      setSelectedProjects((prev) =>
                        e.target.checked
                          ? [...prev, p.id]
                          : prev.filter((x) => x !== p.id)
                      )
                    }
                  />
                  <span className="font-medium">{p.name}</span>

                  {p.city || p.state ? (
                    <span className="text-xs text-slate-500">
                      • {p.city || "-"} / {p.state || "-"}
                    </span>
                  ) : null}

                  {p.obra_entrega_prevista ? (
                    <span className="text-xs text-slate-500">
                      • entrega {formatMonthYear(p.obra_entrega_prevista)}
                    </span>
                  ) : null}
                </label>
              );
            })}
          </div>
        )}

        {conflictingDeals.length > 0 && (
          <div className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
            <div className="font-semibold">Atenção</div>
            <div className="mt-1">
              Já existem oportunidades cadastradas para empreendimento(s) selecionado(s):
              {" "}
              <b>{conflictingProjectNames.join(", ")}</b>.
            </div>
            {conflictingDealTitles.length > 0 && (
              <div className="mt-1 text-xs text-amber-800">
                Oportunidades encontradas: {conflictingDealTitles.join(" • ")}
              </div>
            )}
          </div>
        )}

        {showInlineProject && (
          <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4">
            <div className="mb-4 text-sm font-semibold text-slate-900">
              Novo empreendimento
            </div>

            <div className="grid gap-4">
              <Field label="Nome do empreendimento">
                <input
                  placeholder="Nome do empreendimento"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  className={inputCls}
                />
              </Field>

              <div className="grid grid-cols-1 md:grid-cols-[1fr_110px_160px] gap-4">
                <Field label="Cidade">
                  <input
                    placeholder="Cidade"
                    value={projectCity}
                    onChange={(e) => setProjectCity(e.target.value)}
                    className={inputCls}
                  />
                </Field>

                <Field label="UF">
                  <input
                    placeholder="UF"
                    value={projectState}
                    onChange={(e) => setProjectState(e.target.value.toUpperCase())}
                    maxLength={2}
                    className={inputCls}
                  />
                </Field>

                <Field label="Entrega obra *">
                  <div className="grid gap-1">
                    <input
                      placeholder="12/2026"
                      value={projectObra}
                      onChange={(e) =>
                        setProjectObra(normalizeMonthYearTyping(e.target.value))
                      }
                      className={inputCls}
                    />
                    {triedInlineProjectSave && projectObraMissing && (
                      <div className="text-xs text-red-600">
                        Informe a entrega da obra.
                      </div>
                    )}
                    {!projectObraMissing && projectObraInvalid && (
                      <div className="text-xs text-red-600">
                        Informe no formato MM/AAAA.
                      </div>
                    )}
                  </div>
                </Field>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row">
                <button
                  type="button"
                  onClick={handleCreateInlineProject}
                  disabled={!projectName.trim() || projectObraMissing || projectObraInvalid}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 transition disabled:bg-slate-300 disabled:text-slate-600 disabled:cursor-not-allowed"
                >
                  Salvar empreendimento
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setShowInlineProject(false);
                    setTriedInlineProjectSave(false);
                  }}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <Field label="Título da oportunidade">
        <input
          placeholder={suggestedTitle || "Ex: Pacote Torre A + Torre B"}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className={inputCls}
        />
        {suggestedTitle && !title.trim() && (
          <div className="text-xs text-slate-500">
            Sugestão automática: <b>{suggestedTitle}</b>
          </div>
        )}
      </Field>

      <Field label="Valor (opcional)">
        <input
          placeholder="Ex: 180000"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          inputMode="numeric"
          className={inputCls}
        />
      </Field>

      {errorMessage && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {errorMessage}
        </div>
      )}

      <PrimaryButton loading={loading} disabled={!canSubmit}>
        Salvar
      </PrimaryButton>
    </form>
  );
}


function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1">
      <label className="text-xs font-semibold text-slate-700">{label}</label>
      {children}
    </div>
  );
}

const inputCls =
  "w-full rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-slate-900 placeholder:text-slate-400 " +
  "outline-none focus:ring-4 focus:ring-slate-200 focus:border-slate-300";

function PrimaryButton({
  children,
  loading,
  disabled,
}: {
  children: React.ReactNode;
  loading: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      disabled={disabled}
      className="mt-1 inline-flex items-center justify-center gap-2 w-full rounded-2xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 active:bg-slate-950 transition disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus:ring-4 focus:ring-slate-200"
    >
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
        <div
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-3xl rounded-3xl border border-slate-200 bg-white shadow-2xl max-h-[92vh] overflow-hidden"
        >
          <div className="flex items-center gap-3 border-b border-slate-200 px-6 py-4">
            <div className="text-base font-semibold text-slate-900">{title}</div>
            <button
              onClick={onClose}
              className="ml-auto inline-flex items-center gap-2 rounded-2xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition"
            >
              <X className="h-4 w-4 text-slate-500" />
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