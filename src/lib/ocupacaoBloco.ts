// Blueprint Brutalista — métricas de ocupação por bloco/dia/hora.

import type { DiaSemana, Sala, SlotAulaTurma, Turma } from "@/lib/models";
import type { Alocacao } from "@/lib/models";

export type BlocoKey = string;

export const DIAS: Array<{ key: DiaSemana; label: string }> = [
  { key: "seg", label: "Seg" },
  { key: "ter", label: "Ter" },
  { key: "qua", label: "Qua" },
  { key: "qui", label: "Qui" },
  { key: "sex", label: "Sex" },
];

export function extractBloco(localizacao?: string): BlocoKey {
  const raw = (localizacao ?? "").toUpperCase();
  const m = raw.match(/BLOCO\s+([A-Z0-9]+)/);
  if (m) return `BLOCO ${m[1]}`;
  if (!raw.trim()) return "SEM BLOCO";
  // fallback: pega primeira parte antes de hífen
  const head = raw.split("-")[0].trim();
  return head || "SEM BLOCO";
}

export function getBlocosFromSalas(salas: Sala[]): BlocoKey[] {
  const set = new Set<string>();
  for (const s of salas) set.add(extractBloco(s.localizacao));
  return Array.from(set).sort((a, b) => a.localeCompare(b));
}

export type HeatmapPoint = {
  bloco: BlocoKey;
  dia: DiaSemana;
  hora: string;
  salasOcupadas: number;
};

export function computeOcupacaoBloco(params: {
  salas: Sala[];
  turmas: Turma[];
  alocacoes: Alocacao[];
  slots: SlotAulaTurma[];
}): HeatmapPoint[] {
  const salaById = new Map(params.salas.map((s) => [s.id, s] as const));
  const turmaById = new Map(params.turmas.map((t) => [t.id, t] as const));
  const salaDaTurma = new Map(params.alocacoes.map((a) => [a.turmaId, a.salaId] as const));

  // bloco|dia|hora => set(salaId)
  const occ = new Map<string, Set<string>>();

  for (const sl of params.slots) {
    if (!turmaById.has(sl.turmaId)) continue;
    const salaId = salaDaTurma.get(sl.turmaId);
    if (!salaId) continue;
    const sala = salaById.get(salaId);
    if (!sala) continue;
    const bloco = extractBloco(sala.localizacao);

    const k = `${bloco}|${sl.dia}|${sl.hora}`;
    const set = occ.get(k) ?? new Set<string>();
    set.add(salaId);
    occ.set(k, set);
  }

  const out: HeatmapPoint[] = [];
  for (const [k, set] of occ.entries()) {
    const [bloco, dia, hora] = k.split("|");
    out.push({ bloco, dia: dia as DiaSemana, hora, salasOcupadas: set.size });
  }

  // inclui zeros? deixamos para a UI preencher 0 onde não existe ponto.
  return out;
}

export function sortHoras(horas: string[]) {
  return [...new Set(horas)].sort((a, b) => a.localeCompare(b));
}
