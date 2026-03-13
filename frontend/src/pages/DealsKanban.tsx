// frontend/src/pages/DealsKanban.tsx
import React, { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Deal, DealStage } from "../types";
import { listDeals, updateDealStage } from "../dealsApi";
import { createDeal, listAccounts, type Account } from "../crmApi";
import { listAllProposals, type Proposal } from "../proposalsApi";
import { Link } from "react-router-dom";
import {
  Building2,
  Plus,
  Search,
  X,
  Loader2,
  CalendarClock,
  BadgeDollarSign,
  Layers3,
} from "lucide-react";

const COLUMNS: { key: DealStage; title: string; accent: string }[] = [
  { key: "LEAD", title: "Lead", accent: "bg-slate-200" },
  { key: "CONTATO", title: "Contato", accent: "bg-blue-200" },
  { key: "PROPOSTA", title: "Proposta", accent: "bg-amber-200" },
  { key: "NEGOCIACAO", title: "Negociação", accent: "bg-purple-200" },
  { key: "FECHADO_GANHO", title: "Fechado", accent: "bg-emerald-200" },
];

type DealWithExtras = Deal & {
  account_name?: string;
  project_name?: string | null;
  project_names?: string[];
  valor_total?: string | number | null;
};

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

  const dealsQ = useQuery({ queryKey: ["deals"], queryFn: listDeals });
  const accountsQ = useQuery({ queryKey: ["accounts"], queryFn: listAccounts });
  const proposalsQ = useQuery({
    queryKey: ["proposals"],
    queryFn: listAllProposals,
  });

  const [draggingId, setDraggingId] = useState<number | null>(null);
  const [openNew, setOpenNew] = useState(false);
  const [q, setQ] = useState("");

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

  const filteredDeals = useMemo(() => {
    const all = (dealsQ.data || []) as DealWithExtras[];
    const needle = q.trim().toLowerCase();

    if (!needle) return all;

    return all.filter((d) => {
      const a = String(d.title || "").toLowerCase();
      const b = String(d.account_name || "").toLowerCase();
      const c = String(d.project_name || "").toLowerCase();
      const dNames = Array.isArray(d.project_names)
        ? d.project_names.join(" ").toLowerCase()
        : "";

      return (
        a.includes(needle) ||
        b.includes(needle) ||
        c.includes(needle) ||
        dNames.includes(needle)
      );
    });
  }, [dealsQ.data, q]);

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

  function latestProposalValue(dealId: number): number {
    const ps = proposalsByDeal[dealId] || [];
    if (ps.length === 0) return NaN;

    const last = ps[ps.length - 1];
    const n = parseMoney((last as any).valor_total);
    return Number.isFinite(n) ? n : NaN;
  }

  function effectiveDealValue(d: DealWithExtras): number {
    const proposalValue = latestProposalValue(d.id);
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

  if (dealsQ.isLoading || proposalsQ.isLoading) {
    return <div className="p-6 text-slate-700">Carregando oportunidades...</div>;
  }

  if (dealsQ.isError || proposalsQ.isError) {
    return <div className="p-6 text-red-600">Erro ao carregar oportunidades</div>;
  }

  const accounts = accountsQ.data || [];

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Topbar */}
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
                  placeholder="Buscar por título, construtora ou empreendimentos..."
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

          {(updateStageMut.isPending || createDealMut.isPending) && (
            <div className="mt-3 flex items-center gap-2 text-sm text-slate-600">
              <Loader2 className="h-4 w-4 animate-spin" />
              {updateStageMut.isPending ? "Atualizando etapa..." : "Criando oportunidade..."}
            </div>
          )}
        </div>
      </div>

      {/* Board */}
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
  displayValue,
  onDragStart,
  onChangeStage,
}: {
  deal: DealWithExtras;
  displayValue: number;
  onDragStart: () => void;
  onChangeStage: (stage: DealStage) => void;
}) {
  const brl = formatBRL(displayValue);
  const projectNames =
    Array.isArray(deal.project_names) && deal.project_names.length > 0
      ? deal.project_names.filter(Boolean)
      : [];

  const obraTexto =
    projectNames.length > 0
      ? projectNames.join(", ")
      : deal.project
      ? deal.project_name || `#${deal.project}`
      : "-";

  return (
    <div
      draggable
      onDragStart={onDragStart}
      className="group cursor-grab rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition
                 hover:border-slate-300 hover:shadow-md active:cursor-grabbing"
    >
      <div className="flex items-start justify-between gap-2">
        <Link
          to={`/deals/${deal.id}`}
          className="text-sm font-semibold leading-snug text-slate-900 hover:underline"
          onClick={(e) => e.stopPropagation()}
          title="Abrir detalhes"
        >
          {deal.title}
        </Link>

        <span className="shrink-0 rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] font-semibold text-slate-600">
          {deal.stage}
        </span>
      </div>

      <div className="mt-2 flex items-center gap-2 text-xs text-slate-600">
        <Building2 className="h-4 w-4 text-slate-400" />
        <span className="truncate">
          {deal.account_name || `Construtora #${deal.account}`}
        </span>
      </div>

      {obraTexto !== "-" && (
        <div className="mt-1 text-xs text-slate-500 break-words">
          Empreendimentos: {obraTexto}
        </div>
      )}

      <div className="mt-3 grid gap-2">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 text-slate-600">
            <BadgeDollarSign className="h-4 w-4 text-slate-400" />
            <span>Valor</span>
          </div>
          <div className="font-semibold text-slate-900">{brl || "-"}</div>
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