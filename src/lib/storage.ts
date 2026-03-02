// Blueprint Brutalista — persistência local (MVP) + ponto de extensão para Supabase.

import { nanoid } from "nanoid";
import type { Sala, Turma, MatriculaTurma, SlotAulaTurma } from "@/lib/models";

export type AppData = {
  salas: Sala[];
  turmas: Turma[];
  matriculas: MatriculaTurma[];
  slots: SlotAulaTurma[];
};

const KEY = "alocador.data.v1";

export function createEmptyData(): AppData {
  return { salas: [], turmas: [], matriculas: [], slots: [] };
}

export function loadData(): AppData {
  const raw = localStorage.getItem(KEY);
  if (!raw) return createEmptyData();
  try {
    return JSON.parse(raw) as AppData;
  } catch {
    return createEmptyData();
  }
}

export function saveData(data: AppData) {
  localStorage.setItem(KEY, JSON.stringify(data));
}

export function makeId(prefix: string) {
  return `${prefix}_${nanoid(10)}`;
}
