// Blueprint Brutalista — auth simples + modo demo.

import * as React from "react";

export type AppUser = {
  id: string;
  email: string;
  role: "admin" | "operador";
};

type AuthContextValue = {
  user: AppUser | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  isDemo: boolean;
};

const AuthContext = React.createContext<AuthContextValue | null>(null);

function hasSupabaseEnv() {
  const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
  return Boolean(url && key);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const isDemo = !hasSupabaseEnv();
  const [user, setUser] = React.useState<AppUser | null>(() => {
    const raw = localStorage.getItem("alocador.auth.user");
    return raw ? (JSON.parse(raw) as AppUser) : null;
  });

  const login = React.useCallback(async (email: string, password: string) => {
    // MVP: modo demo (sem Supabase configurado) com credenciais fixas.
    if (isDemo) {
      if (email.toLowerCase() === "admin" && password === "admin") {
        const u: AppUser = { id: "demo-admin", email: "admin", role: "admin" };
        setUser(u);
        localStorage.setItem("alocador.auth.user", JSON.stringify(u));
        return;
      }
      throw new Error("Credenciais inválidas. No modo demo use admin/admin.");
    }

    // TODO (fase 2): integrar com Supabase Auth (ou tabela custom) de acordo com a instituição.
    // Mantemos o contrato para não travar o MVP.
    throw new Error(
      "Supabase configurado, mas o fluxo de login ainda não foi ligado. (Fase 2)"
    );
  }, [isDemo]);

  const logout = React.useCallback(() => {
    setUser(null);
    localStorage.removeItem("alocador.auth.user");
  }, []);

  const value = React.useMemo(() => ({ user, login, logout, isDemo }), [user, login, logout, isDemo]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = React.useContext(AuthContext);
  if (!ctx) throw new Error("useAuth deve ser usado dentro de AuthProvider");
  return ctx;
}
