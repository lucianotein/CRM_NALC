import React, { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createAccount, listAccounts } from "../crmApi";
import { Link } from "react-router-dom";
import { Building2, Plus, Search, X, Loader2, MapPin, Hash } from "lucide-react";

export default function AccountsList() {
  const qc = useQueryClient();

  const { data, isLoading, isError } = useQuery({
    queryKey: ["accounts"],
    queryFn: listAccounts,
  });

  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);

  const mut = useMutation({
    mutationFn: createAccount,
    onSuccess: async () => {
      setOpen(false);
      await qc.invalidateQueries({ queryKey: ["accounts"] });
    },
  });

  const filtered = useMemo(() => {
    const arr = data || [];
    const s = q.trim().toLowerCase();
    if (!s) return arr;

    return arr.filter((a: any) => {
      const name = String(a.name || "").toLowerCase();
      const cnpj = String(a.cnpj || "");
      const city = String(a.city || "").toLowerCase();
      const state = String(a.state || "").toLowerCase();
      return (
        name.includes(s) ||
        cnpj.includes(s) ||
        city.includes(s) ||
        state.includes(s)
      );
    });
  }, [data, q]);

  if (isLoading) return <div className="p-6 text-slate-700">Carregando construtoras...</div>;
  if (isError) return <div className="p-6 text-red-600">Erro ao carregar.</div>;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Topbar */}
      <div className="sticky top-0 z-30 border-b border-slate-200 bg-white/80 backdrop-blur">
        <div className="mx-auto max-w-6xl px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-slate-900 text-white flex items-center justify-center shadow-sm">
              <Building2 className="h-5 w-5" />
            </div>

            <div className="leading-tight">
              <h1 className="text-lg font-semibold tracking-tight text-slate-900 m-0">
                Construtoras
              </h1>
              <div className="text-xs text-slate-500">
                {filtered.length} registro(s)
              </div>
            </div>

            {/* Search */}
            <div className="ml-auto w-full max-w-md">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  placeholder="Buscar por nome, CNPJ, cidade ou UF..."
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-10 py-2.5 text-sm text-slate-900 placeholder:text-slate-400
                             focus:outline-none focus:ring-4 focus:ring-slate-200 focus:border-slate-300"
                />
                {q.trim() && (
                  <button
                    onClick={() => setQ("")}
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-xl p-2 hover:bg-slate-100"
                    title="Limpar"
                  >
                    <X className="h-4 w-4 text-slate-500" />
                  </button>
                )}
              </div>
            </div>

            <button
              onClick={() => setOpen(true)}
              className="ml-3 inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white
                         hover:bg-slate-800 active:bg-slate-950 transition
                         focus:outline-none focus:ring-4 focus:ring-slate-200"
            >
              <Plus className="h-4 w-4" />
              Nova construtora
            </button>
          </div>

          {mut.isPending && (
            <div className="mt-3 flex items-center gap-2 text-sm text-slate-600">
              <Loader2 className="h-4 w-4 animate-spin" />
              Salvando...
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto max-w-6xl px-6 py-6">
        {/* List */}
        <div className="grid gap-3">
          {filtered.map((a: any) => (
            <Link
              key={a.id}
              to={`/accounts/${a.id}`}
              className="group block rounded-3xl border border-slate-200 bg-white p-5 shadow-sm
                         hover:shadow-md hover:border-slate-300 transition"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <div className="h-9 w-9 rounded-2xl bg-slate-100 flex items-center justify-center">
                      <Building2 className="h-4 w-4 text-slate-700" />
                    </div>

                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-slate-900 truncate">
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
                </div>

                <div className="shrink-0">
                  <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-semibold text-slate-600">
                    Abrir
                  </span>
                </div>
              </div>
            </Link>
          ))}

          {filtered.length === 0 && (
            <div className="rounded-3xl border border-dashed border-slate-200 bg-white p-8 text-center">
              <div className="text-sm font-semibold text-slate-900">
                Nenhuma construtora encontrada
              </div>
              <div className="mt-1 text-sm text-slate-600">
                Tente ajustar sua busca ou crie um novo cadastro.
              </div>
              <button
                onClick={() => setOpen(true)}
                className="mt-4 inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white
                           hover:bg-slate-800 transition"
              >
                <Plus className="h-4 w-4" />
                Nova construtora
              </button>
            </div>
          )}
        </div>
      </div>

      {open && (
        <Modal title="Nova Construtora" onClose={() => setOpen(false)}>
          <AccountForm
            loading={mut.isPending}
            onSubmit={(payload) => mut.mutate(payload)}
          />
        </Modal>
      )}
    </div>
  );
}

function AccountForm({
  loading,
  onSubmit,
}: {
  loading: boolean;
  onSubmit: (payload: any) => void;
}) {
  const [name, setName] = useState("");
  const [cnpj, setCnpj] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("PR");

  const canSubmit = name.trim().length > 0 && !loading;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit({ name, cnpj, city, state, is_active: true });
      }}
      className="grid gap-4"
    >
      <div className="grid gap-1">
        <label className="text-xs font-semibold text-slate-700">Nome</label>
        <input
          placeholder="Nome da construtora"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-slate-900 placeholder:text-slate-400
                     outline-none focus:ring-4 focus:ring-slate-200 focus:border-slate-300"
        />
      </div>

      <div className="grid gap-1">
        <label className="text-xs font-semibold text-slate-700">CNPJ (opcional)</label>
        <input
          placeholder="Somente números ou formatado"
          value={cnpj}
          onChange={(e) => setCnpj(e.target.value)}
          className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-slate-900 placeholder:text-slate-400
                     outline-none focus:ring-4 focus:ring-slate-200 focus:border-slate-300"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[1fr_120px] gap-4">
        <div className="grid gap-1">
          <label className="text-xs font-semibold text-slate-700">Cidade</label>
          <input
            placeholder="Cidade"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-slate-900 placeholder:text-slate-400
                       outline-none focus:ring-4 focus:ring-slate-200 focus:border-slate-300"
          />
        </div>

        <div className="grid gap-1">
          <label className="text-xs font-semibold text-slate-700">UF</label>
          <input
            placeholder="UF"
            value={state}
            onChange={(e) => setState(e.target.value.toUpperCase())}
            maxLength={2}
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-slate-900 placeholder:text-slate-400
                       outline-none focus:ring-4 focus:ring-slate-200 focus:border-slate-300"
          />
        </div>
      </div>

      <button
        disabled={!canSubmit}
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
          "Salvar"
        )}
      </button>
    </form>
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
        className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl"
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