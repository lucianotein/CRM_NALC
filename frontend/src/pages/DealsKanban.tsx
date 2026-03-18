import React, { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Deal, DealStage } from "../types";
import { listDeals, updateDealStage } from "../dealsApi";
import {
  createDeal,
  listAccounts,
  listUsers,
  type Account,
  type CRMUser,
} from "../crmApi";
import { listAllProposals, type Proposal } from "../proposalsApi";
import { Link } from "react-router-dom";
import { api } from "../api";
import {
  Building2,
  Plus,
  Search,
  X,
  Loader2,
  CalendarClock,
  BadgeDollarSign,
  Layers3,
  UserRound,
} from "lucide-react";

const COLUMNS: { key: DealStage; title: string; accent: string }[] = [
  { key: "LEAD", title: "Lead", accent: "bg-slate-200" },
  { key: "CONTATO", title: "Contato", accent: "bg-blue-200" },
  { key: "PROPOSTA", title: "Proposta", accent: "bg-amber-200" },
  { key: "NEGOCIACAO", title: "Negociação", accent: "bg-purple-200" },
  { key: "FECHADO_GANHO", title: "Fechado", accent: "bg-emerald-200" },
];

type Me = {
  id: number;
  username: string;
  email: string;
  role: "ADMINISTRADOR" | "COMERCIAL";
};

type DealWithExtras = Deal & {
  account_name?: string;
  project_name?: string | null;
  project_names?: string[];
  valor_total?: string | number | null;
  owner_name?: string | null;
};

async function getMe(): Promise<Me> {
  const { data } = await api.get("/auth/me/");
  return data;
}

