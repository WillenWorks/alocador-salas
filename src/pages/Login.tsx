// Blueprint Brutalista — tela de login (demo + Supabase).

import * as React from "react";
import { useLocation } from "wouter";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

import { useAuth } from "@/contexts/AuthContext";

const schema = z.object({
  email: z.string().min(1, "Informe o usuário"),
  password: z.string().min(1, "Informe a senha"),
});

type Values = z.infer<typeof schema>;

type Mode = "entrar" | "criar";

export default function LoginPage() {
  const { login, signup, user, isDemo } = useAuth();
  const [, setLocation] = useLocation();
  const [mode, setMode] = React.useState<Mode>("entrar");

  React.useEffect(() => {
    if (user) setLocation("/app/salas");
  }, [user, setLocation]);

  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { email: isDemo ? "admin" : "", password: isDemo ? "admin" : "" },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    const t = toast.loading(mode === "criar" ? "Criando conta..." : "Entrando...");
    try {
      if (mode === "criar") {
        await signup(values.email, values.password);
        toast.success(
          "Conta criada. Se o Supabase exigir confirmação de e-mail, confirme e depois entre.",
          { id: t }
        );
        setMode("entrar");
        return;
      }

      await login(values.email, values.password);
      toast.success("Bem-vindo!", { id: t });
      setLocation("/app/salas");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha no login", { id: t });
    }
  });

  return (
    <div className="min-h-screen blueprint-grid flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <Card className="bg-card/80 backdrop-blur border-border shadow-[0_0_0_1px_oklch(1_0_0_/12%),0_30px_120px_oklch(0_0_0_/35%)]">
          <CardHeader>
            <div className="flex items-start justify-between gap-3">
              <div>
                <CardTitle className="text-2xl">Alocador</CardTitle>
                <CardDescription>Salas, turmas, matrículas e alocação automática</CardDescription>
              </div>
              {isDemo ? (
                <Badge variant="secondary" className="border border-border/60">
                  modo demo
                </Badge>
              ) : (
                <Badge className="bg-primary text-primary-foreground">supabase</Badge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {!isDemo && (
              <div className="mb-4 flex items-center justify-between gap-3">
                <p className="text-xs text-muted-foreground">Use seu e-mail/senha do Supabase Auth.</p>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => setMode((m) => (m === "entrar" ? "criar" : "entrar"))}
                >
                  {mode === "entrar" ? "Criar conta" : "Já tenho conta"}
                </Button>
              </div>
            )}

            <Form {...form}>
              <form onSubmit={onSubmit} className="space-y-4">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{isDemo ? "Usuário" : "E-mail"}</FormLabel>
                      <FormControl>
                        <Input placeholder={isDemo ? "admin" : "seu.email@instituicao"} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Senha</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder={isDemo ? "admin" : "••••••••"} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button type="submit" className="w-full">
                  {isDemo ? "Entrar" : mode === "criar" ? "Criar conta" : "Entrar"}
                </Button>

                {isDemo ? (
                  <p className="text-xs text-muted-foreground">
                    Demo: use <span className="font-semibold">admin/admin</span>. Os dados ficam no seu navegador.
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Dica: a primeira sincronização pode levar alguns segundos (tabela <span className="font-semibold">app_data</span>).
                  </p>
                )}
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
