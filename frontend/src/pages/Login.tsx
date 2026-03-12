import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, ensureCsrf } from "../api";
import { Lock, User, AlertCircle, ArrowRight } from "lucide-react";
import nalcLogo from "../assets/nalc-logo.png";

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
    <div className="min-h-screen bg-[#f6f7fb]">
      <div className="mx-auto flex min-h-screen max-w-7xl items-center px-6 py-8">
        <div className="grid w-full overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-xl lg:grid-cols-[1.02fr_0.98fr]">
          {/* LADO ESQUERDO */}
          <div className="relative hidden min-h-[720px] overflow-hidden bg-[#d91f26] lg:flex lg:flex-col lg:items-center lg:justify-center">
            {/* fundo com leve profundidade */}
            <div className="absolute inset-0 bg-gradient-to-br from-[#ef2a2a] via-[#d91f26] to-[#b9151c]" />

            {/* grid sutil */}
            <div
              className="absolute inset-0 opacity-[0.06]"
              style={{
                backgroundImage: `
                  linear-gradient(to right, rgba(255,255,255,0.35) 1px, transparent 1px),
                  linear-gradient(to bottom, rgba(255,255,255,0.35) 1px, transparent 1px)
                `,
                backgroundSize: "26px 26px",
              }}
            />

            {/* círculos bem sutis */}
            <div className="absolute left-1/2 top-1/2 h-[280px] w-[280px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/[0.08]" />
            <div className="absolute left-1/2 top-1/2 h-[460px] w-[460px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/[0.06]" />
            <div className="absolute left-1/2 top-1/2 h-[640px] w-[640px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/[0.05]" />

            <div className="relative z-10 flex flex-col items-center justify-center px-10 text-center">
              {/* glow */}
              <div className="absolute top-[88px] h-52 w-52 rounded-full bg-white/20 blur-3xl" />

              {/* aro sutil */}
              <div className="absolute top-[44px] h-72 w-72 rounded-full border border-white/15" />

              {/* logo maior */}
              <img
                src={nalcLogo}
                alt="Nalc"
                className="relative h-52 w-52 object-contain drop-shadow-[0_18px_30px_rgba(0,0,0,0.22)]"
              />

              <div className="mt-10 text-sm font-semibold uppercase tracking-[0.30em] text-white/80">
                CRM NALC
              </div>

              <h1 className="mt-3 text-5xl font-semibold tracking-tight text-white">
                Gestão Comercial
              </h1>
            </div>
          </div>

          {/* LADO DIREITO */}
          <div className="flex items-center justify-center px-6 py-10 lg:px-12">
            <div className="w-full max-w-md">
              {/* marca no mobile */}
              <div className="mb-6 lg:hidden">
                <div className="flex items-center gap-3">
                  <img
                    src={nalcLogo}
                    alt="Nalc"
                    className="h-16 w-16 rounded-2xl object-cover"
                  />
                  <div>
                    <div className="text-sm font-semibold tracking-tight text-slate-900">
                      CRM Nalc
                    </div>
                    <div className="text-xs text-slate-500">
                      Gestão Comercial
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-[28px] border border-slate-200 bg-white p-7 shadow-sm">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-2xl font-semibold tracking-tight text-slate-900">
                      Entrar no sistema
                    </h2>
                    <p className="mt-1 text-sm text-slate-600">
                      Acesse com seu usuário e senha.
                    </p>
                  </div>

                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50">
                    <Lock className="h-5 w-5 text-[#d91f26]" />
                  </div>
                </div>

                <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                  <label className="block">
                    <span className="text-sm font-medium text-slate-700">Usuário</span>
                    <div className="relative mt-2">
                      <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                        <User className="h-4 w-4 text-slate-400" />
                      </div>

                      <input
                        className="w-full rounded-2xl border border-slate-200 bg-white px-10 py-3 text-slate-900 placeholder:text-slate-400
                                   focus:outline-none focus:ring-4 focus:ring-red-100 focus:border-red-200"
                        placeholder="seu.usuario"
                        autoComplete="username"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                      />
                    </div>
                  </label>

                  <label className="block">
                    <span className="text-sm font-medium text-slate-700">Senha</span>
                    <div className="relative mt-2">
                      <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                        <Lock className="h-4 w-4 text-slate-400" />
                      </div>

                      <input
                        type="password"
                        className="w-full rounded-2xl border border-slate-200 bg-white px-10 py-3 text-slate-900 placeholder:text-slate-400
                                   focus:outline-none focus:ring-4 focus:ring-red-100 focus:border-red-200"
                        placeholder="••••••••"
                        autoComplete="current-password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                      />
                    </div>
                  </label>

                  {error && (
                    <div className="flex items-start gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                      <AlertCircle className="mt-0.5 h-4 w-4" />
                      <div>{error}</div>
                    </div>
                  )}

                  <button
                    className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#d91f26] py-3 font-semibold text-white
                               transition hover:bg-[#bf1b21] active:bg-[#a8161c]
                               disabled:cursor-not-allowed disabled:opacity-60
                               focus:outline-none focus:ring-4 focus:ring-red-100"
                    type="submit"
                    disabled={!canSubmit}
                  >
                    {loading ? "Entrando..." : "Entrar no CRM"}
                    {!loading && <ArrowRight className="h-4 w-4" />}
                  </button>
                </form>
              </div>

              <div className="mt-4 text-center text-xs text-slate-500">
                © {new Date().getFullYear()} Nalc Elevadores e Escadas Rolantes
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}