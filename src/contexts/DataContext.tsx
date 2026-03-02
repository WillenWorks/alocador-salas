// Blueprint Brutalista — contexto de dados (MVP local-first).

import * as React from "react";
import type { AppData } from "@/lib/storage";
import { createEmptyData, loadData, saveData } from "@/lib/storage";

type DataContextValue = {
  data: AppData;
  setData: React.Dispatch<React.SetStateAction<AppData>>;
  reset: () => void;
};

const DataContext = React.createContext<DataContextValue | null>(null);

export function DataProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = React.useState<AppData>(() => loadData());

  React.useEffect(() => {
    saveData(data);
  }, [data]);

  const reset = React.useCallback(() => {
    setData(createEmptyData());
  }, []);

  const value = React.useMemo(() => ({ data, setData, reset }), [data, reset]);

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData() {
  const ctx = React.useContext(DataContext);
  if (!ctx) throw new Error("useData deve ser usado dentro de DataProvider");
  return ctx;
}
