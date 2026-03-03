import React, { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createContact,
  createProject,
  getAccount,
  listContacts,
  listProjects,
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
} from "lucide-react";

function formatBRL(v: unknown) {
  if (v === null || v === undefined || v === "") return null;
  const n = typeof v === "number" ? v : Number(String(v).replace(",", "."));
  if (!Number.isFinite(n)) return null;
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default function AccountDetail() {
  const { id } = useParams();
  const accountId = Number(id);
  const qc = useQueryClient();

  const accQ = useQuery({
    queryKey: ["account", accountId],
    queryFn: () => getAccount(accountId),
    enabled: Number.isFinite(accountId),
  });

  const contactsQ = useQuery({ queryKey: ["contacts"], queryFn: listContacts });
  const projectsQ = useQuery({ queryKey: ["projects"], queryFn: listProjects });
  const dealsQ = useQuery({ queryKey: ["deals"], queryFn: listDeals });

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

  const [openContact, setOpenContact] = useState(false);
  const [openProject, setOpenProject] = useState(false);
  const [openDeal, setOpenDeal] = useState(false);

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
    },
  });

  if (accQ.isLoading) return <div className="p-6 text-slate-700">Carregando...</div>;
  if (accQ.isError || !accQ.data)
    return <div className="p-6 text-red-600">Conta não encontrada.</div>;

  const a: any = accQ.data;

  const totalPipeline = deals.reduce((acc: number, d: any) => {
    const rawValue = d.valor_total ?? d.value ?? d.amount ?? d.valor ?? null;
    const n =
      rawValue === null || rawValue === undefined || rawValue === ""
        ? NaN
        : Number(String(rawValue).replace(",", "."));
    return Number.isFinite(n) ? acc + n : acc;
  }, 0);

  const busy = mutContact.isPending || mutProject.isPending || mutDeal.isPending;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Top header */}
      <div className="sticky top-0 z-30 border-b border-slate-200 bg-white/80 backdrop-blur">
        <div className="mx-auto max-w-6xl px-6 py-4">
          <div className="flex items-center gap-3">
            <Link
              to="/accounts"
              className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm
                         hover:bg-slate-50 transition"
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
                onClick={() => setOpenDeal(true)}
                className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white
                           hover:bg-slate-800 active:bg-slate-950 transition
                           focus:outline-none focus:ring-4 focus:ring-slate-200"
              >
                <Plus className="h-4 w-4" />
                Nova oportunidade
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

      {/* Content */}
      <div className="mx-auto max-w-6xl px-6 py-6">
        {/* Summary cards */}
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
                ? totalPipeline.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
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

        {/* Sections */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Contatos */}
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
                  </div>
                </div>
              ))}

              {contacts.length === 0 && (
                <EmptyState text="Nenhum contato cadastrado." />
              )}
            </div>
          </SectionCard>

          {/* Empreendimentos */}
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
                  <div className="text-sm font-semibold text-slate-900">
                    {p.name}
                  </div>
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
              ))}

              {projects.length === 0 && (
                <EmptyState text="Nenhum empreendimento cadastrado." />
              )}
            </div>
          </SectionCard>

          {/* Oportunidades */}
          <div className="lg:col-span-2">
            <SectionCard
              title="Oportunidades"
              icon={<BadgeDollarSign className="h-4 w-4 text-slate-700" />}
              actionLabel="Nova oportunidade"
              onAction={() => setOpenDeal(true)}
            >
              <div className="grid gap-3">
                {deals.map((d: any) => {
                  const rawValue =
                    d.valor_total ?? d.value ?? d.amount ?? d.valor ?? null;
                  const brl = formatBRL(rawValue);

                  return (
                    <Link
                      key={d.id}
                      to={`/deals/${d.id}`}
                      className="group block rounded-2xl border border-slate-200 bg-white p-4 shadow-sm
                                 hover:shadow-md hover:border-slate-300 transition"
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
                          <div className="text-xs text-slate-500">Valor</div>
                          <div className="text-sm font-semibold text-slate-900">
                            {brl || "-"}
                          </div>
                        </div>
                      </div>
                    </Link>
                  );
                })}

                {deals.length === 0 && (
                  <EmptyState text="Nenhuma oportunidade cadastrada." />
                )}
              </div>
            </SectionCard>
          </div>
        </div>
      </div>

      {/* Modais */}
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

/* -------------------- UI helpers -------------------- */

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
          className="ml-auto inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-3 py-2 text-sm font-semibold text-white
                     hover:bg-slate-800 transition focus:outline-none focus:ring-4 focus:ring-slate-200"
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

/* -------------------- Forms (clean) -------------------- */

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
          value: value ? Number(String(value).replace(",", ".")) : null,
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
      className="mt-1 inline-flex items-center justify-center gap-2 w-full rounded-2xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white
                 hover:bg-slate-800 active:bg-slate-950 transition
                 disabled:opacity-60 disabled:cursor-not-allowed
                 focus:outline-none focus:ring-4 focus:ring-slate-200"
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

/* -------------------- Modal (clean) -------------------- */

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
            className="ml-auto inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm
                       hover:bg-slate-50 transition"
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