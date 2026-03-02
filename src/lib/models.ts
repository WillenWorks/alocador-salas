// Blueprint Brutalista — modelos e vocabulário do domínio.

export type DiaSemana = "seg" | "ter" | "qua" | "qui" | "sex";

export type Turno = "manha" | "tarde" | "noite" | "indef";

export type Sala = {
  id: string;
  codigo: string; // ex.: "79" ou "B-79"
  localizacao?: string;
  capacidade: number;
  temProjetor?: boolean;
  temAr?: boolean;
  obs?: string;
};

export type Turma = {
  id: string;
  codigo: string; // ex.: "0103NA"
  turno: Turno;

  // Preferências (soft constraints)
  precisaProjetor?: boolean;
  precisaAr?: boolean;
  preferenciaLocalizacao?: string;
};

export type MatriculaTurma = {
  turmaId: string;
  qtdeAlunos: number;
};

export type SlotAulaTurma = {
  turmaId: string;
  dia: DiaSemana;
  hora: string; // "18:40"
};

export type Alocacao = {
  turmaId: string;
  salaId: string;
};

export type Conflito =
  | {
      tipo: "SEM_SALA";
      turmaId: string;
      motivo: string;
    }
  | {
      tipo: "EXCEDE_CAPACIDADE";
      turmaId: string;
      motivo: string;
    }
  | {
      tipo: "CONFLITO_HORARIO";
      turmaId: string;
      salaId: string;
      dia: DiaSemana;
      hora: string;
      motivo: string;
    };
