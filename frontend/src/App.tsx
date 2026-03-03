import React from "react";
import { Routes, Route, Navigate, Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";

import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";

import DealsKanban from "./pages/DealsKanban";
import DealDetail from "./pages/DealDetail";

import AccountsList from "./pages/AccountsList";
import AccountDetail from "./pages/AccountDetail";

import { api } from "./api";

type Me = { id: number; username: string };

async function me(): Promise<Me> {
  const { data } = await api.get("/auth/me/");
  return data;
}

function Protected({ children }: { children: React.ReactNode }) {
  const q = useQuery({ queryKey: ["me"], queryFn: me, retry: false });
  if (q.isLoading) return <div className="p-6 text-slate-700">Carregando...</div>;
  if (q.isError) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function Topbar() {
  const nav = useNavigate();
  const meQ = useQuery({ queryKey: ["me"], queryFn: me, retry: false });

  async function handleLogout() {
    try {
      await api.post("/auth/logout/");
    } finally {
      await meQ.refetch();
      nav("/login");
    }
  }

  const linkCls =
    "text-sm font-medium text-slate-700 hover:text-slate-900 transition";

  return (
    <div className="sticky top-0 z-40 border-b border-slate-200 bg-white/80 backdrop-blur">
      <div className="mx-auto max-w-6xl px-6 py-3 flex items-center gap-5">
        <div className="font-extrabold text-slate-900">CRM</div>

        <Link to="/" className={linkCls}>
          Dashboard
        </Link>
        <Link to="/deals" className={linkCls}>
          Kanban
        </Link>
        <Link to="/accounts" className={linkCls}>
          Construtoras
        </Link>

        <div className="ml-auto flex items-center gap-3">
          {meQ.data ? (
            <div className="text-sm text-slate-600">Olá, {meQ.data.username}</div>
          ) : null}

          <button
            onClick={handleLogout}
            className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-800
                       hover:bg-slate-50 transition focus:outline-none focus:ring-4 focus:ring-slate-200"
          >
            Sair
          </button>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <div className="min-h-screen bg-slate-50">
      <Routes>
        <Route path="/login" element={<Login />} />

        <Route
          path="/*"
          element={
            <Protected>
              <>
                <Topbar />
                <Routes>
                  {/* ✅ Página inicial vira Dashboard */}
                  <Route path="/" element={<Dashboard />} />

                  <Route path="/deals" element={<DealsKanban />} />
                  <Route path="/deals/:id" element={<DealDetail />} />

                  <Route path="/accounts" element={<AccountsList />} />
                  <Route path="/accounts/:id" element={<AccountDetail />} />

                  <Route
                    path="*"
                    element={<div className="p-6 text-slate-700">Página não encontrada.</div>}
                  />
                </Routes>
              </>
            </Protected>
          }
        />
      </Routes>
    </div>
  );
}