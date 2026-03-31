import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Loader2, Lock, Mail, Building2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { demoLoginSchema, type DemoLoginInput } from "@shared/demoSchema";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

const ITT_ACCOUNTS = [
  { role: "Super Admin", name: "Desmond Bale", email: "desmond.bale@islandtraveltech.com" },
  { role: "Employee", name: "Jone Ratudina", email: "jone.ratudina@islandtraveltech.com" },
  { role: "Coordinator", name: "Litia Vuniyayawa", email: "litia.vuniyayawa@islandtraveltech.com" },
  { role: "Manager", name: "Tomasi Ravouvou", email: "tomasi.ravouvou@islandtraveltech.com" },
  { role: "Finance Admin", name: "Mere Delana", email: "mere.delana@islandtraveltech.com" },
  { role: "Travel Admin", name: "Nemani Tui", email: "nemani.tui@islandtraveltech.com" },
];

function AccountTable({
  accounts,
  companyCode,
  password,
  onFill,
  accentClass,
}: {
  accounts: { role: string; name: string; email: string }[];
  companyCode: string;
  password: string;
  onFill: (email: string, code: string, pw: string) => void;
  accentClass: string;
}) {
  return (
    <div className="rounded-md border border-border overflow-hidden">
      <table className="w-full text-xs">
        <thead className="bg-muted/50">
          <tr>
            <th className="px-2 py-1.5 text-left font-medium text-muted-foreground">Role</th>
            <th className="px-2 py-1.5 text-left font-medium text-muted-foreground">Name</th>
            <th className="px-2 py-1.5 text-right font-medium text-muted-foreground">Use</th>
          </tr>
        </thead>
        <tbody>
          {accounts.map((acct, i) => (
            <tr key={acct.email} className={i % 2 === 0 ? "" : "bg-muted/20"}>
              <td className="px-2 py-1.5 text-muted-foreground">{acct.role}</td>
              <td className="px-2 py-1.5 font-medium">{acct.name}</td>
              <td className="px-2 py-1.5 text-right">
                <button
                  type="button"
                  onClick={() => onFill(acct.email, companyCode, password)}
                  className={`${accentClass} underline underline-offset-2`}
                  data-testid={`button-fill-${companyCode}-${acct.role.toLowerCase().replace(/[\s()\/]+/g, "-")}`}
                >
                  Fill
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function DemoLogin() {
  const { toast } = useToast();

  const form = useForm<DemoLoginInput>({
    resolver: zodResolver(demoLoginSchema),
    defaultValues: {
      companyCode: "",
      email: "",
      password: "",
    },
  });

  const loginMutation = useMutation({
    mutationFn: async (data: DemoLoginInput) => {
      const result = await apiRequest("POST", "/api/demo-login", data);
      return result;
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

  const onSubmit = (data: DemoLoginInput) => {
    loginMutation.mutate(data);
  };

  const fillCredentials = (email: string, companyCode: string, password: string) => {
    form.setValue("companyCode", companyCode);
    form.setValue("email", email);
    form.setValue("password", password);
  };

  return (
    <Card className="w-full max-w-md mx-auto border-2">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl font-bold">Demo Login</CardTitle>
        <CardDescription>
          Sign in with demo credentials to explore Tokani TripFlow
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="companyCode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Company Code</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Building2 className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                      <Input
                        placeholder="Company Code (e.g., itt001 or cdp001)"
                        className="pl-10"
                        data-testid="input-company-code"
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
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                      <Input
                        type="email"
                        placeholder="Email"
                        className="pl-10"
                        data-testid="input-email"
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
                      <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                      <Input
                        type="password"
                        placeholder="Password"
                        className="pl-10"
                        data-testid="input-password"
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
              data-testid="button-demo-login"
            >
              {loginMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Sign In to Demo
            </Button>

            <div className="space-y-4 pt-1">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <div className="h-5 w-5 rounded-full bg-[#2274D1] flex-shrink-0" />
                  <p className="text-xs font-semibold text-foreground">
                    Island Travel Technologies
                  </p>
                  <span className="text-xs text-muted-foreground ml-auto">
                    <code className="bg-muted px-1 rounded">itt001</code> · <code className="bg-muted px-1 rounded">itt1235*</code>
                  </span>
                </div>
                <AccountTable
                  accounts={ITT_ACCOUNTS}
                  companyCode="itt001"
                  password="itt1235*"
                  onFill={fillCredentials}
                  accentClass="text-[#2274D1] hover:text-[#2274D1]/80"
                />
              </div>

            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