function formatBRL(v: unknown) {
  if (v === null || v === undefined || v === "") return null;
  const n = typeof v === "number" ? v : Number(String(v).replace(",", "."));
  if (!Number.isFinite(n)) return null;
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatDateTimeBR(v: unknown) {
  if (!v) return "-";
  try {
    return new Date(String(v)).toLocaleString("pt-BR");
  } catch {
    return "-";
  }
}

function parseMoney(v: unknown): number {
  if (v === null || v === undefined || v === "") return NaN;
  if (typeof v === "number") return v;

  const raw = String(v).trim();
  if (!raw) return NaN;

  if (raw.includes(",")) {
    const n = Number(raw.replace(/\./g, "").replace(",", "."));
    return Number.isFinite(n) ? n : NaN;
  }

  const n = Number(raw);
  return Number.isFinite(n) ? n : NaN;
}

export default function DealsKanban() {
  const qc = useQueryClient();

  const meQ = useQuery({
    queryKey: ["me"],
    queryFn: getMe,
  });

  const dealsQ = useQuery({ queryKey: ["deals"], queryFn: listDeals });
  const accountsQ = useQuery({ queryKey: ["accounts"], queryFn: listAccounts });
  const usersQ = useQuery({ queryKey: ["users"], queryFn: listUsers });
  const proposalsQ = useQuery({
    queryKey: ["proposals"],
    queryFn: listAllProposals,
  });

  const [draggingId, setDraggingId] = useState<number | null>(null);
  const [openNew, setOpenNew] = useState(false);
  const [q, setQ] = useState("");
  const [commercialFilterMode, setCommercialFilterMode] = useState<"ALL" | "MINE" | "CUSTOM">("ALL");
  const [selectedCommercialIds, setSelectedCommercialIds] = useState<number[]>([]);

  const updateStageMut = useMutation({
    mutationFn: ({ id, stage }: { id: number; stage: DealStage }) =>
      updateDealStage(id, stage),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["deals"] }),
  });

  const createDealMut = useMutation({
    mutationFn: createDeal,
    onSuccess: async () => {
      setOpenNew(false);
      await qc.invalidateQueries({ queryKey: ["deals"] });
    },
  });

  const me = meQ.data;
  const isAdmin = me?.role === "ADMINISTRADOR";

  const commercials = useMemo(
    () => (usersQ.data || []).filter((u: CRMUser) => u.role === "COMERCIAL"),
    [usersQ.data]
  );

  const filteredDeals = useMemo(() => {
    const all = (dealsQ.data || []) as DealWithExtras[];
    const needle = q.trim().toLowerCase();

    let base = all;

    if (isAdmin) {
      if (commercialFilterMode === "MINE") {
        base = base.filter((d) => Number(d.owner) === Number(me?.id));
      } else if (commercialFilterMode === "CUSTOM" && selectedCommercialIds.length > 0) {
        base = base.filter((d) => selectedCommercialIds.includes(Number(d.owner)));
      }
    }

    if (!needle) return base;

    return base.filter((d) => {
      const a = String(d.title || "").toLowerCase();
      const b = String(d.account_name || "").toLowerCase();
      const c = String(d.project_name || "").toLowerCase();
      const dNames = Array.isArray(d.project_names)
        ? d.project_names.join(" ").toLowerCase()
        : "";
      const e = String(d.owner_name || "").toLowerCase();

      return (
        a.includes(needle) ||
        b.includes(needle) ||
        c.includes(needle) ||
        dNames.includes(needle) ||
        e.includes(needle)
      );
    });
  }, [dealsQ.data, q, isAdmin, commercialFilterMode, selectedCommercialIds, me?.id]);

  const proposalsByDeal = useMemo(() => {
    const map: Record<number, Proposal[]> = {};
    const proposals = proposalsQ.data || [];

    for (const p of proposals) {
      const dealId = Number((p as any).deal);
      if (!Number.isFinite(dealId)) continue;
      (map[dealId] ||= []).push(p);
    }

    for (const dealId of Object.keys(map)) {
      map[Number(dealId)].sort((a: any, b: any) => {
        const ta = a?.created_at ? new Date(a.created_at).getTime() : 0;
        const tb = b?.created_at ? new Date(b.created_at).getTime() : 0;
        if (ta !== tb) return ta - tb;
        return Number(a?.id || 0) - Number(b?.id || 0);
      });
    }

    return map;
  }, [proposalsQ.data]);

  function dealBaseValue(d: DealWithExtras): number {
    const n = parseMoney(d.valor_total);
    return Number.isFinite(n) ? n : 0;
  }

  function validProposalSum(dealId: number): number {
    const ps = proposalsByDeal[dealId] || [];
    if (ps.length === 0) return NaN;

    let total = 0;
    let hasAnyValid = false;

    for (const p of ps as any[]) {
      if (p?.status === "REJECTED") continue;

      const n = parseMoney(p?.valor_total);
      if (Number.isFinite(n)) {
        total += n;
        hasAnyValid = true;
      }
    }

    return hasAnyValid ? total : NaN;
  }

  function effectiveDealValue(d: DealWithExtras): number {
    const proposalValue = validProposalSum(d.id);
    if (Number.isFinite(proposalValue)) return proposalValue;
    return dealBaseValue(d);
  }

  const grouped = useMemo(() => {
    const g: Record<string, DealWithExtras[]> = {};
    for (const c of COLUMNS) g[c.key] = [];

    filteredDeals.forEach((d) => {
      const k = d.stage as DealStage;
      if (!g[k]) g[k] = [];
      g[k].push(d);
    });

    return g as Record<DealStage, DealWithExtras[]>;
  }, [filteredDeals]);

  function onDrop(stage: DealStage) {
    if (!draggingId) return;
    updateStageMut.mutate({ id: draggingId, stage });
    setDraggingId(null);
  }

  function toggleCommercial(id: number) {
    setCommercialFilterMode("CUSTOM");
    setSelectedCommercialIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  if (dealsQ.isLoading || proposalsQ.isLoading || meQ.isLoading || usersQ.isLoading) {
    return <div className="p-6 text-slate-700">Carregando oportunidades...</div>;
  }

  if (dealsQ.isError || proposalsQ.isError || meQ.isError || usersQ.isError) {
    return <div className="p-6 text-red-600">Erro ao carregar oportunidades</div>;
  }

  const accounts = accountsQ.data || [];

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="sticky top-0 z-30 border-b border-slate-200 bg-white/80 backdrop-blur">
        <div className="mx-auto max-w-[1600px] px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-slate-900 text-white flex items-center justify-center shadow-sm">
              <Layers3 className="h-5 w-5" />
            </div>

            <div className="leading-tight">
              <h1 className="m-0 text-lg font-semibold tracking-tight text-slate-900">
                Pipeline • Kanban
              </h1>
              <div className="text-xs text-slate-500">
                Arraste os cards entre etapas ou altere no seletor.
              </div>
            </div>

            <div className="ml-auto w-full max-w-md">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Buscar por título, construtora, empreendimentos ou comercial..."
                  className="w-full rounded-2xl border border-slate-200 bg-white px-10 py-2.5 text-sm text-slate-900 placeholder:text-slate-400
                             focus:border-slate-300 focus:outline-none focus:ring-4 focus:ring-slate-200"
                />
                {q.trim() && (
                  <button
                    onClick={() => setQ("")}
                    className="absolute right-2 top-1/2 rounded-xl p-2 hover:bg-slate-100 -translate-y-1/2"
                    title="Limpar"
                  >
                    <X className="h-4 w-4 text-slate-500" />
                  </button>
                )}
              </div>
            </div>

            <button
              onClick={() => setOpenNew(true)}
              className="ml-3 inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white
                         transition hover:bg-slate-800 active:bg-slate-950
                         focus:outline-none focus:ring-4 focus:ring-slate-200"
            >
              <Plus className="h-4 w-4" />
              Nova oportunidade
            </button>
          </div>

          {isAdmin && (
            <div className="mt-4 rounded-3xl border border-slate-200 bg-slate-50 p-4">
              <div className="mb-3 flex items-center gap-2">
                <UserRound className="h-4 w-4 text-slate-500" />
                <div className="text-sm font-semibold text-slate-900">
                  Filtrar oportunidades
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setCommercialFilterMode("ALL");
                    setSelectedCommercialIds([]);
                  }}
                  className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                    commercialFilterMode === "ALL"
                      ? "border border-slate-900 bg-slate-900 text-white"
                      : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  Todos
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setCommercialFilterMode("MINE");
                    setSelectedCommercialIds([]);
                  }}
                  className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                    commercialFilterMode === "MINE"
                      ? "border border-emerald-700 bg-emerald-700 text-white"
                      : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  Minhas oportunidades
                </button>

                {commercials.map((u) => {
                  const active =
                    commercialFilterMode === "CUSTOM" &&
                    selectedCommercialIds.includes(u.id);

                  return (
                    <button
                      key={u.id}
                      type="button"
                      onClick={() => toggleCommercial(u.id)}
                      className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                        active
                          ? "border border-blue-700 bg-blue-700 text-white"
                          : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      {u.full_name || u.username}
                    </button>
                  );
                })}
              </div>

              <div className="mt-2 text-[11px] text-slate-500">
                O administrador pode ver tudo, apenas as próprias oportunidades ou filtrar por um ou mais comerciais.
              </div>
            </div>
          )}

          {(updateStageMut.isPending || createDealMut.isPending) && (
            <div className="mt-3 flex items-center gap-2 text-sm text-slate-600">
              <Loader2 className="h-4 w-4 animate-spin" />
              {updateStageMut.isPending ? "Atualizando etapa..." : "Criando oportunidade..."}
            </div>
          )}
        </div>
      </div>

      <div className="mx-auto max-w-[1600px] px-6 py-6">
        <div className="overflow-x-auto">
          <div
            className="grid items-start gap-4"
            style={{
              gridTemplateColumns: `repeat(${COLUMNS.length}, minmax(280px, 1fr))`,
            }}
          >
            {COLUMNS.map((col) => {
              const items = grouped[col.key] || [];
              const total = items.reduce((acc, d) => acc + effectiveDealValue(d), 0);

              return (
                <div
                  key={col.key}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => onDrop(col.key)}
                  className="rounded-3xl border border-slate-200 bg-white shadow-sm"
                >
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className={`h-2.5 w-2.5 rounded-full ${col.accent}`} />
                          <div className="text-sm font-semibold text-slate-900">
                            {col.title}
                            <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700">
                              {items.length}
                            </span>
                          </div>
                        </div>

                        <div className="mt-1 text-xs text-slate-500">
                          Total:{" "}
                          <span className="font-semibold text-slate-700">
                            {total
                              ? total.toLocaleString("pt-BR", {
                                  style: "currency",
                                  currency: "BRL",
                                })
                              : "R$ 0,00"}
                          </span>
                        </div>
                      </div>

                      <div className="text-xs text-slate-500" />
                    </div>
                  </div>

                  <div className="px-4 pb-4">
                    <div className="grid gap-3">
                      {items.map((deal) => (
                        <DealCard
                          key={deal.id}
                          deal={deal}
                          proposals={proposalsByDeal[deal.id] || []}
                          displayValue={effectiveDealValue(deal)}
                          onDragStart={() => setDraggingId(deal.id)}
                          onChangeStage={(stage) =>
                            updateStageMut.mutate({ id: deal.id, stage })
                          }
                        />
                      ))}
                    </div>

                    {items.length === 0 && (
                      <div className="mt-2 rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4 text-xs text-slate-500">
                        Arraste um card para cá.
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {openNew && (
          <Modal title="Nova Oportunidade" onClose={() => setOpenNew(false)}>
            <NewDealForm
              accounts={accounts}
              loading={createDealMut.isPending}
              onSubmit={(payload: { title: string; account: number; valor_total?: number | null }) =>
                createDealMut.mutate({ ...payload, stage: "LEAD" } as any)
              }
            />
          </Modal>
        )}
      </div>
    </div>
  );
}

function DealCard({
  deal,
  proposals,
  displayValue,
  onDragStart,
  onChangeStage,
}: {
  deal: DealWithExtras;
  proposals: Proposal[];
  displayValue: number;
  onDragStart: () => void;
  onChangeStage: (stage: DealStage) => void;
}) {
  const totalBrl = formatBRL(displayValue);

  // Propostas não rejeitadas, com empreendimentos e valor
  const activeProposals = proposals.filter((p) => p.status !== "REJECTED");

  return (
    <div
      draggable
      onDragStart={onDragStart}
      className="group cursor-grab rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition
                 hover:border-slate-300 hover:shadow-md active:cursor-grabbing"
    >
      {/* Construtora — clicável */}
      <div className="flex items-start justify-between gap-2">
        <Link
          to={`/deals/${deal.id}`}
          className="flex items-start gap-2 min-w-0 flex-1"
          onClick={(e) => e.stopPropagation()}
          title="Abrir detalhes"
        >
          <Building2 className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
          <span className="text-sm font-bold leading-snug text-slate-900 hover:underline break-words">
            {deal.account_name || `Construtora #${deal.account}`}
          </span>
        </Link>

        <span className="shrink-0 rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] font-semibold text-slate-600">
          {deal.stage}
        </span>
      </div>

      {/* Empreendimentos com valor de cada proposta */}
      {activeProposals.length > 0 ? (
        <div className="mt-2 flex flex-col gap-1 pl-6">
          {activeProposals.map((p) => {
            const names = (p.project_names || []).filter(Boolean);
            const label = names.length > 0 ? names.join(", ") : "Sem empreendimento";
            const valor = formatBRL(parseMoney(p.valor_total));
            return (
              <div key={p.id} className="flex items-start justify-between gap-2 text-xs">
                <span className="text-slate-600 leading-snug">{label}</span>
                {valor && (
                  <span className="shrink-0 font-semibold text-slate-800">{valor}</span>
                )}
              </div>
            );
          })}
        </div>
      ) : null}

      {/* Comercial */}
      <div className="mt-2">
        <span className="inline-flex max-w-full items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">
          <UserRound className="h-3.5 w-3.5" />
          <span className="truncate">Comercial: {deal.owner_name || "-"}</span>
        </span>
      </div>

      {/* Total + Último contato */}
      <div className="mt-3 grid gap-2">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 text-slate-600">
            <BadgeDollarSign className="h-4 w-4 text-slate-400" />
            <span>Total</span>
          </div>
          <div className="font-semibold text-slate-900">{totalBrl || "-"}</div>
        </div>

        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 text-slate-600">
            <CalendarClock className="h-4 w-4 text-slate-400" />
            <span>Último contato</span>
          </div>
          <div className="text-slate-700">
            {formatDateTimeBR(deal.last_contact_at)}
          </div>
        </div>
      </div>

      <div className="mt-3">
        <select
          value={deal.stage}
          onChange={(e) => onChangeStage(e.target.value as DealStage)}
          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800
                     outline-none focus:border-slate-300 focus:ring-4 focus:ring-slate-200"
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
    </div>
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
      className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-xl rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl"
      >
        <div className="mb-5 flex items-center gap-3">
          <div className="text-base font-semibold text-slate-900">{title}</div>
          <button
            onClick={onClose}
            className="ml-auto inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm
                       transition hover:bg-slate-50"
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

function NewDealForm({
  accounts,
  loading,
  onSubmit,
}: {
  accounts: Account[];
  loading: boolean;
  onSubmit: (payload: { title: string; account: number; valor_total?: number | null }) => void;
}) {
  const [title, setTitle] = useState("");
  const [account, setAccount] = useState<number>(accounts?.[0]?.id || 0);
  const [valor, setValor] = useState<string>("");

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const v = valor.trim() ? Number(valor.replace(",", ".")) : null;
        onSubmit({
          title,
          account,
          valor_total: Number.isFinite(v as number) ? (v as number) : null,
        });
      }}
      className="grid gap-4"
    >
      <div className="grid gap-1">
        <label className="text-xs font-semibold text-slate-700">Título</label>
        <input
          placeholder="Ex: Elevador - Edifício Solar"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-slate-900 placeholder:text-slate-400
                     outline-none focus:border-slate-300 focus:ring-4 focus:ring-slate-200"
        />
      </div>

      <div className="grid gap-1">
        <label className="text-xs font-semibold text-slate-700">Construtora</label>
        <select
          value={account}
          onChange={(e) => setAccount(Number(e.target.value))}
          required
          className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-slate-900
                     outline-none focus:border-slate-300 focus:ring-4 focus:ring-slate-200"
        >
          <option value={0} disabled>
            Selecione a construtora...
          </option>
          {accounts.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </select>
      </div>

      <div className="grid gap-1">
        <label className="text-xs font-semibold text-slate-700">Valor (opcional)</label>
        <input
          placeholder="Ex: 250000 ou 250000,50"
          value={valor}
          onChange={(e) => setValor(e.target.value)}
          className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-slate-900 placeholder:text-slate-400
                     outline-none focus:border-slate-300 focus:ring-4 focus:ring-slate-200"
        />
        <div className="text-[11px] text-slate-500">
          Dica: digite só números (ex: 250000) ou com vírgula (ex: 250000,50).
        </div>
      </div>

      <button
        disabled={loading || account === 0}
        className="mt-1 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white
                   transition hover:bg-slate-800 active:bg-slate-950
                   disabled:cursor-not-allowed disabled:opacity-60
                   focus:outline-none focus:ring-4 focus:ring-slate-200"
      >
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Criando...
          </>
        ) : (
          "Criar oportunidade"
        )}
      </button>
    </form>
  );
}