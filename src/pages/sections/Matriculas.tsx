// Blueprint Brutalista — seção Matrículas: importar contagens por turma.

import * as React from "react";
import * as XLSX from "xlsx";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";

import { useData } from "@/contexts/DataContext";
import type { MatriculaTurma } from "@/lib/models";
import { parseResumoMatriculaGrid, resumoParaMatriculas } from "@/lib/resumoMatriculaImporter";

export default function MatriculasPage() {
  const { data, setData } = useData();
  const [turma, setTurma] = React.useState("");
  const [qtde, setQtde] = React.useState<number>(0);

  const upsert = () => {
    const cod = turma.trim();
    if (!cod) return;
    const t = data.turmas.find((x) => x.codigo === cod);
    if (!t) {
      toast.error("Turma não encontrada (cadastre/importa a turma primeiro).");
      return;
    }

    setData((d) => {
      const rest = d.matriculas.filter((m) => m.turmaId !== t.id);
      return { ...d, matriculas: [...rest, { turmaId: t.id, qtdeAlunos: Number(qtde) || 0 }] };
    });
    setTurma("");
    setQtde(0);
  };

  const onImport = async (file: File) => {
    const isCsv = file.name.toLowerCase().endsWith(".csv");
    const wb = isCsv
      ? XLSX.read(await file.text(), { type: "string" })
      : XLSX.read(await file.arrayBuffer());
    const sheetName = wb.SheetNames[0];
    const sheet = wb.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json<Record<string, any>>(sheet, { defval: "" });

    // 1) Tenta formato simples: colunas Turma + Matriculados/Alunos
    const matriculas: MatriculaTurma[] = [];
    const faltando: string[] = [];

    for (const r of rows) {
      const cod = String(r["Turma"] ?? r["TURMA"] ?? r["codigo"] ?? r["Código"] ?? "").trim();
      if (!cod) continue;
      const turma = data.turmas.find((t) => t.codigo === cod);
      if (!turma) {
        faltando.push(cod);
        continue;
      }
      const n = Number(String(r["Total"] ?? r["TOTAL"] ?? r["Matriculados"] ?? r["MATRICULADOS"] ?? r["Alunos"] ?? r["ALUNOS"] ?? "0").replace(/[^0-9]/g, "")) || 0;
      matriculas.push({ turmaId: turma.id, qtdeAlunos: n });
    }

    // 2) Se vier vazio, tenta o formato "Resumo de matrícula" por semestre (blocos lado a lado)
    if (!matriculas.length) {
      const grid = XLSX.utils.sheet_to_json<any[]>(sheet, { header: 1, defval: "" }) as unknown[][];
      const resumo = parseResumoMatriculaGrid(grid);
      if (!resumo.length) {
        toast.error("Nada importado. Verifique colunas ou use a tabela 'Resumo de matrícula'.");
        return;
      }

      // escolhe o semestre mais à direita (normalmente o atual)
      const semestres = Array.from(new Set(resumo.map((r) => r.semestre)));
      const semestre = semestres[semestres.length - 1];

      const turmaIdByCodigo: Record<string, string> = {};
      for (const t of data.turmas) turmaIdByCodigo[t.codigo] = t.id;

      const { matriculas: mats, turmasNaoEncontradas } = resumoParaMatriculas({
        resumo,
        turmaIdByCodigo,
        semestre,
        usar: "total",
      });

      if (!mats.length) {
        toast.error(`Resumo encontrado, mas nenhuma turma do semestre ${semestre} bateu com o cadastro.`);
        return;
      }

      setData((d) => ({ ...d, matriculas: mats }));
      toast.success(`Importadas ${mats.length} matrículas (resumo ${semestre}).`);
      if (turmasNaoEncontradas.length) {
        toast.message(`${turmasNaoEncontradas.length} turma(s) do resumo não existem no cadastro e foram ignoradas.`);
      }
      return;
    }

    setData((d) => ({ ...d, matriculas }));

    toast.success(`Importadas ${matriculas.length} matrículas (aba: ${sheetName}).`);
    if (faltando.length) {
      toast.message(`${faltando.length} turma(s) não existem no cadastro e foram ignoradas.`);
    }
  };

  const table = data.turmas
    .map((t) => ({
      turma: t.codigo,
      turno: t.turno,
      matriculados: data.matriculas.find((m) => m.turmaId === t.id)?.qtdeAlunos ?? 0,
    }))
    .sort((a, b) => a.turma.localeCompare(b.turma));

  return (
    <div className="p-6 space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl">Matrículas</h1>
          <p className="text-muted-foreground">Importe a contagem de alunos por turma ou preencha manualmente.</p>
        </div>

        <div className="flex items-center gap-2">
          <Input value={turma} onChange={(e) => setTurma(e.target.value)} placeholder="Turma (ex.: 0103NA)" className="w-52" />
          <Input value={qtde ? String(qtde) : ""} onChange={(e) => setQtde(Number(e.target.value || 0))} placeholder="Qtde" className="w-24" />
          <Button onClick={upsert}>Salvar</Button>

          <label className="inline-flex">
            <input
              type="file"
              accept=".xlsx,.xls,.csv"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void onImport(file);
                e.currentTarget.value = "";
              }}
            />
            <Button variant="outline">Importar Excel</Button>
          </label>
        </div>
      </div>

      <Card className="bg-card/70 backdrop-blur">
        <CardHeader>
          <CardTitle className="text-base">Resumo</CardTitle>
          <CardDescription>{table.length} turma(s)</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border border-border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Turma</TableHead>
                  <TableHead>Turno</TableHead>
                  <TableHead className="text-right">Matriculados</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {table.map((r) => (
                  <TableRow key={r.turma}>
                    <TableCell className="font-medium">{r.turma}</TableCell>
                    <TableCell className="text-muted-foreground">{r.turno}</TableCell>
                    <TableCell className="text-right">{r.matriculados}</TableCell>
                  </TableRow>
                ))}
                {!table.length && (
                  <TableRow>
                    <TableCell colSpan={3} className="text-muted-foreground">Nenhum dado.</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
