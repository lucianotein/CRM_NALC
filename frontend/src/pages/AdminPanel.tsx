import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { api } from "../api";
import {
  ShieldCheck,
  Users,
  Building2,
  Layers3,
  CheckCircle2,
  Clock,
  Phone,
  MessageCircle,
  Mail,
  CalendarCheck,
  ClipboardList,
  Activity,
  TrendingUp,
  CalendarDays,
  X,
  ExternalLink,
  Loader2,
  FileText,
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

type ActivityByType = {
  VISITA: number;
  WHATSAPP: number;
  LIGACAO: number;
  REUNIAO: number;
  EMAIL: number;
  TAREFA: number;
};

type UserStats = {
  id: number;
  username: string;
  full_name: string;
  role: "ADMINISTRADOR" | "COMERCIAL";
  stats: {
    activities_total: number;
    activities_by_type: ActivityByType;
    activities_done: number;
    activities_pending: number;
    deals_total: number;
    accounts_created: number;
    accounts_comercial: number;
    last_activity_at: string | null;
  };
};

type StatsResponse = {
  days: number;
  since: string;
  users: UserStats[];
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

const DAYS_OPTIONS = [
  { value: 7,  label: "7 dias" },
  { value: 10, label: "10 dias" },
  { value: 15, label: "15 dias" },
  { value: 30, label: "30 dias" },
  { value: 60, label: "60 dias" },
  { value: 90, label: "90 dias" },
];

const TYPE_META: { key: keyof ActivityByType; label: string; icon: React.ReactNode; color: string }[] = [
  { key: "VISITA",    label: "Visitas",    icon: <CalendarCheck className="h-3.5 w-3.5" />,   color: "text-blue-600 bg-blue-50 border-blue-200" },
  { key: "WHATSAPP",  label: "WhatsApp",   icon: <MessageCircle className="h-3.5 w-3.5" />,   color: "text-emerald-600 bg-emerald-50 border-emerald-200" },
  { key: "LIGACAO",   label: "Ligações",   icon: <Phone className="h-3.5 w-3.5" />,            color: "text-violet-600 bg-violet-50 border-violet-200" },
  { key: "REUNIAO",   label: "Reuniões",   icon: <Users className="h-3.5 w-3.5" />,            color: "text-amber-600 bg-amber-50 border-amber-200" },
  { key: "EMAIL",     label: "E-mails",    icon: <Mail className="h-3.5 w-3.5" />,             color: "text-rose-600 bg-rose-50 border-rose-200" },
  { key: "TAREFA",    label: "Tarefas",    icon: <ClipboardList className="h-3.5 w-3.5" />,   color: "text-slate-600 bg-slate-50 border-slate-200" },
];

function fmtDate(iso: string | null) {
  if (!iso) return "-";
  return new Date(iso).toLocaleString("pt-BR");
}

type ActivityDetail = {
  id: number;
  deal: number;
  deal_title: string | null;
  deal_account_name: string | null;
  type: keyof ActivityByType;
  status: "DONE" | "PENDING" | "CANCELED";
  occurred_at: string | null;
  scheduled_for: string | null;
  result: string;
  notes: string;
  created_at: string;
  created_by_name: string | null;
};

type ModalTarget = {
  userId: number;
  userName: string;
  type: keyof ActivityByType | "ALL";
  typeLabel: string;
  since: string;
};

// ─── Component ───────────────────────────────────────────────────────────────

export default function AdminPanel() {
  const [days, setDays] = useState(10);
  const [modal, setModal] = useState<ModalTarget | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<number | "ALL">("ALL");

  const statsQ = useQuery<StatsResponse>({
    queryKey: ["admin-stats", days],
    queryFn: async () => {
      const { data } = await api.get(`/admin/stats/?days=${days}`);
      return data;
    },
  });

  const allUsers = (statsQ.data?.users || []);
  const comerciais = allUsers.filter((u) => u.role === "COMERCIAL");

  // Totais somam TODOS os usuários no período selecionado
  const usersForTotals = selectedUserId === "ALL"
    ? allUsers
    : allUsers.filter((u) => u.id === selectedUserId);

  const totals = usersForTotals.reduce(
    (acc, u) => {
      acc.activities += u.stats.activities_total;
      acc.visitas += u.stats.activities_by_type.VISITA;
      acc.deals += u.stats.deals_total;
      return acc;
    },
    { activities: 0, visitas: 0, deals: 0 }
  );

  const visibleUsers = selectedUserId === "ALL"
    ? [...allUsers].sort((a, b) => b.stats.activities_total - a.stats.activities_total)
    : allUsers.filter((u) => u.id === selectedUserId);

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="sticky top-0 z-30 border-b border-slate-200 bg-white/80 backdrop-blur">
        <div className="mx-auto max-w-6xl px-6 py-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-2xl bg-slate-900 text-white flex items-center justify-center shadow-sm">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div className="leading-tight">
                <h1 className="text-lg font-semibold tracking-tight text-slate-900 m-0">
                  Administração CRM
                </h1>
                <div className="text-xs text-slate-500">Visão geral da equipe</div>
              </div>
            </div>

            <div className="ml-auto flex flex-wrap items-center gap-3">
              {/* Filtro de usuário */}
              {allUsers.length > 0 && (
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-slate-400" />
                  <span className="text-xs text-slate-500">Usuário:</span>
                  <select
                    value={selectedUserId}
                    onChange={(e) =>
                      setSelectedUserId(e.target.value === "ALL" ? "ALL" : Number(e.target.value))
                    }
                    className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 focus:outline-none focus:ring-4 focus:ring-slate-200"
                  >
                    <option value="ALL">Todos os usuários</option>
                    {allUsers.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.full_name || u.username} ({u.role === "ADMINISTRADOR" ? "Admin" : "Comercial"})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Seletor de período */}
              <div className="flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-slate-400" />
                <span className="text-xs text-slate-500">Período:</span>
                <div className="flex items-center gap-1 rounded-2xl border border-slate-200 bg-white p-1">
                  {DAYS_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => setDays(opt.value)}
                      className={`rounded-xl px-3 py-1.5 text-xs font-medium transition ${
                        days === opt.value
                          ? "bg-slate-900 text-white"
                          : "text-slate-600 hover:bg-slate-100"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-6 py-6 grid gap-6">

        {statsQ.isLoading && (
          <div className="text-sm text-slate-500">Carregando dados...</div>
        )}

        {statsQ.isError && (
          <div className="text-sm text-red-600">Erro ao carregar dados.</div>
        )}

        {statsQ.data && (
          <>
            {/* Cards de resumo */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <SummaryCard
                icon={<Activity className="h-5 w-5 text-blue-600" />}
                bg="bg-blue-50"
                label={`Atividades (${days}d)`}
                value={totals.activities}
              />
              <SummaryCard
                icon={<CalendarCheck className="h-5 w-5 text-violet-600" />}
                bg="bg-violet-50"
                label={`Visitas (${days}d)`}
                value={totals.visitas}
              />
              <SummaryCard
                icon={<Layers3 className="h-5 w-5 text-amber-600" />}
                bg="bg-amber-50"
                label="Oportunidades"
                value={totals.deals}
              />
              <SummaryCard
                icon={<Users className="h-5 w-5 text-emerald-600" />}
                bg="bg-emerald-50"
                label="Comerciais"
                value={comerciais.length}
              />
            </div>

            {/* Detalhe por usuário */}
            <div>
              <div className="mb-3 flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-slate-500" />
                <span className="text-sm font-semibold text-slate-700">
                  {selectedUserId === "ALL"
                    ? `Todos os usuários — últimos ${days} dias`
                    : `${visibleUsers[0]?.full_name || visibleUsers[0]?.username} — últimos ${days} dias`}
                </span>
              </div>

              <div className="grid gap-4">
                {visibleUsers.length === 0 && (
                  <div className="rounded-3xl border border-dashed border-slate-200 bg-white p-6 text-center text-sm text-slate-500">
                    Nenhum usuário encontrado.
                  </div>
                )}
                {visibleUsers.map((user) => (
                  <UserCard
                    key={user.id}
                    user={user}
                    days={days}
                    since={statsQ.data!.since}
                    onOpenModal={setModal}
                  />
                ))}
              </div>
            </div>
          </>
        )}
      </div>

      {modal && (
        <ActivitiesModal modal={modal} onClose={() => setModal(null)} />
      )}
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SummaryCard({
  icon, bg, label, value,
}: {
  icon: React.ReactNode;
  bg: string;
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm flex items-center gap-3">
      <div className={`h-10 w-10 rounded-2xl flex items-center justify-center ${bg}`}>
        {icon}
      </div>
      <div>
        <div className="text-2xl font-bold text-slate-900">{value}</div>
        <div className="text-xs text-slate-500">{label}</div>
      </div>
    </div>
  );
}

function UserCard({
  user, days, since, onOpenModal,
}: {
  user: UserStats;
  days: number;
  since: string;
  onOpenModal: (m: ModalTarget) => void;
}) {
  const s = user.stats;
  const isAdmin = user.role === "ADMINISTRADOR";

  function openType(type: keyof ActivityByType, typeLabel: string) {
    onOpenModal({ userId: user.id, userName: user.full_name || user.username, type, typeLabel, since });
  }

  function openAll() {
    onOpenModal({ userId: user.id, userName: user.full_name || user.username, type: "ALL", typeLabel: "Todas", since });
  }

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      {/* Cabeçalho do usuário */}
      <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
        <div className="flex items-center gap-3">
          <div className={`h-10 w-10 rounded-2xl flex items-center justify-center font-bold text-sm ${
            isAdmin ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-700"
          }`}>
            {(user.full_name || user.username).charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="text-sm font-semibold text-slate-900">{user.full_name || user.username}</div>
            <div className="text-xs text-slate-500">@{user.username}</div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className={`rounded-full border px-2.5 py-1 font-semibold ${
            isAdmin
              ? "bg-slate-900 text-white border-slate-900"
              : "bg-emerald-50 text-emerald-700 border-emerald-200"
          }`}>
            {isAdmin ? "Administrador" : "Comercial"}
          </span>
          <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-slate-600">
            Último acesso: {fmtDate(s.last_activity_at)}
          </span>
        </div>
      </div>

      {/* Grid de métricas */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <Metric
          icon={<Activity className="h-4 w-4 text-blue-500" />}
          label={`Atividades (${days}d)`}
          value={s.activities_total}
          onClick={s.activities_total > 0 ? openAll : undefined}
        />
        <Metric
          icon={<CheckCircle2 className="h-4 w-4 text-emerald-500" />}
          label="Concluídas"
          value={s.activities_done}
        />
        <Metric
          icon={<Clock className="h-4 w-4 text-amber-500" />}
          label="Pendentes"
          value={s.activities_pending}
        />
        <Metric
          icon={<Layers3 className="h-4 w-4 text-violet-500" />}
          label="Oportunidades"
          value={s.deals_total}
        />
        <Metric
          icon={<Building2 className="h-4 w-4 text-slate-500" />}
          label="Construtoras criadas"
          value={s.accounts_created}
        />
        <Metric
          icon={<Building2 className="h-4 w-4 text-sky-500" />}
          label="Construtoras (resp.)"
          value={s.accounts_comercial}
        />
      </div>

      {/* Breakdown por tipo */}
      <div className="border-t border-slate-100 pt-3">
        <div className="text-xs font-semibold text-slate-500 mb-2">
          Atividades por tipo — últimos {days} dias
          <span className="ml-2 font-normal text-slate-400">(clique para ver detalhes)</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {TYPE_META.map((t) => {
            const count = s.activities_by_type[t.key] || 0;
            return (
              <button
                key={t.key}
                onClick={() => count > 0 && openType(t.key, t.label)}
                className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold transition ${t.color} ${
                  count === 0 ? "opacity-40 cursor-default" : "hover:opacity-80 cursor-pointer"
                }`}
              >
                {t.icon}
                {t.label}: {count}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function Metric({
  icon, label, value, onClick,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  onClick?: () => void;
}) {
  const base = "rounded-2xl border border-slate-100 bg-slate-50 px-3 py-2.5 flex items-center gap-2 transition";
  if (onClick) {
    return (
      <button onClick={onClick} className={`${base} hover:border-slate-300 hover:bg-white cursor-pointer text-left`}>
        {icon}
        <div>
          <div className="text-base font-bold text-slate-900 leading-none">{value}</div>
          <div className="text-[11px] text-slate-500 mt-0.5">{label}</div>
        </div>
      </button>
    );
  }
  return (
    <div className={base}>
      {icon}
      <div>
        <div className="text-base font-bold text-slate-900 leading-none">{value}</div>
        <div className="text-[11px] text-slate-500 mt-0.5">{label}</div>
      </div>
    </div>
  );
}

// ─── Modal de Atividades ──────────────────────────────────────────────────────

const STATUS_LABEL: Record<string, { label: string; cls: string }> = {
  DONE:     { label: "Concluída", cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  PENDING:  { label: "Pendente",  cls: "bg-amber-50 text-amber-700 border-amber-200" },
  CANCELED: { label: "Cancelada", cls: "bg-slate-100 text-slate-500 border-slate-200" },
};

function ActivitiesModal({
  modal,
  onClose,
}: {
  modal: ModalTarget;
  onClose: () => void;
}) {
  const params = new URLSearchParams();
  params.set("created_by", String(modal.userId));
  params.set("since", modal.since);
  if (modal.type !== "ALL") params.set("type", modal.type);

  const q = useQuery<ActivityDetail[]>({
    queryKey: ["admin-activities", modal.userId, modal.type, modal.since],
    queryFn: async () => {
      const { data } = await api.get(`/activities/?${params.toString()}`);
      return data;
    },
  });

  const activities = q.data || [];

  return (
    <div
      className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl max-h-[85vh] flex flex-col rounded-3xl border border-slate-200 bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-4 shrink-0">
          <div>
            <div className="text-sm font-semibold text-slate-900">
              {modal.typeLabel} — {modal.userName}
            </div>
            <div className="text-xs text-slate-500">
              {activities.length} atividade(s) no período
            </div>
          </div>
          <button
            onClick={onClose}
            className="ml-auto inline-flex items-center gap-1.5 rounded-2xl border border-slate-200 px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-50 transition"
          >
            <X className="h-3.5 w-3.5" /> Fechar
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto px-5 py-4 flex flex-col gap-3">
          {q.isLoading && (
            <div className="flex items-center gap-2 text-sm text-slate-500 py-6 justify-center">
              <Loader2 className="h-4 w-4 animate-spin" /> Carregando...
            </div>
          )}

          {!q.isLoading && activities.length === 0 && (
            <div className="text-center text-sm text-slate-500 py-8">
              Nenhuma atividade encontrada.
            </div>
          )}

          {activities.map((a) => {
            const typeMeta = TYPE_META.find((t) => t.key === a.type);
            const statusInfo = STATUS_LABEL[a.status] || STATUS_LABEL.DONE;
            return (
              <div
                key={a.id}
                className="rounded-2xl border border-slate-200 bg-slate-50 p-4 grid gap-2"
              >
                {/* Linha 1: tipo + status + link */}
                <div className="flex flex-wrap items-center gap-2">
                  {typeMeta && (
                    <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${typeMeta.color}`}>
                      {typeMeta.icon} {typeMeta.label}
                    </span>
                  )}
                  <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${statusInfo.cls}`}>
                    {statusInfo.label}
                  </span>
                  <Link
                    to={`/deals/${a.deal}`}
                    onClick={onClose}
                    className="ml-auto inline-flex items-center gap-1 text-xs text-blue-600 hover:underline"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    Ver oportunidade
                  </Link>
                </div>

                {/* Construtora + Deal */}
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-600">
                  {a.deal_account_name && (
                    <span className="flex items-center gap-1">
                      <Building2 className="h-3.5 w-3.5 text-slate-400" />
                      {a.deal_account_name}
                    </span>
                  )}
                  {a.deal_title && (
                    <span className="flex items-center gap-1">
                      <FileText className="h-3.5 w-3.5 text-slate-400" />
                      {a.deal_title}
                    </span>
                  )}
                </div>

                {/* Resultado */}
                {a.result && (
                  <div className="text-xs font-semibold text-slate-800">{a.result}</div>
                )}

                {/* Observações */}
                {a.notes && (
                  <div className="text-xs text-slate-600 whitespace-pre-wrap">{a.notes}</div>
                )}

                {/* Datas */}
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-slate-400 border-t border-slate-200 pt-2 mt-1">
                  <span>Registrado: {fmtDate(a.created_at)}</span>
                  {a.occurred_at && <span>Realizado: {fmtDate(a.occurred_at)}</span>}
                  {a.scheduled_for && <span>Agendado: {fmtDate(a.scheduled_for)}</span>}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
