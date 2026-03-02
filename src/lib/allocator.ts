// Blueprint Brutalista — alocação com hard constraints + score de preferências.

import type {
  Sala,
  Turma,
  MatriculaTurma,
  SlotAulaTurma,
  Alocacao,
  Conflito,
  DiaSemana,
} from "@/lib/models";

function matriculados(turmaId: string, matriculas: MatriculaTurma[]) {
  return matriculas.find((m) => m.turmaId === turmaId)?.qtdeAlunos ?? 0;
}

function turmaSlots(turmaId: string, slots: SlotAulaTurma[]) {
  return slots.filter((s) => s.turmaId === turmaId);
}

function scoreSalaParaTurma(t: Turma, s: Sala) {
  let score = 0;
  if (t.precisaProjetor) score += s.temProjetor ? 20 : -200;
  if (t.precisaAr) score += s.temAr ? 15 : -200;

  if (t.preferenciaLocalizacao) {
    const pref = t.preferenciaLocalizacao.toLowerCase().trim();
    const loc = (s.localizacao ?? "").toLowerCase();
    if (pref && loc.includes(pref)) score += 10;
  }

  // desempate: preferir sala mais “justa” (menos ociosa)
  // isso entra fora daqui porque depende do número de alunos.
  return score;
}

function hasConflitoHorario(
  salaId: string,
  turmaId: string,
  alocacoes: Alocacao[],
  slots: SlotAulaTurma[]
) {
  const minha = turmaSlots(turmaId, slots);
  const outrasTurmasNaSala = alocacoes.filter((a) => a.salaId === salaId).map((a) => a.turmaId);
  const ocupados = new Set(
    outrasTurmasNaSala
      .flatMap((tid) => turmaSlots(tid, slots))
      .map((s) => `${s.dia}|${s.hora}`)
  );

  for (const sl of minha) {
    if (ocupados.has(`${sl.dia}|${sl.hora}`)) return true;
  }
  return false;
}

export type ResultadoAlocacao = {
  alocacoes: Alocacao[];
  conflitos: Conflito[];
};

export function alocarSalas(params: {
  salas: Sala[];
  turmas: Turma[];
  matriculas: MatriculaTurma[];
  slots: SlotAulaTurma[];
}): ResultadoAlocacao {
  const { salas, turmas, matriculas, slots } = params;

  const conflitos: Conflito[] = [];
  const alocacoes: Alocacao[] = [];

  // Pré-checagem de capacidade
  for (const t of turmas) {
    const n = matriculados(t.id, matriculas);
    if (n <= 0) continue;
    const existeAlguma = salas.some((s) => s.capacidade >= n);
    if (!existeAlguma) {
      conflitos.push({
        tipo: "EXCEDE_CAPACIDADE",
        turmaId: t.id,
        motivo: `Nenhuma sala comporta ${n} alunos.`,
      });
    }
  }

  // Ordena turmas por “dificuldade”: menos salas candidatas primeiro
  const turmasOrdenadas = [...turmas].sort((a, b) => {
    const na = matriculados(a.id, matriculas);
    const nb = matriculados(b.id, matriculas);
    const ca = salas.filter((s) => s.capacidade >= na).length;
    const cb = salas.filter((s) => s.capacidade >= nb).length;
    return ca - cb || nb - na;
  });

  // Backtracking leve
  function tentar(i: number): boolean {
    if (i >= turmasOrdenadas.length) return true;

    const t = turmasOrdenadas[i];
    const n = matriculados(t.id, matriculas);

    // Se turma não tem matrículas ainda, tratamos como 0 (aloca mesmo assim)
    const candidatos = salas
      .filter((s) => s.capacidade >= n)
      .filter((s) => !hasConflitoHorario(s.id, t.id, alocacoes, slots));

    if (candidatos.length === 0) {
      conflitos.push({
        tipo: "SEM_SALA",
        turmaId: t.id,
        motivo: `Sem sala disponível (capacidade/hora).` + (n ? ` Alunos: ${n}.` : ""),
      });
      return tentar(i + 1); // segue para as próximas (mantém conflitos)
    }

    const ordenados = candidatos
      .map((s) => {
        const sobra = Math.max(0, s.capacidade - n);
        const justFitBonus = Math.max(0, 12 - Math.min(12, sobra)); // até +12
        return {
          sala: s,
          score: scoreSalaParaTurma(t, s) + justFitBonus,
        };
      })
      .sort((x, y) => y.score - x.score);

    for (const cand of ordenados) {
      alocacoes.push({ turmaId: t.id, salaId: cand.sala.id });
      if (tentar(i + 1)) return true;
      alocacoes.pop();
    }

    // fallback: registra conflito se backtracking falhar
    conflitos.push({
      tipo: "SEM_SALA",
      turmaId: t.id,
      motivo: "Não foi possível encontrar combinação sem conflito.",
    });
    return false;
  }

  tentar(0);

  // Conflitos por horário (detectáveis quando o usuário fizer alocação manual na fase 2)
  // Aqui mantemos apenas a validação de não gerar conflito.

  return { alocacoes, conflitos };
}

export function keySlot(dia: DiaSemana, hora: string) {
  return `${dia}|${hora}`;
}
