// Blueprint Brutalista — Mapa de Calor (picos de ocupação por bloco).

import * as React from "react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

import { useData } from "@/contexts/DataContext";
import { alocarSalas } from "@/lib/allocator";
import {
  computeOcupacaoBloco,
  DIAS,
  getBlocosFromSalas,
  sortHoras,
  type BlocoKey,
} from "@/lib/ocupacaoBloco";

function clamp01(x: number) {
  return Math.max(0, Math.min(1, x));
}

function cellBg(intensity01: number) {
  // ciano elétrico sobre fundo escuro
  const a = 0.12 + 0.78 * clamp01(intensity01);
  return `oklch(0.82 0.16 200 / ${a})`;
}

export default function MapaCalorPage() {
  const { data } = useData();

  const res = React.useMemo(
    () => alocarSalas({ salas: data.salas, turmas: data.turmas, matriculas: data.matriculas, slots: data.slots }),
    [data.salas, data.turmas, data.matriculas, data.slots]
  );

  const blocos = React.useMemo(() => getBlocosFromSalas(data.salas), [data.salas]);
  const [bloco, setBloco] = React.useState<BlocoKey>(() => blocos[0] ?? "SEM BLOCO");

  React.useEffect(() => {
    if (!blocos.length) return;
    if (!blocos.includes(bloco)) setBloco(blocos[0]);
  }, [blocos, bloco]);

  const points = React.useMemo(() => {
    return computeOcupacaoBloco({ salas: data.salas, turmas: data.turmas, alocacoes: res.alocacoes, slots: data.slots });
  }, [data.salas, data.turmas, data.slots, res.alocacoes]);

  const horas = React.useMemo(() => {
    // prioriza horas existentes no PDF + ordem natural
    return sortHoras(data.slots.map((s) => s.hora));
  }, [data.slots]);

  const matrix = React.useMemo(() => {
    const map = new Map<string, number>();
    for (const p of points) {
      if (p.bloco !== bloco) continue;
      map.set(`${p.dia}|${p.hora}`, p.salasOcupadas);
    }

    let max = 0;
    for (const v of map.values()) max = Math.max(max, v);

    const rows = horas.map((hora) => {
      const cols = DIAS.map((d) => {
        const v = map.get(`${d.key}|${hora}`) ?? 0;
        return { dia: d.key, hora, v };
      });
      return { hora, cols };
    });

    return { rows, max };
  }, [points, bloco, horas]);

  const avisos: string[] = [];
  if (!data.salas.length) avisos.push("Importe salas para detectar blocos.");
  if (!data.slots.length) avisos.push("Importe horários do PDF (ou edite manualmente) para ver o pico por dia/hora.");
  if (!res.alocacoes.length) avisos.push("Rode a alocação (ou carregue matrículas) para mapear turmas → salas.");

  return (
    <div className="p-6 space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl">Mapa de Calor</h1>
          <p className="text-muted-foreground">Horários de pico de ocupação por bloco (salas ocupadas por dia/hora).</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Select value={bloco} onValueChange={(v) => setBloco(v as BlocoKey)}>
            <SelectTrigger className="w-[260px]">
              <SelectValue placeholder="Selecione o bloco" />
            </SelectTrigger>
            <SelectContent>
              {blocos.map((b) => (
                <SelectItem key={b} value={b}>
                  {b}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Badge className="bg-primary text-primary-foreground">pico: {matrix.max}</Badge>
        </div>
      </div>

      {avisos.length > 0 && (
        <Card className="bg-card/70 backdrop-blur">
          <CardHeader>
            <CardTitle className="text-base">Avisos</CardTitle>
            <CardDescription>O mapa depende de salas + horários + alocação</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {avisos.map((a, i) => (
              <div key={i} className="text-sm text-muted-foreground">
                • {a}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Card className="bg-card/70 backdrop-blur">
        <CardHeader>
          <CardTitle className="text-base">Ocupação (dia × hora)</CardTitle>
          <CardDescription>
            Cada célula mostra quantas salas desse bloco estão ocupadas no horário. Quanto mais forte a cor, maior o pico.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!horas.length ? (
            <div className="text-sm text-muted-foreground">Sem horários carregados.</div>
          ) : (
            <div className="overflow-auto rounded-lg border border-border">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-card">
                  <tr>
                    <th className="text-left font-medium p-2 border-b border-border">Hora</th>
                    {DIAS.map((d) => (
                      <th key={d.key} className="text-center font-medium p-2 border-b border-border">
                        {d.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {matrix.rows.map((r) => (
                    <tr key={r.hora}>
                      <td className="p-2 text-muted-foreground border-b border-border whitespace-nowrap">{r.hora}</td>
                      {r.cols.map((c) => {
                        const intensity = matrix.max ? c.v / matrix.max : 0;
                        return (
                          <td
                            key={`${c.dia}|${c.hora}`}
                            className="p-2 text-center border-b border-border"
                            style={{ background: c.v ? cellBg(intensity) : undefined }}
                            title={`${c.v} sala(s) ocupadas`}
                          >
                            <span className={c.v ? "font-semibold text-background" : "text-muted-foreground"}>
                              {c.v}
                            </span>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <Separator className="my-3" />
          <div className="text-xs text-muted-foreground">
            Dica: se a ocupação parecer baixa, confira se as turmas possuem slots (PDF importado ou edição manual) e se a alocação está atribuída.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
