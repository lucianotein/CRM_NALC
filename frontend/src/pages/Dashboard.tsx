import React, { useMemo } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { listDeals } from "../dealsApi";
import type { DealStage } from "../types";
import {
  LayoutDashboard,
  KanbanSquare,
  Building2,
  ArrowRight,
  TrendingUp,
  Clock,
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

export default function Dashboard() {
  const dealsQ = useQuery({ queryKey: ["deals"], queryFn: listDeals });

  const deals = dealsQ.data || [];

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const s of STAGES) c[s.key] = 0;
    c["PERDIDO"] = 0;
    c["PAUSADO"] = 0;

    for (const d of deals as any[]) {
      c[d.stage] = (c[d.stage] || 0) + 1;
    }
    return c;
  }, [deals]);

  const latestDeals = useMemo(() => {
    // tenta ordenar pelo last_contact_at; cai no id
    return [...(deals as any[])]
      .sort((a, b) => {
        const da = a.last_contact_at ? new Date(a.last_contact_at).getTime() : 0;
        const db = b.last_contact_at ? new Date(b.last_contact_at).getTime() : 0;
        if (db !== da) return db - da;
        return (b.id || 0) - (a.id || 0);
      })
      .slice(0, 6);
  }, [deals]);

  return (
    <div className="mx-auto max-w-6xl px-6 py-6">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-2xl bg-white border border-slate-200 flex items-center justify-center shadow-sm">
          <LayoutDashboard className="h-5 w-5 text-slate-700" />
        </div>
        <div>
          <div className="text-lg font-semibold text-slate-900">Dashboard</div>
          <div className="text-sm text-slate-600">
            Visão rápida do funil e últimos movimentos
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

      {dealsQ.isLoading && (
        <div className="mt-6 text-slate-700">Carregando dados...</div>
      )}

      {dealsQ.isError && (
        <div className="mt-6 text-red-600">Erro ao carregar dados do dashboard.</div>
      )}

      {!dealsQ.isLoading && !dealsQ.isError && (
        <>
          {/* Cards resumo */}
          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {STAGES.map((s) => (
              <div
                key={s.key}
                className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"
              >
                <div className="text-xs text-slate-500">{s.label}</div>
                <div className="mt-2 text-3xl font-semibold text-slate-900">
                  {counts[s.key] || 0}
                </div>
                <div className="mt-3 text-xs text-slate-600 flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-slate-400" />
                  oportunidades
                </div>
              </div>
            ))}
          </div>

          {/* Últimos movimentos */}
          <div className="mt-6 grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6">
            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="text-sm font-semibold text-slate-900">
                Últimas oportunidades movimentadas
              </div>
              <div className="text-xs text-slate-500 mt-1">
                Ordenado por último contato (quando existir)
              </div>

              <div className="mt-4 grid gap-3">
                {latestDeals.map((d: any) => (
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
                          Etapa: <span className="font-semibold">{stageLabel(d.stage)}</span>
                          {" • "}Construtora:{" "}
                          <span className="font-semibold">
                            {d.account_name || `#${d.account}`}
                          </span>
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
                ))}

                {latestDeals.length === 0 && (
                  <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                    Nenhuma oportunidade ainda. Crie uma no Kanban.
                  </div>
                )}
              </div>
            </div>

            {/* Próximas atividades (placeholder para endpoint agregado) */}
            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="text-sm font-semibold text-slate-900">Próximas atividades</div>
              <div className="text-xs text-slate-500 mt-1">
                (Vamos puxar isso do backend sem N+1 requests)
              </div>

              <div className="mt-4 rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                Aqui vai ficar a lista de compromissos (PENDENTES) ordenados por data.
                <div className="mt-2 text-xs text-slate-600">
                  Próximo passo recomendado: criar um endpoint <b>/dashboard/</b> que devolve
                  “propostas”, “pendências” e “totais” num único request.
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}