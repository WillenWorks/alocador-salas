// Blueprint Brutalista — contexto de dados (local-first + Supabase opcional).


import * as React from "react";
import type { AppData } from "@/lib/storage";
import { createEmptyData, loadData, saveData } from "@/lib/storage";
import { supabase } from "@/lib/supabase.ts/supabase";
import { useAuth } from "@/contexts/AuthContext";


type DataContextValue = {
  data: AppData;
  setData: React.Dispatch<React.SetStateAction<AppData>>;
  reset: () => void;
  isSyncing: boolean;
};


const DataContext = React.createContext<DataContextValue | null>(null);


export function DataProvider({ children }: { children: React.ReactNode }) {
  const { user, isDemo } = useAuth();


  const [data, setData] = React.useState<AppData>(() => (isDemo ? loadData() : createEmptyData()));
  const [isSyncing, setIsSyncing] = React.useState(false);


  React.useEffect(() => {
    if (isDemo) return;
    const sb = supabase;
    if (!sb) return;


    if (!user) {
      setData(createEmptyData());
      return;
    }


    let alive = true;


    (async () => {
      setIsSyncing(true);
      const empty = createEmptyData();


      const { data: row, error } = await sb
        .from("app_data")
        .select("data")
        .eq("user_id", user.id)
        .maybeSingle();


      if (!alive) return;


      if (error) {
        console.error("Falha ao carregar app_data:", error);
        setData(empty);
        setIsSyncing(false);
        return;
      }


      if (!row) {
        const { error: insErr } = await sb.from("app_data").insert({ user_id: user.id, data: empty });
        if (insErr) console.error("Falha ao criar app_data:", insErr);
        if (!alive) return;
        setData(empty);
        setIsSyncing(false);
        return;
