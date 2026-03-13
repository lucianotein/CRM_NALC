import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";

import { listDeals } from "../dealsApi";
import type { DealStage } from "../types";
import { listAllProposals, type Proposal } from "../proposalsApi";
import { listCommitments, type Activity } from "../activitiesApi";

import {
  LayoutDashboard,
  KanbanSquare,
  Building2,
  ArrowRight,
  TrendingUp,
  Clock,
  CalendarClock,
  Wallet,
  Search,
  Layers3,
} from "lucide-react";

const STAGES: { key: DealStage; label: string }[] = [
  { key: "LEAD", label: "Lead" },
  { key: "CONTATO", label: "Contato" },
  { key: "PROPOSTA", label: "Proposta" },
  { key: "NEGOCIACAO", label: "Negociação" },
  { key: "FECHADO_GANHO", label: "Fechado" },
];

function stageLabel(s: string) {
  const map: Record<string, string> = {
    LEAD: "Lead",
    CONTATO: "Contato",
    PROPOSTA: "Proposta",
    NEGOCIACAO: "Negociação",
    FECHADO_GANHO: "Fechado",
    PERDIDO: "Perdido",
    PAUSADO: "Pausado",
  };
  return map[s] || s;
}

function activityTypeLabel(s: string) {
  const map: Record<string, string> = {
    VISITA: "Visita",
    WHATSAPP: "WhatsApp",
    LIGACAO: "Ligação",
    REUNIAO: "Reunião",
    EMAIL: "E-mail",
    TAREFA: "Tarefa",
  };
  return map[s] || s;
}

const brl = (n: number) =>
  new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(Number.isFinite(n) ? n : 0);

function toNumber(v: any): number {
  if (v === null || v === undefined || v === "") return NaN;
  if (typeof v === "number") return v;

  const s = String(v).trim();

  if (s.includes(",")) {
    const n = Number(s.replace(/\./g, "").replace(",", "."));
    return Number.isFinite(n) ? n : NaN;
  }

  const n = Number(s);
  return Number.isFinite(n) ? n : NaN;
}

function fmtDT(s?: string | null) {
  if (!s) return "-";
  try {
    return new Date(s).toLocaleString("pt-BR");
  } catch {
    return s;
  }
}

function getDealProjectNames(d: any): string[] {
  if (Array.isArray(d?.project_names) && d.project_names.length > 0) {
    return d.project_names.filter(Boolean);
  }
  if (d?.project_name) return [String(d.project_name)];
  return [];
}

function dealProjectsText(d: any): string {
  const names = getDealProjectNames(d);
  return names.length > 0 ? names.join(", ") : "-";
}

