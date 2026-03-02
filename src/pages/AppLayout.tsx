// Blueprint Brutalista — layout com sidebar + páginas do sistema.

import * as React from "react";
import { Link, useLocation } from "wouter";
import { BarChart3, Flame, Building2, GraduationCap, Users, Wand2, FileSpreadsheet, LogOut, Database, AlertTriangle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
  SidebarTrigger,
  SidebarInset,
} from "@/components/ui/sidebar";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

import { useAuth } from "@/contexts/AuthContext";

import PainelPage from "@/pages/sections/Painel";
import MapaCalorPage from "@/pages/sections/MapaCalor";
import SalasPage from "@/pages/sections/Salas";
import TurmasPage from "@/pages/sections/Turmas";
import MatriculasPage from "@/pages/sections/Matriculas";
import AlocacaoPage from "@/pages/sections/Alocacao";
import RelatoriosPage from "@/pages/sections/Relatorios";

const SECTIONS = [
  { key: "painel", label: "Painel", icon: BarChart3 },
  { key: "mapa-calor", label: "Mapa de Calor", icon: Flame },
  { key: "salas", label: "Salas", icon: Building2 },
  { key: "turmas", label: "Turmas", icon: GraduationCap },
  { key: "matriculas", label: "Matrículas", icon: Users },
  { key: "alocacao", label: "Alocação", icon: Wand2 },
  { key: "relatorios", label: "Relatórios", icon: FileSpreadsheet },
] as const;

function TopBar() {
  const { user, logout, isDemo } = useAuth();

  return (
    <div className="sticky top-0 z-20 bg-background/70 backdrop-blur border-b border-border">
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-3">
          <SidebarTrigger />
          <div className="leading-tight">
            <div className="text-sm text-muted-foreground">Sistema</div>
            <div className="text-base font-semibold">Alocador de Salas</div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isDemo ? (
            <Badge variant="secondary" className="border border-border/60">demo (local)</Badge>
          ) : (
            <Badge className="bg-primary text-primary-foreground"><Database className="mr-1 h-3.5 w-3.5" />supabase</Badge>
          )}

          <Separator orientation="vertical" className="h-6" />

          <div className="hidden sm:block text-right">
            <div className="text-xs text-muted-foreground">usuário</div>
            <div className="text-sm font-medium">{user?.email}</div>
          </div>

          <Button
            variant="outline"
            size="icon"
            onClick={() => {
              logout();
              toast.message("Sessão encerrada");
            }}
            aria-label="Sair"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

function Content({ section }: { section: string }) {
  switch (section) {
    case "painel":
      return <PainelPage />;
    case "mapa-calor":
      return <MapaCalorPage />;
    case "salas":
      return <SalasPage />;
    case "turmas":
      return <TurmasPage />;
    case "matriculas":
      return <MatriculasPage />;
    case "alocacao":
      return <AlocacaoPage />;
    case "relatorios":
      return <RelatoriosPage />;
    default:
      return (
        <div className="p-8">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-accent" />
            <h1 className="text-xl">Seção não encontrada</h1>
          </div>
          <p className="mt-2 text-muted-foreground">Use o menu lateral para navegar.</p>
        </div>
      );
  }
}

export default function AppLayout({ section }: { section?: string }) {
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  React.useEffect(() => {
    if (!user) setLocation("/login");
  }, [user, setLocation]);

  const current = section || "painel";

  return (
    <SidebarProvider defaultOpen>
      <Sidebar variant="sidebar" collapsible="icon">
        <SidebarHeader className="px-3 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-9 w-9 rounded-md bg-primary text-primary-foreground grid place-items-center font-black">
                A
              </div>
              <div className="group-data-[collapsible=icon]:hidden">
                <div className="text-sm font-semibold">Alocador</div>
                <div className="text-xs text-muted-foreground">2026/1</div>
              </div>
            </div>
          </div>
        </SidebarHeader>

        <SidebarContent className="px-2">
          <SidebarMenu>
            {SECTIONS.map((s) => {
              const Icon = s.icon;
              const active = current === s.key;
              return (
                <SidebarMenuItem key={s.key}>
                  <SidebarMenuButton asChild isActive={active} tooltip={s.label}>
                    <Link href={`/app/${s.key}`}>
                      <Icon />
                      <span>{s.label}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              );
            })}
          </SidebarMenu>
        </SidebarContent>

        <SidebarFooter className="px-3 py-3">
          <div className="group-data-[collapsible=icon]:hidden text-xs text-muted-foreground">
            Ctrl/Cmd + B alterna menu
          </div>
        </SidebarFooter>
      </Sidebar>

      <SidebarInset className="min-h-svh">
        <TopBar />
        <div className="blueprint-grid min-h-[calc(100svh-64px)]">
          <Content section={current} />
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
