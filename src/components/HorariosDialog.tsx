// Blueprint Brutalista — editor de horários (slots) por turma.

import * as React from "react";
import { Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";

import type { DiaSemana, SlotAulaTurma, Turma } from "@/lib/models";
import { cn } from "@/lib/utils";

const DIAS: Array<{ value: DiaSemana; label: string }> = [
  { value: "seg", label: "Seg" },
  { value: "ter", label: "Ter" },
  { value: "qua", label: "Qua" },
  { value: "qui", label: "Qui" },
  { value: "sex", label: "Sex" },
];

import { isHora } from "@/lib/slots";

function keySlot(s: { dia: DiaSemana; hora: string }) {
  return `${s.dia}|${s.hora}`;
}

export default function HorariosDialog(props: {
  turma: Turma;
  slots: SlotAulaTurma[];
  onChange: (nextSlots: SlotAulaTurma[]) => void;
}) {
  const [open, setOpen] = React.useState(false);
  const [dia, setDia] = React.useState<DiaSemana>("seg");
  const [hora, setHora] = React.useState("18:40");

  const turmaSlots = React.useMemo(
    () => props.slots.filter((s) => s.turmaId === props.turma.id),
    [props.slots, props.turma.id]
  );

  const sorted = React.useMemo(() => {
    const diaRank: Record<DiaSemana, number> = { seg: 1, ter: 2, qua: 3, qui: 4, sex: 5 };
    return [...turmaSlots].sort((a, b) => {
      const d = diaRank[a.dia] - diaRank[b.dia];
      if (d !== 0) return d;
      return a.hora.localeCompare(b.hora);
    });
  }, [turmaSlots]);

  const add = () => {
    const h = hora.trim();
    if (!isHora(h)) {
      toast.error("Hora inválida. Use formato HH:MM (ex.: 18:40)");
      return;
    }

    const k = `${props.turma.id}|${dia}|${h}`;
    const exists = props.slots.some((s) => `${s.turmaId}|${s.dia}|${s.hora}` === k);
    if (exists) {
      toast.message("Esse horário já existe.");
      return;
    }

    props.onChange([...props.slots, { turmaId: props.turma.id, dia, hora: h }]);
    toast.success("Horário adicionado.");
  };

  const remove = (slot: SlotAulaTurma) => {
    props.onChange(props.slots.filter((s) => !(s.turmaId === slot.turmaId && s.dia === slot.dia && s.hora === slot.hora)));
  };

  const clear = () => {
    props.onChange(props.slots.filter((s) => s.turmaId !== props.turma.id));
    toast.message("Horários removidos.");
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          Editar horários
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Horários — {props.turma.codigo}</DialogTitle>
          <DialogDescription>
            Ajuste manualmente os slots (dia/hora). Isso afeta a alocação para evitar conflitos de sala.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="space-y-2">
            <Label>Dia</Label>
            <Select value={dia} onValueChange={(v) => setDia(v as DiaSemana)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DIAS.map((d) => (
                  <SelectItem key={d.value} value={d.value}>
                    {d.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Hora</Label>
            <Input value={hora} onChange={(e) => setHora(e.target.value)} placeholder="18:40" />
          </div>
          <div className="flex items-end">
            <Button onClick={add} className="w-full">
              <Plus className="mr-2 h-4 w-4" /> Adicionar
            </Button>
          </div>
        </div>

        <Separator className="my-2" />

        <div className="rounded-lg border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Dia</TableHead>
                <TableHead>Hora</TableHead>
                <TableHead className="w-[1%]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {sorted.map((s) => (
                <TableRow key={keySlot(s)}>
                  <TableCell className={cn("font-medium", s.dia === "sex" && "text-accent")}>
                    {DIAS.find((d) => d.value === s.dia)?.label}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{s.hora}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => remove(s)} aria-label="Remover">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {!sorted.length && (
                <TableRow>
                  <TableCell colSpan={3} className="text-muted-foreground">
                    Nenhum horário para esta turma.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="destructive" onClick={clear}>
            Limpar horários
          </Button>
          <Button variant="secondary" onClick={() => setOpen(false)}>
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
