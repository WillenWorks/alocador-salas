// Blueprint Brutalista — seção Alocação: rodar algoritmo e ver conflitos.

import * as React from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";

import { useData } from "@/contexts/DataContext";
import { alocarSalas } from "@/lib/allocator";

export default function AlocacaoPage() {
  const { data } = useData();
  const [resultado, setResultado] = React.useState<ReturnType<typeof alocarSalas> | null>(null);

  const run = () => {
    if (!data.salas.length) {
      toast.error("Importe/cadastre salas primeiro.");
      return;
    }
    if (!data.turmas.length) {
      toast.error("Cadastre/importa turmas primeiro.");
      return;
    }

    const res = alocarSalas({ salas: data.salas, turmas: data.turmas, matriculas: data.matriculas, slots: data.slots });
    setResultado(res);
    toast.success("Alocação executada.");
  };

  const aloc = (resultado?.alocacoes ?? [])
    .map((a) => {
      const turma = data.turmas.find((t) => t.id === a.turmaId);
      const sala = data.salas.find((s) => s.id === a.salaId);
      const n = data.matriculas.find((m) => m.turmaId === a.turmaId)?.qtdeAlunos ?? 0;
      return {
        turma: turma?.codigo ?? a.turmaId,
        turno: turma?.turno ?? "—",
        alunos: n,
        sala: sala?.codigo ?? a.salaId,
        capacidade: sala?.capacidade ?? 0,
      };
    })
    .sort((x, y) => x.turma.localeCompare(y.turma));

  const conflitos = (resultado?.conflitos ?? [])
    .map((c) => {
      const turma = data.turmas.find((t) => t.id === c.turmaId);
      return { ...c, turmaCodigo: turma?.codigo ?? c.turmaId };
    })
    .sort((a, b) => a.turmaCodigo.localeCompare(b.turmaCodigo));

  return (
    <div className="p-6 space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl">Alocação</h1>
          <p className="text-muted-foreground">Capacidade + preferências (MVP) + bloqueio por horário (quando slots existirem).</p>
        </div>
        <Button onClick={run}>Rodar alocação</Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="bg-card/70 backdrop-blur lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Mapa Turma → Sala</CardTitle>
            <CardDescription>{aloc.length} alocação(ões)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border border-border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Turma</TableHead>
                    <TableHead>Turno</TableHead>
                    <TableHead className="text-right">Alunos</TableHead>
                    <TableHead>Sala</TableHead>
                    <TableHead className="text-right">Cap.</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {aloc.map((r) => (
                    <TableRow key={`${r.turma}-${r.sala}`}>
                      <TableCell className="font-medium">{r.turma}</TableCell>
                      <TableCell className="text-muted-foreground">{r.turno}</TableCell>
                      <TableCell className="text-right">{r.alunos}</TableCell>
                      <TableCell className="font-medium">{r.sala}</TableCell>
                      <TableCell className="text-right">{r.capacidade}</TableCell>
                    </TableRow>
                  ))}
                  {!aloc.length && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-muted-foreground">Execute a alocação para ver o resultado.</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/70 backdrop-blur">
          <CardHeader>
            <CardTitle className="text-base">Conflitos</CardTitle>
            <CardDescription>{conflitos.length} item(ns)</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {!conflitos.length ? (
              <div className="text-sm text-muted-foreground">Nenhum conflito registrado.</div>
            ) : (
              <div className="space-y-2">
                {conflitos.slice(0, 12).map((c, idx) => (
                  <div key={idx} className="rounded-md border border-border/70 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="font-semibold">{c.turmaCodigo}</div>
                      <Badge variant="secondary" className="border border-border/60">
                        {c.tipo}
                      </Badge>
                    </div>
                    <Separator className="my-2" />
                    <div className="text-sm text-muted-foreground">{"motivo" in c ? c.motivo : ""}</div>
                  </div>
                ))}
                {conflitos.length > 12 && (
                  <div className="text-xs text-muted-foreground">Mostrando 12 de {conflitos.length}.</div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
