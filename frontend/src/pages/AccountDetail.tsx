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

export default function AccountDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const accountId = Number(id);
  const qc = useQueryClient();

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

  const [openEditAccount, setOpenEditAccount] = useState(false);
  const [editContact, setEditContact] = useState<any | null>(null);
  const [editProject, setEditProject] = useState<any | null>(null);

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
      setOpenDeal(false);
      await qc.invalidateQueries({ queryKey: ["deals"] });
      await qc.invalidateQueries({ queryKey: ["proposals"] });
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

  if (accQ.isLoading) return <div className="p-6 text-slate-700">Carregando...</div>;
  if (accQ.isError || !accQ.data)
    return <div className="p-6 text-red-600">Conta não encontrada.</div>;

  const a: any = accQ.data;

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
                          Entrega: {p.obra_entrega_prevista || "-"}
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
                          <div className="mt-1 text-xs text-slate-600">
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
        <Modal title="Nova Oportunidade" onClose={() => setOpenDeal(false)}>
          <DealForm
            loading={mutDeal.isPending}
            onSubmit={(payload: any) =>
              mutDeal.mutate({
                ...payload,
                account: accountId,
                stage: "LEAD" as DealStage,
              })
            }
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
  onSubmit,
  onDelete,
}: {
  initial: any;
  loading: boolean;
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

      <button
        type="button"
        onClick={onDelete}
        disabled={loading}
        className="inline-flex items-center justify-center gap-2 w-full rounded-2xl border border-red-200 bg-white px-4 py-2.5 text-sm font-semibold text-red-700 hover:bg-red-50 transition disabled:opacity-60 disabled:cursor-not-allowed"
      >
        <Trash2 className="h-4 w-4" />
        Excluir construtora
      </button>

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

  const canSubmit = name.trim().length > 0 && !loading;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit({
          name,
          city,
          state,
          obra_entrega_prevista: obra || null,
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

      <Field label="Entrega obra (YYYY-MM-DD)">
        <input
          placeholder="2026-12-31"
          value={obra}
          onChange={(e) => setObra(e.target.value)}
          className={inputCls}
        />
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
  const [obra, setObra] = useState(initial?.obra_entrega_prevista || "");

  const canSubmit = name.trim().length > 0 && !loading;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit({
          name,
          city,
          state: (state || "").toUpperCase().slice(0, 2),
          obra_entrega_prevista: obra || null,
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

      <Field label="Entrega obra (YYYY-MM-DD)">
        <input
          placeholder="2026-12-31"
          value={obra}
          onChange={(e) => setObra(e.target.value)}
          className={inputCls}
        />
      </Field>

      <PrimaryButton loading={loading} disabled={!canSubmit}>
        Salvar alterações
      </PrimaryButton>
    </form>
  );
}

function DealForm({
  loading,
  onSubmit,
}: {
  loading: boolean;
  onSubmit: (payload: any) => void;
}) {
  const [title, setTitle] = useState("");
  const [value, setValue] = useState<string>("");

  const canSubmit = title.trim().length > 0 && !loading;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit({
          title,
          valor_total: value ? Number(String(value).replace(",", ".")) : null,
        });
      }}
      className="grid gap-4"
    >
      <Field label="Título">
        <input
          placeholder="Ex: Big Tower - 2 elevadores"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          className={inputCls}
        />
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
    <div
      onClick={onClose}
      className="fixed inset-0 bg-black/40 grid place-items-center p-4 z-50"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-xl rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl"
      >
        <div className="flex items-center gap-3 mb-5">
          <div className="text-base font-semibold text-slate-900">{title}</div>
          <button
            onClick={onClose}
            className="ml-auto inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm hover:bg-slate-50 transition"
          >
            <X className="h-4 w-4" />
            Fechar
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}