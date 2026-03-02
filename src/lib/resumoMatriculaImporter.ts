// Blueprint Brutalista — importador da tabela "Resumo de matrícula" por semestre.

import type { MatriculaTurma } from "@/lib/models";

export type ResumoRow = {
  semestre: string;
  curso?: string;
  turma: string;
  alunosAtuais: number;
  reservas: number;
  total: number;
};

function norm(v: unknown) {
  return String(v ?? "").replace(/\s+/g, " ").trim();
}

function isSemestre(v: unknown) {
  return /^\d{4}\/\d$/.test(norm(v));
}

function toInt(v: unknown) {
  const s = norm(v).replace(/[^0-9]/g, "");
  return s ? Number(s) : 0;
}

// A planilha costuma vir com blocos de colunas lado a lado:
// 2025/2 | Turma | Nº Atual ... | (vazio) || 2026/1 | Turma | Nº Atual ... | Reserva | Total
export function parseResumoMatriculaGrid(grid: unknown[][]): ResumoRow[] {
  if (!grid.length) return [];

  const header0 = grid[0] ?? [];

  const semestres: Array<{ semestre: string; col: number }> = [];
  for (let c = 0; c < header0.length; c++) {
    const v = header0[c];
    if (isSemestre(v)) semestres.push({ semestre: norm(v), col: c });
  }
  if (!semestres.length) return [];

  // define blocos por intervalo [start, end)
  const blocks = semestres
    .map((s, idx) => {
      const start = s.col;
      const end = idx + 1 < semestres.length ? semestres[idx + 1].col : header0.length;
      return { semestre: s.semestre, start, end };
    })
    .filter((b) => b.end - b.start >= 2);

  const out: ResumoRow[] = [];

  // curso costuma aparecer em uma linha com texto grande na primeira coluna do bloco
  const cursoAtual: Record<string, string | undefined> = {};

  for (let r = 1; r < grid.length; r++) {
    const row = grid[r] ?? [];

    for (const b of blocks) {
      const slice = row.slice(b.start, b.end);
      const v0 = norm(slice[0]);

      // linha de curso (ex.: "CIÊNCIA DA COMPUTAÇÃO")
      if (v0 && !v0.toLowerCase().startsWith("turma") && !v0.toLowerCase().startsWith("total") && !/^\d{4}/.test(v0) && !/^[0-9]{3,4}/.test(v0)) {
        cursoAtual[b.semestre] = v0;
        continue;
      }

      // linha de turma: primeira célula do bloco começa com código (ex.: 0103NA)
      const turma = v0;
      if (!turma || turma.toLowerCase().startsWith("turma") || turma.toLowerCase().startsWith("total")) continue;

      // Heurística de colunas:
      // - alunosAtuais: primeira célula numérica após turma
      // - reservas: se existir uma segunda numérica (ou coluna com label Reserva no header), usa
      // - total: se existir uma terceira numérica, usa; senão total = alunos + reservas
      const nums = slice.slice(1).map(toInt).filter((n) => n !== 0 || slice.slice(1).some((x) => norm(x) === "0"));

      // Mas o filtro acima pode eliminar zeros legítimos; então pegamos por posição
      const alunosAtuais = toInt(slice[1]);
      const reservas = slice.length >= 3 ? toInt(slice[2]) : 0;
      const total = slice.length >= 4 ? toInt(slice[3]) : alunosAtuais + reservas;

      // Caso bloco seja curto (ex.: só turma+alunos)
      const reservasFinal = slice.length >= 3 ? reservas : 0;
      const totalFinal = slice.length >= 4 ? total : alunosAtuais + reservasFinal;

      // se não tem nenhum número, ignora
      if (!alunosAtuais && !reservasFinal && !totalFinal) continue;

      out.push({
        semestre: b.semestre,
        curso: cursoAtual[b.semestre],
        turma,
        alunosAtuais,
        reservas: reservasFinal,
        total: totalFinal,
      });
    }
  }

  return out;
}

export function resumoParaMatriculas(params: {
  resumo: ResumoRow[];
  turmaIdByCodigo: Record<string, string>;
  semestre: string;
  usar: "alunosAtuais" | "total";
}): { matriculas: MatriculaTurma[]; turmasNaoEncontradas: string[] } {
  const turmasNaoEncontradas: string[] = [];
  const matriculas: MatriculaTurma[] = [];

  for (const r of params.resumo.filter((x) => x.semestre === params.semestre)) {
    const turmaId = params.turmaIdByCodigo[r.turma];
    if (!turmaId) {
      turmasNaoEncontradas.push(r.turma);
      continue;
    }
    const qtde = params.usar === "total" ? r.total : r.alunosAtuais;
    matriculas.push({ turmaId, qtdeAlunos: qtde });
  }

  return { matriculas, turmasNaoEncontradas };
}
