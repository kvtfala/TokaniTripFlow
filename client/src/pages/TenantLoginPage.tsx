import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { TokaniLogo } from "@/components/brand/TokaniLogo";
import { Loader2, Lock, Mail } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

const tenantLoginSchema = z.object({
  email: z.string().email("Valid email is required").min(1, "Email is required"),
  password: z.string().min(1, "Password is required"),
});

type TenantLoginInput = z.infer<typeof tenantLoginSchema>;

interface TenantLoginPageProps {
  companyCode: string;
  companyName?: string;
}

export default function TenantLoginPage({ companyCode, companyName }: TenantLoginPageProps) {
  const { toast } = useToast();

  const form = useForm<TenantLoginInput>({
    resolver: zodResolver(tenantLoginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const loginMutation = useMutation({
    mutationFn: async (data: TenantLoginInput) => {
      return await apiRequest("POST", "/api/demo-login", {
        companyCode,
        email: data.email,
        password: data.password,
      });
    },
    onSuccess: () => {
      toast({
        title: "Login Successful",
        description: "Redirecting to dashboard...",
      });
      window.location.href = "/";
    },
    onError: (error: any) => {
      toast({
        title: "Login Failed",
        description: error.message || "Invalid credentials. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: TenantLoginInput) => {
    loginMutation.mutate(data);
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Branded Header */}
      <div className="bg-gradient-to-br from-primary via-secondary to-[hsl(var(--ttf-navy))] relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/20 to-black/40" />
        <div className="relative flex flex-col items-center justify-center py-14 px-4 gap-4">
          <TokaniLogo
            variant="icon"
            className="h-16 w-16 shadow-xl border-2 border-white/20"
            data-testid="img-tenant-login-logo"
          />
          <div className="text-center">
            <p className="text-white/80 text-sm font-medium tracking-widest uppercase mb-1">
              Tokani TripFlow
            </p>
            {companyName && (
              <h1
                className="text-2xl md:text-3xl font-bold text-white"
                data-testid="heading-tenant-name"
              >
                {companyName}
              </h1>
            )}
          </div>
        </div>
      </div>

      {/* Login Form */}
      <div className="flex-1 flex items-start justify-center pt-10 px-4 pb-16">
        <Card className="w-full max-w-sm" data-testid="card-tenant-login">
          <CardHeader className="space-y-1">
            <CardTitle className="text-xl font-bold" data-testid="heading-tenant-login">
              Sign In
            </CardTitle>
            <CardDescription>
              Enter your credentials to access TripFlow
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-4"
                data-testid="form-tenant-login"
              >
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
                          <Input
                            type="email"
                            placeholder="your@email.com"
                            className="pl-10"
                            data-testid="input-tenant-email"
                            {...field}
                          />
                        </div>
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
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
                          <Input
                            type="password"
                            placeholder="Password"
                            className="pl-10"
                            data-testid="input-tenant-password"
                            {...field}
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button
                  type="submit"
                  variant="default"
                  className="w-full"
                  disabled={loginMutation.isPending}
                  data-testid="button-tenant-login-submit"
                >
                  {loginMutation.isPending && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Sign In
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>

      {/* Footer */}
      <div className="pb-8 text-center">
        <p className="text-xs text-muted-foreground">
          Powered by{" "}
          <span className="font-semibold text-foreground">Tokani TripFlow</span>
          {" "}· Island Travel Technologies
        </p>
      </div>
    </div>
  );
}
