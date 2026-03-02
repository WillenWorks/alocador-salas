// Blueprint Brutalista — seção Salas: importar do Excel + editar básico.

import * as React from "react";
import * as XLSX from "xlsx";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

import { useData } from "@/contexts/DataContext";
import type { Sala } from "@/lib/models";
import { makeId } from "@/lib/storage";

function truthy(v: unknown) {
  const s = String(v ?? "").trim().toLowerCase();
  return ["sim", "s", "yes", "y", "true", "1"].includes(s);
}

export default function SalasPage() {
  const { data, setData } = useData();
  const [filter, setFilter] = React.useState("");

  const onImport = async (file: File) => {
    const buf = await file.arrayBuffer();
    const wb = XLSX.read(buf);
    const sheetName = wb.SheetNames[0];
    const sheet = wb.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json<Record<string, any>>(sheet, { defval: "" });

    const salas: Sala[] = rows
      .map((r) => {
        const codigo = String(r["Salas"] ?? r["SALA"] ?? r["Sala"] ?? "").trim();
        const capacidadeRaw = r["Carteiras"] ?? r["CAPACIDADE"] ?? r["Capacidade"];
        const capacidade = Number(String(capacidadeRaw ?? "0").replace(/[^0-9]/g, "")) || 0;
        if (!codigo || !capacidade) return null;
        return {
          id: makeId("sala"),
          codigo,
          capacidade,
          localizacao: String(r["LOCALIZAÇÃO"] ?? r["LOCALIZACAO"] ?? "").trim() || undefined,
          temProjetor: truthy(r["PROJETOR"]),
          temAr: truthy(r["ar condicionado"] ?? r["AR CONDICIONADO"]),
          obs: String(r["OBS."] ?? r["OBS"] ?? "").trim() || undefined,
        } satisfies Sala;
      })
      .filter(Boolean) as Sala[];

    if (!salas.length) {
      toast.error("Não encontrei colunas de Sala/Carteiras na primeira aba.");
      return;
    }

    setData((d) => ({ ...d, salas }));
    toast.success(`Importadas ${salas.length} salas (aba: ${sheetName}).`);
  };

  const filtered = data.salas.filter((s) => {
    if (!filter.trim()) return true;
    const f = filter.toLowerCase();
    return (
      s.codigo.toLowerCase().includes(f) ||
      (s.localizacao ?? "").toLowerCase().includes(f)
    );
  });

  return (
    <div className="p-6 space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl">Salas</h1>
          <p className="text-muted-foreground">Importe do Excel e revise capacidades/recursos.</p>
        </div>

        <div className="flex items-center gap-2">
          <Input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Filtrar por código/localização" className="w-72" />
          <label className="inline-flex">
            <input
              type="file"
              accept=".xlsx,.xls"
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
          <CardTitle className="text-base">Catálogo</CardTitle>
          <CardDescription>{filtered.length} sala(s)</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border border-border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Sala</TableHead>
                  <TableHead>Capacidade</TableHead>
                  <TableHead>Localização</TableHead>
                  <TableHead>Recursos</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">{s.codigo}</TableCell>
                    <TableCell>{s.capacidade}</TableCell>
                    <TableCell className="text-muted-foreground">{s.localizacao || "—"}</TableCell>
                    <TableCell className="space-x-1">
                      {s.temProjetor && <Badge className="bg-primary text-primary-foreground">Projetor</Badge>}
                      {s.temAr && <Badge variant="secondary" className="border border-border/60">Ar</Badge>}
                      {!s.temProjetor && !s.temAr && <span className="text-muted-foreground">—</span>}
                    </TableCell>
                  </TableRow>
                ))}
                {!filtered.length && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-muted-foreground">
                      Nenhuma sala ainda. Importe o Excel para começar.
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