export default function Dashboard() {
  const dealsQ = useQuery({ queryKey: ["deals"], queryFn: listDeals });

  const proposalsQ = useQuery({
    queryKey: ["proposals"],
    queryFn: listAllProposals,
  });

  const commitmentsQ = useQuery({
    queryKey: ["commitments-today"],
    queryFn: () => listCommitments(),
  });

  const [search, setSearch] = useState("");

  const deals = dealsQ.data || [];
  const proposals = proposalsQ.data || [];
  const commitments = commitmentsQ.data || [];

  const proposalsByDeal = useMemo(() => {
    const map: Record<number, Proposal[]> = {};

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
  }, [proposals]);

  const dealById = useMemo(() => {
    const map: Record<number, any> = {};
    for (const d of deals as any[]) {
      map[d.id] = d;
    }
    return map;
  }, [deals]);

  function leadValue(d: any): number {
    const v =
      d.valor_total ??
      d.value ??
      d.amount ??
      d.valor ??
      d.total_value ??
      d.vlr ??
      0;

    const n = toNumber(v);
    return Number.isFinite(n) ? n : 0;
  }

  function validProposalSum(d: any): number {
    const ps = proposalsByDeal[d.id] || [];
    if (ps.length === 0) return NaN;

    let total = 0;
    let hasAnyValid = false;

    for (const p of ps as any[]) {
      if (p?.status === "REJECTED") continue;

      const n = toNumber(p?.valor_total);
      if (Number.isFinite(n)) {
        total += n;
        hasAnyValid = true;
      }
    }

    return hasAnyValid ? total : NaN;
  }

  function effectiveDealValue(d: any): number {
    const proposalSum = validProposalSum(d);
    if (Number.isFinite(proposalSum)) return proposalSum;
    return leadValue(d);
  }

  const stats = useMemo(() => {
    const s: Record<string, { count: number; total: number }> = {};

    for (const st of STAGES) {
      s[st.key] = { count: 0, total: 0 };
    }

    s["PERDIDO"] = { count: 0, total: 0 };
    s["PAUSADO"] = { count: 0, total: 0 };

    for (const d of deals as any[]) {
      const stage = d.stage || "LEAD";
      if (!s[stage]) {
        s[stage] = { count: 0, total: 0 };
      }

      s[stage].count += 1;
      s[stage].total += effectiveDealValue(d);
    }

    return s;
  }, [deals, proposalsByDeal]);

  const grandTotal = useMemo(() => {
    let t = 0;
    for (const d of deals as any[]) t += effectiveDealValue(d);
    return t;
  }, [deals, proposalsByDeal]);

  const searchNeedle = search.trim().toLowerCase();

  const filteredLatestDeals = useMemo(() => {
    const ordered = [...(deals as any[])].sort((a, b) => {
      const da = a.last_contact_at ? new Date(a.last_contact_at).getTime() : 0;
      const db = b.last_contact_at ? new Date(b.last_contact_at).getTime() : 0;
      if (db !== da) return db - da;
      return (b.id || 0) - (a.id || 0);
    });

    if (!searchNeedle) return ordered.slice(0, 6);

    return ordered
      .filter((d: any) => {
        const title = String(d.title || "").toLowerCase();
        const account = String(d.account_name || "").toLowerCase();
        const projects = dealProjectsText(d).toLowerCase();

        return (
          title.includes(searchNeedle) ||
          account.includes(searchNeedle) ||
          projects.includes(searchNeedle)
        );
      })
      .slice(0, 12);
  }, [deals, searchNeedle]);

  const builderRanking = useMemo(() => {
    const rankingMap: Record<
      string,
      {
        accountId: number | null;
        accountName: string;
        sentValue: number;
        sentCount: number;
      }
    > = {};

    for (const p of proposals as any[]) {
      if (p.status !== "SENT") continue;

      const deal = dealById[Number(p.deal)];
      if (!deal) continue;

      const accountId = Number(deal.account || 0) || null;
      const accountName = deal.account_name || `Construtora #${deal.account}`;
      const key = String(accountId ?? accountName);
      const valor = Number(toNumber(p.valor_total) || 0);

      if (!rankingMap[key]) {
        rankingMap[key] = {
          accountId,
          accountName,
          sentValue: 0,
          sentCount: 0,
        };
      }

      rankingMap[key].sentValue += valor;
      rankingMap[key].sentCount += 1;
    }

    return Object.values(rankingMap)
      .sort((a, b) => {
        if (b.sentValue !== a.sentValue) return b.sentValue - a.sentValue;
        return b.sentCount - a.sentCount;
      })
      .slice(0, 5);
  }, [proposals, dealById]);

  const loading =
    dealsQ.isLoading || proposalsQ.isLoading || commitmentsQ.isLoading;

  const error = dealsQ.isError || proposalsQ.isError || commitmentsQ.isError;

  return (
    <div className="mx-auto max-w-7xl px-6 py-6">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-2xl bg-white border border-slate-200 flex items-center justify-center shadow-sm">
          <LayoutDashboard className="h-5 w-5 text-slate-700" />
        </div>

        <div>
          <div className="text-lg font-semibold text-slate-900">Dashboard</div>
          <div className="text-sm text-slate-600">
            Visão executiva do funil, propostas e atividades
          </div>
        </div>

        <div className="ml-auto flex gap-2">
          <Link
            to="/deals"
            className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white
                       hover:bg-slate-800 transition focus:outline-none focus:ring-4 focus:ring-slate-200"
          >
            <KanbanSquare className="h-4 w-4" />
            Abrir Kanban
          </Link>

          <Link
            to="/accounts"
            className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-800
                       hover:bg-slate-50 transition focus:outline-none focus:ring-4 focus:ring-slate-200"
          >
            <Building2 className="h-4 w-4" />
            Construtoras
          </Link>
        </div>
      </div>

      {loading && <div className="mt-6 text-slate-700">Carregando dados...</div>}

      {error && (
        <div className="mt-6 text-red-600">Erro ao carregar dados do dashboard.</div>
      )}

      {!loading && !error && (
        <>
          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">
            {STAGES.map((st) => {
              const item = stats[st.key];

              return (
                <div
                  key={st.key}
                  className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-xs uppercase tracking-wide text-slate-500">
                        {st.label}
                      </div>
                      <div className="mt-2 text-3xl font-semibold text-slate-900">
                        {item?.count || 0}
                      </div>
                    </div>

                    <div className="rounded-2xl bg-slate-50 border border-slate-200 p-2">
                      <TrendingUp className="h-4 w-4 text-slate-500" />
                    </div>
                  </div>

                  <div className="mt-4 border-t border-slate-100 pt-4">
                    <div className="text-xs text-slate-500">Valor total da etapa</div>
                    <div className="text-lg font-semibold text-slate-900">
                      {brl(item?.total || 0)}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-6 grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6">
            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-center">
                  <Wallet className="h-5 w-5 text-slate-600" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-slate-900">
                    Total geral do funil
                  </div>
                  <div className="text-xs text-slate-500">
                    Soma das propostas válidas por oportunidade ou valor do lead
                  </div>
                </div>
              </div>

              <div className="mt-4 text-2xl font-semibold text-slate-900">
                {brl(grandTotal)}
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-center">
                  <Building2 className="h-5 w-5 text-slate-600" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-slate-900">
                    Ranking de construtoras
                  </div>
                  <div className="text-xs text-slate-500">
                    Maiores valores em propostas enviadas
                  </div>
                </div>
              </div>

              <div className="mt-4 grid gap-3">
                {builderRanking.map((item, idx) => (
                  <div
                    key={`${item.accountId}-${idx}`}
                    className="rounded-2xl border border-slate-200 bg-slate-50 p-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-slate-900 truncate">
                          {idx + 1}. {item.accountName}
                        </div>
                        <div className="mt-1 text-xs text-slate-600">
                          Propostas enviadas:{" "}
                          <span className="font-semibold text-slate-900">
                            {item.sentCount}
                          </span>
                        </div>
                      </div>

                      <div className="text-sm font-semibold text-slate-900 shrink-0">
                        {brl(item.sentValue)}
                      </div>
                    </div>
                  </div>
                ))}

                {builderRanking.length === 0 && (
                  <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                    Nenhuma proposta enviada até o momento.
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6">
            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-sm font-semibold text-slate-900">
                    Últimas oportunidades movimentadas
                  </div>
                  <div className="text-xs text-slate-500 mt-1">
                    Ordenado por último contato
                  </div>
                </div>

                <div className="w-full max-w-md">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Buscar por construtora ou empreendimento..."
                      className="w-full rounded-2xl border border-slate-200 bg-white px-10 py-2.5 text-sm text-slate-900 placeholder:text-slate-400
                                 focus:border-slate-300 focus:outline-none focus:ring-4 focus:ring-slate-200"
                    />
                  </div>
                </div>
              </div>

              <div className="mt-4 grid gap-3">
                {filteredLatestDeals.map((d: any) => {
                  const validProposalTotal = validProposalSum(d);
                  const hasValidProposal = Number.isFinite(validProposalTotal);
                  const projectsText = dealProjectsText(d);

                  return (
                    <Link
                      key={d.id}
                      to={`/deals/${d.id}`}
                      className="rounded-2xl border border-slate-200 bg-white p-4 hover:bg-slate-50 transition"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="text-sm font-semibold text-slate-900 truncate">
                            {d.title}
                          </div>

                          <div className="mt-1 text-xs text-slate-600">
                            Etapa:{" "}
                            <span className="font-semibold">{stageLabel(d.stage)}</span>
                            {" • "}Construtora:{" "}
                            <span className="font-semibold">
                              {d.account_name || `#${d.account}`}
                            </span>
                            {" • "}
                            {hasValidProposal ? "Propostas válidas" : "Lead"}:{" "}
                            <span className="font-semibold">
                              {brl(effectiveDealValue(d))}
                            </span>
                          </div>

                          <div className="mt-1 text-xs text-slate-600 inline-flex items-center gap-2">
                            <Layers3 className="h-3.5 w-3.5 text-slate-400" />
                            Empreendimentos:{" "}
                            <span className="font-semibold">{projectsText}</span>
                          </div>

                          <div className="mt-1 text-xs text-slate-600 inline-flex items-center gap-2">
                            <Clock className="h-3.5 w-3.5 text-slate-400" />
                            Último contato:{" "}
                            <span className="font-semibold">
                              {d.last_contact_at
                                ? new Date(d.last_contact_at).toLocaleString("pt-BR")
                                : "-"}
                            </span>
                          </div>
                        </div>

                        <div className="shrink-0">
                          <span className="inline-flex items-center gap-1 text-sm text-slate-700">
                            Ver <ArrowRight className="h-4 w-4" />
                          </span>
                        </div>
                      </div>
                    </Link>
                  );
                })}

                {filteredLatestDeals.length === 0 && (
                  <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                    Nenhuma oportunidade encontrada para o filtro informado.
                  </div>
                )}
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="text-sm font-semibold text-slate-900">
                Próximas atividades
              </div>
              <div className="text-xs text-slate-500 mt-1">
                Compromissos pendentes do dia
              </div>

              <div className="mt-4 grid gap-3">
                {commitments.map((a: Activity) => {
                  const deal = dealById[a.deal];

                  return (
                    <Link
                      key={a.id}
                      to={`/deals/${a.deal}`}
                      className="rounded-2xl border border-slate-200 bg-white p-4 hover:bg-slate-50 transition"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="text-sm font-semibold text-slate-900 truncate">
                            {deal?.title || `Oportunidade #${a.deal}`}
                          </div>

                          <div className="mt-1 text-xs text-slate-600">
                            Tipo:{" "}
                            <span className="font-semibold">
                              {activityTypeLabel(a.type)}
                            </span>
                            {" • "}Construtora:{" "}
                            <span className="font-semibold">
                              {deal?.account_name || `#${deal?.account ?? "-"}`}
                            </span>
                          </div>

                          <div className="mt-1 text-xs text-slate-600 inline-flex items-center gap-2">
                            <CalendarClock className="h-3.5 w-3.5 text-slate-400" />
                            Agendado para:{" "}
                            <span className="font-semibold">
                              {fmtDT(a.scheduled_for)}
                            </span>
                          </div>

                          {a.result ? (
                            <div className="mt-1 text-xs text-slate-600">
                              Resultado:{" "}
                              <span className="font-semibold">{a.result}</span>
                            </div>
                          ) : null}
                        </div>

                        <div className="shrink-0">
                          <span className="inline-flex items-center gap-1 text-sm text-slate-700">
                            Ver <ArrowRight className="h-4 w-4" />
                          </span>
                        </div>
                      </div>
                    </Link>
                  );
                })}

                {commitments.length === 0 && (
                  <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                    Nenhuma atividade pendente para hoje.
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}