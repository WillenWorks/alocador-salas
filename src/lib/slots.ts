// Blueprint Brutalista — utilitários de horário/slots.

import type { DiaSemana, SlotAulaTurma } from "@/lib/models";

export function isHora(s: string) {
  return /^\d{2}:\d{2}$/.test(s.trim());
}

export function slotKey(turmaId: string, dia: DiaSemana, hora: string) {
  return `${turmaId}|${dia}|${hora}`;
}

export function dedupeSlots(slots: SlotAulaTurma[]) {
  const seen = new Set<string>();
  return slots.filter((s) => {
    const k = slotKey(s.turmaId, s.dia, s.hora);
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}
