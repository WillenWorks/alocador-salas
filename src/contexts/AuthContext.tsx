// Blueprint Brutalista — auth simples + Supabase Auth (1 tenant).


import * as React from "react";
import { hasSupabaseEnv, supabase } from "@/lib/supabase.ts/supabase";


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
