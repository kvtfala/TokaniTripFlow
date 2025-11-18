// Demo Login Component
// Provides email + password + company code authentication for demo purposes

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Lock, Mail, Building2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { demoLoginSchema, type DemoLoginInput } from "@shared/demoSchema";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

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
      // Redirect to home after successful login
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

  // Auto-fill demo credentials for convenience
  const fillDemoCredentials = () => {
    form.setValue("companyCode", "itt001");
    form.setValue("email", "desmond.bale@islandtraveltech.com");
    form.setValue("password", "itt1235*");
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
                        placeholder="Company Code (e.g., itt001)"
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

            <div className="space-y-2">
              <Button 
                type="submit" 
                className="w-full bg-[#3C7DD9] hover:bg-[#2D5BA8] text-white"
                disabled={loginMutation.isPending}
                data-testid="button-demo-login"
              >
                {loginMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Sign In to Demo
              </Button>
              
              <Button 
                type="button" 
                variant="outline"
                className="w-full"
                onClick={fillDemoCredentials}
                disabled={loginMutation.isPending}
                data-testid="button-fill-demo"
              >
                Fill Demo Credentials
              </Button>
            </div>

            <div className="text-xs text-muted-foreground text-center pt-2 space-y-1">
              <p className="font-semibold">Demo Credentials:</p>
              <p>Company: <code className="bg-muted px-1 rounded">itt001</code></p>
              <p>Email: <code className="bg-muted px-1 rounded">desmond.bale@islandtraveltech.com</code></p>
              <p>Password: <code className="bg-muted px-1 rounded">itt1235*</code></p>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
