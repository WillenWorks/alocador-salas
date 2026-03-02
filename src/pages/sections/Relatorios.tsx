// Blueprint Brutalista — relatórios: exportar Excel + visão rápida.

import * as React from "react";
import * as XLSX from "xlsx";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";

import { useData } from "@/contexts/DataContext";
import { alocarSalas } from "@/lib/allocator";
import { gerarRelatorioPdf } from "@/lib/pdfReport";

export default function RelatoriosPage() {
  const { data } = useData();

  const exportar = () => {
    const res = alocarSalas({ salas: data.salas, turmas: data.turmas, matriculas: data.matriculas, slots: data.slots });

    const linhas = res.alocacoes
      .map((a) => {
        const turma = data.turmas.find((t) => t.id === a.turmaId);
        const sala = data.salas.find((s) => s.id === a.salaId);
        const n = data.matriculas.find((m) => m.turmaId === a.turmaId)?.qtdeAlunos ?? 0;
        return {
          Turma: turma?.codigo ?? a.turmaId,
          Turno: turma?.turno ?? "indef",
          Matriculados: n,
          Sala: sala?.codigo ?? a.salaId,
          Capacidade: sala?.capacidade ?? 0,
          Localizacao: sala?.localizacao ?? "",
        };
      })
      .sort((x, y) => String(x.Turma).localeCompare(String(y.Turma)));

    const conflitos = res.conflitos.map((c) => {
      const turma = data.turmas.find((t) => t.id === c.turmaId);
      return {
        Turma: turma?.codigo ?? c.turmaId,
        Tipo: c.tipo,
        Motivo: (c as any).motivo ?? "",
      };
    });

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(linhas), "Alocacao");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(conflitos), "Conflitos");

    XLSX.writeFile(wb, "alocacao_salas_2026_1.xlsx");
    toast.success("Arquivo Excel gerado.");
  };

  const res = React.useMemo(
    () => alocarSalas({ salas: data.salas, turmas: data.turmas, matriculas: data.matriculas, slots: data.slots }),
    [data.salas, data.turmas, data.matriculas, data.slots]
  );

  const ocupacaoPorTurno = React.useMemo(() => {
    const rows: Array<{ turno: string; turmas: number; salasUsadas: number }> = [];
    const turnos = ["manha", "tarde", "noite", "indef"] as const;
    for (const turno of turnos) {
      const turmasTurno = data.turmas.filter((t) => t.turno === turno);
      const turmaIds = new Set(turmasTurno.map((t) => t.id));
      const alocs = res.alocacoes.filter((a) => turmaIds.has(a.turmaId));
      const salasUsadas = new Set(alocs.map((a) => a.salaId)).size;
      rows.push({ turno, turmas: turmasTurno.length, salasUsadas });
    }
    return rows;
  }, [data.turmas, res.alocacoes]);

  return (
    <div className="p-6 space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl">Relatórios</h1>
          <p className="text-muted-foreground">Exportação e visão geral do cenário atual.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={() => gerarRelatorioPdf({ salas: data.salas, turmas: data.turmas, matriculas: data.matriculas, slots: data.slots })}
            className="bg-primary text-primary-foreground"
          >
            Exportar PDF (impressão)
          </Button>
          <Button onClick={exportar} variant="outline">Exportar Excel</Button>
        </div>
      </div>

      <Card className="bg-card/70 backdrop-blur">
        <CardHeader>
          <CardTitle className="text-base">Checklist</CardTitle>
          <CardDescription>O que já está carregado no sistema</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <span>Salas</span>
            <span className="font-semibold">{data.salas.length}</span>
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <span>Turmas</span>
            <span className="font-semibold">{data.turmas.length}</span>
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <span>Matrículas</span>
            <span className="font-semibold">{data.matriculas.length}</span>
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <span>Slots (horários)</span>
            <span className="font-semibold">{data.slots.length}</span>
          </div>

          <p className="pt-2 text-xs text-muted-foreground">
            Nota: no MVP, horários (slots) ainda não são importados do PDF. Quando isso entrar, a alocação bloqueia conflitos por dia/horário.
          </p>
        </CardContent>
      </Card>

      <Card className="bg-card/70 backdrop-blur">
        <CardHeader>
          <CardTitle className="text-base">Ocupação (visão rápida)</CardTitle>
          <CardDescription>Por turno (baseado na última alocação calculada)</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {ocupacaoPorTurno.map((r) => (
            <div key={r.turno} className="flex items-center justify-between">
              <span className="capitalize">{r.turno}</span>
              <span className="text-sm text-muted-foreground">{r.turmas} turmas • {r.salasUsadas} salas usadas</span>
            </div>
          ))}
          <p className="pt-2 text-xs text-muted-foreground">
            Para grade por dia/horário (ocupação real), precisamos importar os horários (slots) das turmas.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
