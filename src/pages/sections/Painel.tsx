// Blueprint Brutalista — Painel de ocupação (dia da semana x turno).

import * as React from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";

import { useData } from "@/contexts/DataContext";
import { alocarSalas } from "@/lib/allocator";
import type { DiaSemana, Turno } from "@/lib/models";

const DIAS: Array<{ key: DiaSemana; label: string }> = [
  { key: "seg", label: "Seg" },
  { key: "ter", label: "Ter" },
  { key: "qua", label: "Qua" },
  { key: "qui", label: "Qui" },
  { key: "sex", label: "Sex" },
];

const TURNOS: Array<{ key: Turno; label: string }> = [
  { key: "manha", label: "Manhã" },
  { key: "tarde", label: "Tarde" },
  { key: "noite", label: "Noite" },
  { key: "indef", label: "Indef." },
];

function turnoLabel(t: Turno) {
  return TURNOS.find((x) => x.key === t)?.label ?? t;
}

export default function PainelPage() {
  const { data } = useData();

  // Sempre calcula com base nos dados atuais.
  const res = React.useMemo(
    () => alocarSalas({ salas: data.salas, turmas: data.turmas, matriculas: data.matriculas, slots: data.slots }),
    [data.salas, data.turmas, data.matriculas, data.slots]
  );

  const turmaById = React.useMemo(() => {
    const m = new Map<string, { turno: Turno; codigo: string }>();
    for (const t of data.turmas) m.set(t.id, { turno: t.turno, codigo: t.codigo });
    return m;
  }, [data.turmas]);

  const salaById = React.useMemo(() => {
    const m = new Map<string, { codigo: string }>();
    for (const s of data.salas) m.set(s.id, { codigo: s.codigo });
    return m;
  }, [data.salas]);

  // Dia x turno: quantas salas distintas ocupadas (usando slots + alocação).
  const ocupacaoDiaTurno = React.useMemo(() => {
    // Index alocação: turmaId -> salaId
    const salaDaTurma = new Map(res.alocacoes.map((a) => [a.turmaId, a.salaId] as const));

    // Coletores
    const used: Record<DiaSemana, Record<Turno, Set<string>>> = {
      seg: { manha: new Set(), tarde: new Set(), noite: new Set(), indef: new Set() },
      ter: { manha: new Set(), tarde: new Set(), noite: new Set(), indef: new Set() },
      qua: { manha: new Set(), tarde: new Set(), noite: new Set(), indef: new Set() },
      qui: { manha: new Set(), tarde: new Set(), noite: new Set(), indef: new Set() },
      sex: { manha: new Set(), tarde: new Set(), noite: new Set(), indef: new Set() },
    };

    for (const sl of data.slots) {
      const salaId = salaDaTurma.get(sl.turmaId);
      if (!salaId) continue;
      const turma = turmaById.get(sl.turmaId);
      const turno = (turma?.turno ?? "indef") as Turno;
      used[sl.dia][turno].add(salaId);
    }

    const rows = DIAS.map((d) => {
      const r: any = { dia: d.label };
      for (const t of TURNOS) {
        r[t.key] = used[d.key][t.key].size;
      }
      return r;
    });

    return rows as Array<{ dia: string } & Record<Turno, number>>;
  }, [data.slots, res.alocacoes, turmaById]);

  const totalSalas = data.salas.length || 1;

  // Taxa de uso por dia (considerando qualquer turno)
  const usoPorDia = React.useMemo(() => {
    const rows = DIAS.map((d) => {
      const row = ocupacaoDiaTurno.find((x) => x.dia === d.label);
      const used = TURNOS.reduce((acc, t) => acc + (row?.[t.key] ?? 0), 0);
      return {
        dia: d.label,
        salasUsadas: used,
        taxa: Math.round((used / totalSalas) * 100),
      };
    });
    return rows;
  }, [ocupacaoDiaTurno, totalSalas]);

  const avisos = React.useMemo(() => {
    const out: string[] = [];
    if (!data.salas.length) out.push("Importe salas para ver ocupação.");
    if (!data.turmas.length) out.push("Cadastre/importe turmas.");
    if (!data.slots.length) out.push("Importe horários do PDF (ou edite manualmente) para gerar gráficos por dia.");
    if (res.conflitos.length) out.push(`Existem ${res.conflitos.length} conflito(s) na alocação atual.`);
    return out;
  }, [data.salas.length, data.turmas.length, data.slots.length, res.conflitos.length]);

  return (
    <div className="p-6 space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl">Painel</h1>
          <p className="text-muted-foreground">
            Ocupação estimada baseada em turmas + horários (slots) + alocação atual.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary" className="border border-border/60">
            salas: {data.salas.length}
          </Badge>
          <Badge variant="secondary" className="border border-border/60">
            turmas: {data.turmas.length}
          </Badge>
          <Badge className="bg-primary text-primary-foreground">slots: {data.slots.length}</Badge>
        </div>
      </div>

      {avisos.length > 0 && (
        <Card className="bg-card/70 backdrop-blur">
          <CardHeader>
            <CardTitle className="text-base">Avisos</CardTitle>
            <CardDescription>Antes de confiar nos gráficos, confira:</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {avisos.map((a, idx) => (
              <div key={idx} className="text-sm text-muted-foreground">
                • {a}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <Card className="bg-card/70 backdrop-blur">
          <CardHeader>
            <CardTitle className="text-base">Salas ocupadas por dia e turno</CardTitle>
            <CardDescription>Quantidade de salas distintas com aula em cada (dia, turno)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[320px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={ocupacaoDiaTurno} margin={{ left: 8, right: 8, top: 8, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.25} />
                  <XAxis dataKey="dia" />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="manha" name="Manhã" stackId="a" fill="#06b6d4" />
                  <Bar dataKey="tarde" name="Tarde" stackId="a" fill="#f97316" />
                  <Bar dataKey="noite" name="Noite" stackId="a" fill="#22c55e" />
                  <Bar dataKey="indef" name="Indef." stackId="a" fill="#94a3b8" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/70 backdrop-blur">
          <CardHeader>
            <CardTitle className="text-base">Taxa de uso por dia</CardTitle>
            <CardDescription>Somatório de salas ocupadas (todos os turnos) / total de salas</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[320px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={usoPorDia} margin={{ left: 8, right: 8, top: 8, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.25} />
                  <XAxis dataKey="dia" />
                  <YAxis allowDecimals={false} domain={[0, 100]} />
                  <Tooltip formatter={(v) => `${v}%`} />
                  <Legend />
                  <Bar dataKey="taxa" name="Taxa (%)" fill="#06b6d4" />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <Separator className="my-3" />
            <div className="text-xs text-muted-foreground">
              Observação: se você não importou slots (horários), este gráfico não representa a ocupação real.
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-card/70 backdrop-blur">
        <CardHeader>
          <CardTitle className="text-base">Como o painel calcula</CardTitle>
          <CardDescription>Transparência do critério</CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <div>1) Roda a alocação atual (Turma → Sala).</div>
          <div>2) Para cada slot (dia/hora) da turma, marca a sala como “ocupada” naquele dia (agrupada pelo turno da turma).</div>
          <div>3) Soma salas distintas por dia/turno para gerar os gráficos.</div>
        </CardContent>
      </Card>
    </div>
  );
}
