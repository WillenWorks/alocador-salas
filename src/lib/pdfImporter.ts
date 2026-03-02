// Blueprint Brutalista — importação de turmas/horários via PDF (pdfjs-dist).
// Estratégia: usar coordenadas (x,y) do texto para reconstruir a grade.

import { getDocument, GlobalWorkerOptions } from "pdfjs-dist";
import type { TextItem } from "pdfjs-dist/types/src/display/api";
import workerSrc from "pdfjs-dist/build/pdf.worker.min.mjs?url";

import type { DiaSemana, SlotAulaTurma, Turno } from "@/lib/models";

GlobalWorkerOptions.workerSrc = workerSrc;

export type TurmaExtraida = {
  codigo: string;
  turno: Turno;
  slots: Array<{ dia: DiaSemana; hora: string }>;
};

function guessTurno(codigo: string): Turno {
  const up = codigo.toUpperCase();
  if (up.includes("M")) return "manha";
  if (up.includes("T")) return "tarde";
  if (up.includes("N")) return "noite";
  return "indef";
}

function isHora(s: string) {
  return /^\d{2}:\d{2}$/.test(s.trim());
}

function norm(s: string) {
  return String(s ?? "").replace(/\s+/g, " ").trim();
}

function isMostlyDashes(s: string) {
  const t = s.replace(/\s+/g, "");
  if (!t) return true;
  // o PDF usa linhas longas de "-" quando vazio
  const dashCount = (t.match(/-/g) ?? []).length;
  return dashCount / t.length > 0.8;
}

type Positioned = {
  str: string;
  x: number;
  y: number;
};

function toPositioned(item: TextItem): Positioned {
  // item.transform = [a,b,c,d,e,f], onde e=x, f=y
  const tr = item.transform;
  return { str: item.str, x: tr[4] ?? 0, y: tr[5] ?? 0 };
}

function clusterByY(items: Positioned[], tolerance = 2): Positioned[][] {
  const sorted = [...items].sort((a, b) => b.y - a.y || a.x - b.x);
  const rows: Positioned[][] = [];
  for (const it of sorted) {
    const last = rows[rows.length - 1];
    if (!last) {
      rows.push([it]);
      continue;
    }
    const y0 = last[0].y;
    if (Math.abs(it.y - y0) <= tolerance) last.push(it);
    else rows.push([it]);
  }
  for (const r of rows) r.sort((a, b) => a.x - b.x);
  return rows;
}

function findHeaderXs(items: Positioned[]) {
  const wanted = [
    { key: "seg" as const, label: "Seg" },
    { key: "ter" as const, label: "Ter" },
    { key: "qua" as const, label: "Qua" },
    { key: "qui" as const, label: "Qui" },
    { key: "sex" as const, label: "Sex" },
  ];

  const xs: Partial<Record<DiaSemana, number>> = {};
  for (const w of wanted) {
    const hit = items.find((it) => norm(it.str) === w.label);
    if (hit) xs[w.key] = hit.x;
  }

  // fallback (se não achar): usa posições mais comuns de texto depois da coluna de hora
  return xs;
}

function columnForX(x: number, cols: Array<{ dia: DiaSemana; x: number }>): DiaSemana | null {
  if (!cols.length) return null;
  const sorted = [...cols].sort((a, b) => a.x - b.x);
  const mids: number[] = [];
  for (let i = 0; i < sorted.length - 1; i++) {
    mids.push((sorted[i].x + sorted[i + 1].x) / 2);
  }

  // regiões: (-inf, mid0] -> col0; (mid0, mid1] -> col1; ...
  for (let i = 0; i < mids.length; i++) {
    if (x <= mids[i]) return sorted[i].dia;
  }
  return sorted[sorted.length - 1].dia;
}

export async function extrairTurmasDoPdf(file: File): Promise<TurmaExtraida[]> {
  const buf = await file.arrayBuffer();
  const doc = await getDocument({ data: buf }).promise;

  const turmas: Record<string, TurmaExtraida> = {};

  for (let pageNo = 1; pageNo <= doc.numPages; pageNo++) {
    const page = await doc.getPage(pageNo);
    const content = await page.getTextContent();
    const raw = (content.items as TextItem[]).filter((i) => typeof i.str === "string" && i.str.trim() !== "");
    const items = raw.map(toPositioned);

    // pega colunas (x) a partir do cabeçalho Seg/Ter/...
    const headerXs = findHeaderXs(items);
    const cols = (Object.entries(headerXs) as Array<[DiaSemana, number]>).map(([dia, x]) => ({ dia, x }));

    // agrupa em linhas por y
    const rows = clusterByY(items);

    let currentTurma: string | null = null;

    for (const row of rows) {
      const line = norm(row.map((r) => r.str).join(" "));

      // Detecta início de bloco de turma
      // Pode vir como: "Turma: 0103NA" ou "Turma:" "0103NA" separados.
      const idxTurma = row.findIndex((r) => norm(r.str) === "Turma:" || norm(r.str) === "Turma");
      if (idxTurma !== -1) {
        const after = row.slice(idxTurma + 1).map((r) => norm(r.str)).filter(Boolean);
        const code = after[0] || (line.match(/Turma:\s*([A-Za-z0-9]+)/)?.[1] ?? null);
        if (code) {
          currentTurma = code;
          if (!turmas[currentTurma]) {
            turmas[currentTurma] = { codigo: currentTurma, turno: guessTurno(currentTurma), slots: [] };
          }
        }
        continue;
      }

      if (!currentTurma) continue;

      // Linha de horário começa com HH:MM
      const horaItem = row.find((r) => isHora(r.str));
      if (!horaItem) continue;
      const hora = norm(horaItem.str);

      // pega itens após a hora e distribui em colunas
      const afterHora = row.filter((r) => r.x > horaItem.x + 10);
      for (const it of afterHora) {
        const dia = columnForX(it.x, cols);
        if (!dia) continue;
        const t = norm(it.str);
        if (!t) continue;
        if (isMostlyDashes(t)) continue;
        // se for o cabeçalho repetido "Hor" etc, ignora
        if (["Hor", "Seg", "Ter", "Qua", "Qui", "Sex"].includes(t)) continue;

        turmas[currentTurma].slots.push({ dia, hora });
      }
    }
  }

  // Dedupe slots por turma
  for (const t of Object.values(turmas)) {
    const seen = new Set<string>();
    t.slots = t.slots.filter((s) => {
      const k = `${s.dia}|${s.hora}`;
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
  }

  return Object.values(turmas).sort((a, b) => a.codigo.localeCompare(b.codigo));
}

export function turmasExtraidasParaSlots(params: {
  turmaIdByCodigo: Record<string, string>;
  turmas: TurmaExtraida[];
}): SlotAulaTurma[] {
  const out: SlotAulaTurma[] = [];
  for (const t of params.turmas) {
    const turmaId = params.turmaIdByCodigo[t.codigo];
    if (!turmaId) continue;
    for (const sl of t.slots) {
      out.push({ turmaId, dia: sl.dia, hora: sl.hora });
    }
  }
  return out;
}
