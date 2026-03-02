# Alocador de Salas

Web app interno para **importar salas/turmas/matrículas**, **alocar salas automaticamente** (com restrições e preferências) e gerar **relatórios (Excel/PDF)**.

## Requisitos
- Node.js 18+
- pnpm

## Rodar localmente
```bash
pnpm install
pnpm dev
```

## Build (produção)
```bash
pnpm build
pnpm preview
```

## Variáveis de ambiente (opcional)
Sem `.env`, o app roda em **modo demo** (dados no navegador).

Crie um arquivo `.env` na raiz do projeto:
```bash
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```
