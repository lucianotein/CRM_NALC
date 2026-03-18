import React from "react";
import { Routes, Route, Navigate, Link, useNavigate, useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  LayoutDashboard,
  KanbanSquare,
  Building2,
  LogOut,
  ShieldCheck,
} from "lucide-react";

import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";

import DealsKanban from "./pages/DealsKanban";
import DealDetail from "./pages/DealDetail";

import AccountsList from "./pages/AccountsList";
import AccountDetail from "./pages/AccountDetail";

import AdminPanel from "./pages/AdminPanel";

import { api } from "./api";
import nalcLogo from "./assets/nalc-logo.png";

type Me = { id: number; username: string; role?: string };

async function me(): Promise<Me> {
  const { data } = await api.get("/auth/me/");
  return data;
}

function Protected({ children }: { children: React.ReactNode }) {
  const q = useQuery({ queryKey: ["me"], queryFn: me, retry: false });

  if (q.isLoading) {
    return <div className="p-6 text-slate-700">Carregando...</div>;
  }

  if (q.isError) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

function Topbar() {
  const nav = useNavigate();
  const location = useLocation();
  const meQ = useQuery({ queryKey: ["me"], queryFn: me, retry: false });

  async function handleLogout() {
    try {
      await api.post("/auth/logout/");
    } finally {
      await meQ.refetch();
      nav("/login");
    }
  }

  const isActive = (path: string) => {
    if (path === "/") return location.pathname === "/";
    return location.pathname.startsWith(path);
  };

  const navCls = (active: boolean) =>
    [
      "inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-sm font-medium transition",
      active
        ? "bg-red-50 text-[#d91f26] border border-red-100"
        : "text-slate-700 hover:text-slate-900 hover:bg-slate-50 border border-transparent",
    ].join(" ");

  return (
    <div className="sticky top-0 z-40 border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center gap-4 px-6 py-3">
        {/* Marca */}
        <Link to="/" className="flex items-center gap-3 shrink-0">
          <img
            src={nalcLogo}
            alt="Nalc"
            className="h-12 w-12 rounded-2xl object-cover border border-slate-200 shadow-sm"
          />
          <div className="leading-tight">
            <div className="text-sm font-extrabold tracking-tight text-slate-900">
              CRM Nalc
            </div>
            <div className="text-[11px] text-slate-500">
              Gestão Comercial
            </div>
          </div>
        </Link>

        {/* Navegação */}
        <div className="ml-4 flex items-center gap-2">
          <Link to="/" className={navCls(isActive("/"))}>
            <LayoutDashboard className="h-4 w-4" />
            Dashboard
          </Link>

          <Link to="/deals" className={navCls(isActive("/deals"))}>
            <KanbanSquare className="h-4 w-4" />
            Kanban
          </Link>

          <Link to="/accounts" className={navCls(isActive("/accounts"))}>
            <Building2 className="h-4 w-4" />
            Construtoras
          </Link>

          {meQ.data?.role === "ADMINISTRADOR" && (
            <Link to="/admin" className={navCls(isActive("/admin"))}>
              <ShieldCheck className="h-4 w-4" />
              Administrar CRM
            </Link>
          )}
        </div>

        {/* Usuário */}
        <div className="ml-auto flex items-center gap-3">
          {meQ.data ? (
            <div className="hidden sm:block text-sm text-slate-600">
              Olá, <span className="font-semibold text-slate-900">{meQ.data.username}</span>
            </div>
          ) : null}

          <button
            onClick={handleLogout}
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-800
                       hover:bg-slate-50 transition focus:outline-none focus:ring-4 focus:ring-slate-200"
          >
            <LogOut className="h-4 w-4" />
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
                  <Route path="/" element={<Dashboard />} />

                  <Route path="/deals" element={<DealsKanban />} />
                  <Route path="/deals/:id" element={<DealDetail />} />

                  <Route path="/accounts" element={<AccountsList />} />
                  <Route path="/accounts/:id" element={<AccountDetail />} />

                  <Route path="/admin" element={<AdminPanel />} />

                  <Route
                    path="*"
                    element={
                      <div className="p-6 text-slate-700">
                        Página não encontrada.
                      </div>
                    }
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