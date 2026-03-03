import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, ensureCsrf } from "../api";
import { Building2, Lock, User, AlertCircle } from "lucide-react";

export default function Login() {
  const nav = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const canSubmit = useMemo(() => {
    return username.trim().length > 0 && password.length > 0 && !loading;
  }, [username, password, loading]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    try {
      setLoading(true);
      await ensureCsrf();
      await api.post("/auth/login/", { username, password });
      nav("/deals");
    } catch {
      setError("Usuário ou senha inválidos");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* topo sutil com “marca” */}
      <div className="mx-auto max-w-6xl px-6 pt-10">
        <div className="flex items-center gap-3 text-slate-700">
          <div className="h-10 w-10 rounded-2xl bg-slate-900 text-white flex items-center justify-center shadow-sm">
            <Building2 className="h-5 w-5" />
          </div>
          <div className="leading-tight">
            <div className="text-sm font-semibold tracking-tight">Portal CRM</div>
            <div className="text-xs text-slate-500">Pipeline • Propostas • Atividades</div>
          </div>
        </div>
      </div>

      {/* conteúdo central */}
      <div className="mx-auto flex min-h-[calc(100vh-120px)] max-w-6xl items-center px-6 py-10">
        <div className="grid w-full grid-cols-1 gap-10 lg:grid-cols-2">
          {/* coluna esquerda (mensagem / benefícios) */}
          <div className="hidden lg:flex flex-col justify-center">
            <h1 className="text-4xl font-semibold tracking-tight text-slate-900">
              Um CRM simples, com cara de CRM.
            </h1>
            <p className="mt-4 text-slate-600 leading-relaxed max-w-md">
              Acompanhe seu funil com Kanban, gere propostas e registre atividades em um
              fluxo claro e objetivo.
            </p>

            <div className="mt-8 grid gap-3 max-w-md">
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="text-sm font-medium text-slate-900">Visão Kanban</div>
                <div className="text-sm text-slate-600">
                  Arraste negócios entre etapas e mantenha tudo atualizado.
                </div>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="text-sm font-medium text-slate-900">Propostas</div>
                <div className="text-sm text-slate-600">
                  Gere e acompanhe status (rascunho, enviada, aceita, etc.).
                </div>
              </div>
            </div>
          </div>

          {/* card de login */}
          <div className="flex items-center justify-center">
            <div className="w-full max-w-md">
              <div className="rounded-3xl border border-slate-200 bg-white p-7 shadow-sm">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-2xl font-semibold tracking-tight text-slate-900">
                      Entrar
                    </h2>
                    <p className="mt-1 text-sm text-slate-600">
                      Use suas credenciais do Django Admin.
                    </p>
                  </div>
                  <div className="h-11 w-11 rounded-2xl bg-slate-100 flex items-center justify-center">
                    <Lock className="h-5 w-5 text-slate-700" />
                  </div>
                </div>

                <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                  {/* usuário */}
                  <label className="block">
                    <span className="text-sm font-medium text-slate-700">Usuário</span>
                    <div className="mt-2 relative">
                      <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                        <User className="h-4 w-4 text-slate-400" />
                      </div>
                      <input
                        className="w-full rounded-xl border border-slate-200 bg-white px-10 py-2.5 text-slate-900 placeholder:text-slate-400
                                   focus:outline-none focus:ring-4 focus:ring-slate-200 focus:border-slate-300"
                        placeholder="seu.usuario"
                        autoComplete="username"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                      />
                    </div>
                  </label>

                  {/* senha */}
                  <label className="block">
                    <span className="text-sm font-medium text-slate-700">Senha</span>
                    <div className="mt-2 relative">
                      <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                        <Lock className="h-4 w-4 text-slate-400" />
                      </div>
                      <input
                        type="password"
                        className="w-full rounded-xl border border-slate-200 bg-white px-10 py-2.5 text-slate-900 placeholder:text-slate-400
                                   focus:outline-none focus:ring-4 focus:ring-slate-200 focus:border-slate-300"
                        placeholder="••••••••"
                        autoComplete="current-password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                      />
                    </div>
                  </label>

                  {/* erro */}
                  {error && (
                    <div className="flex items-start gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                      <AlertCircle className="h-4 w-4 mt-0.5" />
                      <div>{error}</div>
                    </div>
                  )}

                  {/* botão */}
                  <button
                    className="w-full rounded-xl bg-slate-900 text-white font-semibold py-2.5
                               hover:bg-slate-800 active:bg-slate-950 transition
                               disabled:opacity-60 disabled:cursor-not-allowed
                               focus:outline-none focus:ring-4 focus:ring-slate-200"
                    type="submit"
                    disabled={!canSubmit}
                  >
                    {loading ? "Entrando..." : "Entrar"}
                  </button>

                  <div className="text-xs text-slate-500">
                    Dica: se você acabou de criar o usuário, confirme que ele tem senha definida no admin.
                  </div>
                </form>
              </div>

              <div className="mt-4 text-center text-xs text-slate-500">
                © {new Date().getFullYear()} Portal CRM
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}