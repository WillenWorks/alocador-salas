// Blueprint Brutalista — gerador de relatório PDF (impressão).

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

import type { Sala, Turma, MatriculaTurma, SlotAulaTurma } from "@/lib/models";
import { alocarSalas } from "@/lib/allocator";

export function gerarRelatorioPdf(params: {
  salas: Sala[];
  turmas: Turma[];
  matriculas: MatriculaTurma[];
  slots: SlotAulaTurma[];
}) {
  const res = alocarSalas(params);

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();

  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("Relatório — Mapa de Alocações (Turma → Sala)", 14, 16);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(`Gerado em: ${new Date().toLocaleString()}`, 14, 22);

  // Tabela de alocações
  const linhas = res.alocacoes
    .map((a) => {
      const turma = params.turmas.find((t) => t.id === a.turmaId);
      const sala = params.salas.find((s) => s.id === a.salaId);
      const n = params.matriculas.find((m) => m.turmaId === a.turmaId)?.qtdeAlunos ?? 0;
      return {
        Turma: turma?.codigo ?? a.turmaId,
        Turno: turma?.turno ?? "indef",
        Matriculados: n,
        Sala: sala?.codigo ?? a.salaId,
        Capacidade: sala?.capacidade ?? 0,
        Localização: sala?.localizacao ?? "",
      };
    })
    .sort((x, y) => String(x.Turma).localeCompare(String(y.Turma)));

  autoTable(doc, {
    startY: 28,
    head: [["Turma", "Turno", "Matriculados", "Sala", "Cap.", "Localização"]],
    body: linhas.map((r) => [r.Turma, r.Turno, String(r.Matriculados), r.Sala, String(r.Capacidade), r["Localização"]]),
    styles: { fontSize: 8, cellPadding: 1.6 },
    headStyles: { fillColor: [12, 164, 192], textColor: 255 },
    alternateRowStyles: { fillColor: [245, 245, 245] },
    columnStyles: {
      2: { halign: "right" },
      4: { halign: "right" },
    },
    margin: { left: 12, right: 12 },
  });

  const yAfter = (doc as any).lastAutoTable?.finalY ?? 28;

  // Seção conflitos
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);

  // quebra página se precisar
  const nextY = yAfter + 10;
  if (nextY > 270) doc.addPage();

  const titleY = Math.min(nextY, 20);
  if (titleY === 20) {
    doc.text("Conflitos", 14, 16);
  } else {
    doc.text("Conflitos", 14, nextY);
  }

  const conflitos = res.conflitos
    .map((c) => {
      const turma = params.turmas.find((t) => t.id === c.turmaId);
      return {
        Turma: turma?.codigo ?? c.turmaId,
        Tipo: c.tipo,
        Motivo: (c as any).motivo ?? "",
      };
    })
    .sort((a, b) => String(a.Turma).localeCompare(String(b.Turma)));

  autoTable(doc, {
    startY: titleY === 20 ? 20 : nextY + 4,
    head: [["Turma", "Tipo", "Motivo"]],
    body: conflitos.length ? conflitos.map((c) => [c.Turma, c.Tipo, c.Motivo]) : [["—", "—", "Sem conflitos"]],
    styles: { fontSize: 8, cellPadding: 1.6 },
    headStyles: { fillColor: [244, 122, 64], textColor: 0 },
    alternateRowStyles: { fillColor: [250, 250, 250] },
    margin: { left: 12, right: 12 },
    columnStyles: {
      0: { cellWidth: 28 },
      1: { cellWidth: 34 },
      2: { cellWidth: pageWidth - 12 - 12 - 28 - 34 },
    },
  });

  doc.save("relatorio_alocacao_salas_2026_1.pdf");
}
