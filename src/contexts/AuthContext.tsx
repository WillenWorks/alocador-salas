// Blueprint Brutalista — auth simples + Supabase Auth (1 tenant).

import * as React from "react";
import { hasSupabaseEnv, supabase } from "@/lib/supabase";

export type AppUser = {
  id: string;
  email: string;
  role: "admin" | "operador";
};

type AuthContextValue = {
  user: AppUser | null;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  isDemo: boolean;
};

const AuthContext = React.createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const isDemo = !hasSupabaseEnv;
  const [user, setUser] = React.useState<AppUser | null>(() => {
    if (isDemo) {
      const raw = localStorage.getItem("alocador.auth.user");
      return raw ? (JSON.parse(raw) as AppUser) : null;
    }
    return null;
  });

  React.useEffect(() => {
    if (isDemo) return;
    if (!supabase) return;

    let mounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      const u = data.session?.user;
      setUser(u ? { id: u.id, email: u.email ?? "", role: "admin" } : null);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      const u = session?.user;
      setUser(u ? { id: u.id, email: u.email ?? "", role: "admin" } : null);
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, [isDemo]);

  const login = React.useCallback(
    async (email: string, password: string) => {
      if (isDemo) {
        if (email.toLowerCase() === "admin" && password === "admin") {
          const u: AppUser = { id: "demo-admin", email: "admin", role: "admin" };
          setUser(u);
          localStorage.setItem("alocador.auth.user", JSON.stringify(u));
          return;
        }
        throw new Error("Credenciais inválidas. No modo demo use admin/admin.");
      }

      if (!supabase) throw new Error("Supabase não inicializado (verifique as variáveis VITE_...).");

      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw new Error(error.message);
    },
    [isDemo]
  );

  const signup = React.useCallback(
    async (email: string, password: string) => {
      if (isDemo) throw new Error("No modo demo não existe criação de conta.");
      if (!supabase) throw new Error("Supabase não inicializado (verifique as variáveis VITE_...).");

      const { error } = await supabase.auth.signUp({ email, password });
      if (error) throw new Error(error.message);
    },
    [isDemo]
  );

  const logout = React.useCallback(async () => {
    if (isDemo) {
      setUser(null);
      localStorage.removeItem("alocador.auth.user");
      return;
    }

    if (!supabase) return;
    await supabase.auth.signOut();
  }, [isDemo]);

  const value = React.useMemo(
    () => ({ user, login, signup, logout, isDemo }),
    [user, login, signup, logout, isDemo]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = React.useContext(AuthContext);
  if (!ctx) throw new Error("useAuth deve ser usado dentro de AuthProvider");
  return ctx;
}
