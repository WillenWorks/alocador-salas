// Blueprint Brutalista — seção Turmas: cadastro manual + importação básica (CSV/Excel).

import * as React from "react";
import * as XLSX from "xlsx";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

import { useData } from "@/contexts/DataContext";
import type { Turma, Turno } from "@/lib/models";
import { makeId } from "@/lib/storage";
import { extrairTurmasDoPdf, turmasExtraidasParaSlots } from "@/lib/pdfImporter";
import HorariosDialog from "@/components/HorariosDialog";

function guessTurno(codigo: string): Turno {
  const up = codigo.toUpperCase();
  if (up.includes("M")) return "manha";
  if (up.includes("T")) return "tarde";
  if (up.includes("N")) return "noite";
  return "indef";
}

export default function TurmasPage() {
  const { data, setData } = useData();
  const [codigo, setCodigo] = React.useState("");
  const [turno, setTurno] = React.useState<Turno>("indef");

  const add = () => {
    const c = codigo.trim();
    if (!c) return;
    setData((d) => ({
      ...d,
      turmas: [...d.turmas, { id: makeId("turma"), codigo: c, turno: turno === "indef" ? guessTurno(c) : turno }],
    }));
    setCodigo("");
    setTurno("indef");
  };

  const onImportExcel = async (file: File) => {
    const buf = await file.arrayBuffer();
    const wb = XLSX.read(buf);
    const sheetName = wb.SheetNames[0];
    const sheet = wb.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json<Record<string, any>>(sheet, { defval: "" });

    const turmas: Turma[] = rows
      .map((r) => {
        const cod = String(r["Turma"] ?? r["TURMA"] ?? r["codigo"] ?? r["Código"] ?? "").trim();
        if (!cod) return null;
        const turnoRaw = String(r["Turno"] ?? r["TURNO"] ?? "").trim().toLowerCase();
        const turno: Turno =
          turnoRaw === "manha" || turnoRaw === "manhã" ? "manha" :
          turnoRaw === "tarde" ? "tarde" :
          turnoRaw === "noite" ? "noite" :
          guessTurno(cod);

        return { id: makeId("turma"), codigo: cod, turno };
      })
      .filter(Boolean) as Turma[];

    if (!turmas.length) {
      toast.error("Não encontrei coluna 'Turma' na primeira aba.");
      return;
    }

    setData((d) => ({ ...d, turmas }));
    toast.success(`Importadas ${turmas.length} turmas (aba: ${sheetName}).`);
  };

  const onImportPdf = async (file: File) => {
    const t = toast.loading("Lendo PDF e extraindo turmas/horários...");
    try {
      const extraidas = await extrairTurmasDoPdf(file);
      if (!extraidas.length) {
        toast.error("Não encontrei turmas no PDF.", { id: t });
        return;
      }

      setData((d) => {
        // Dedupe turmas por código
        const turmasByCodigo = new Map(d.turmas.map((x) => [x.codigo, x] as const));
        const merged: Turma[] = [...d.turmas];

        for (const ex of extraidas) {
          if (!turmasByCodigo.has(ex.codigo)) {
            const novo: Turma = { id: makeId("turma"), codigo: ex.codigo, turno: ex.turno };
            turmasByCodigo.set(ex.codigo, novo);
            merged.push(novo);
          }
        }

        const turmaIdByCodigo: Record<string, string> = {};
        for (const [cod, tu] of turmasByCodigo.entries()) turmaIdByCodigo[cod] = tu.id;

        const slots = turmasExtraidasParaSlots({ turmaIdByCodigo, turmas: extraidas });

        const seen = new Set<string>();
        const mergedSlots = [...d.slots, ...slots].filter((s) => {
          const k = `${s.turmaId}|${s.dia}|${s.hora}`;
          if (seen.has(k)) return false;
          seen.add(k);
          return true;
        });

        return { ...d, turmas: merged, slots: mergedSlots };
      });

      const slotCount = extraidas.reduce((acc, x) => acc + x.slots.length, 0);
      toast.success(`Importadas ${extraidas.length} turmas e ${slotCount} slots.`, { id: t });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao ler PDF", { id: t });
    }
  };

  return (
    <div className="p-6 space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl">Turmas</h1>
          <p className="text-muted-foreground">Cadastre manualmente, importe Excel, ou extraia diretamente do PDF de horários.</p>
        </div>

        <div className="flex items-center gap-2">
          <Input value={codigo} onChange={(e) => setCodigo(e.target.value)} placeholder="Ex.: 0103NA" className="w-48" />
          <Select value={turno} onValueChange={(v) => setTurno(v as Turno)}>
            <SelectTrigger className="w-36"><SelectValue placeholder="Turno" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="indef">(auto)</SelectItem>
              <SelectItem value="manha">Manhã</SelectItem>
              <SelectItem value="tarde">Tarde</SelectItem>
              <SelectItem value="noite">Noite</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={add}>Adicionar</Button>

          <label className="inline-flex">
            <input
              type="file"
              accept=".xlsx,.xls"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void onImportExcel(file);
                e.currentTarget.value = "";
              }}
            />
            <Button variant="outline">Importar Excel</Button>
          </label>

          <label className="inline-flex">
            <input
              type="file"
              accept=".pdf"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void onImportPdf(file);
                e.currentTarget.value = "";
              }}
            />
            <Button className="bg-primary text-primary-foreground">Importar PDF (horários)</Button>
          </label>
        </div>
      </div>

      <Card className="bg-card/70 backdrop-blur">
        <CardHeader>
          <CardTitle className="text-base">Lista</CardTitle>
          <CardDescription>{data.turmas.length} turma(s)</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border border-border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Turma</TableHead>
                  <TableHead>Turno</TableHead>
                  <TableHead className="text-right">Horários</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.turmas.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell className="font-medium">{t.codigo}</TableCell>
                    <TableCell className="text-muted-foreground">{t.turno}</TableCell>
                    <TableCell className="text-right">
                      <HorariosDialog
                        turma={t}
                        slots={data.slots}
                        onChange={(nextSlots) => setData((d) => ({ ...d, slots: nextSlots }))}
                      />
                    </TableCell>
                  </TableRow>
                ))}
                {!data.turmas.length && (
                  <TableRow>
                    <TableCell colSpan={3} className="text-muted-foreground">
                      Nenhuma turma ainda.
                    </TableCell>
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
