import React from "react";
import { Navigate } from "react-router-dom";
import { useMe } from "./auth";

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { data, isLoading, isError } = useMe();

  if (isLoading) return <div style={{ padding: 16 }}>Carregando...</div>;
  if (isError || !data) return <Navigate to="/login" replace />;

  return <>{children}</>;
}