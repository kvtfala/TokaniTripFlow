// Demo Login Component
// Provides email + password + company code authentication for demo purposes

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Lock, Mail, Building2 } from "lucide-react";

export function DemoLogin() {
  const [companyCode, setCompanyCode] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const response = await fetch("/api/demo-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyCode, email, password }),
      });

      if (!response.ok) {
        const data = await response.json();
        setError(data.message || "Login failed");
        setIsLoading(false);
        return;
      }

      // Success - redirect to home
      window.location.href = "/";
    } catch (err) {
      setError("An error occurred during login");
      setIsLoading(false);
    }
  };

  // Auto-fill demo credentials for convenience
  const fillDemoCredentials = () => {
    setCompanyCode("itt001");
    setEmail("desmond.bale@islandtraveltech.com");
    setPassword("itt1235*");
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
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="companyCode">Company Code</Label>
            <div className="relative">
              <Building2 className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                id="companyCode"
                type="text"
                placeholder="Company Code (e.g., itt001)"
                value={companyCode}
                onChange={(e) => setCompanyCode(e.target.value)}
                className="pl-10"
                data-testid="input-company-code"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                id="email"
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-10"
                data-testid="input-email"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                id="password"
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-10"
                data-testid="input-password"
                required
              />
            </div>
          </div>

          {error && (
            <Alert variant="destructive" data-testid="alert-error">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Button 
              type="submit" 
              className="w-full bg-[#3C7DD9] hover:bg-[#2D5BA8] text-white"
              disabled={isLoading}
              data-testid="button-demo-login"
            >
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Sign In to Demo
            </Button>
            
            <Button 
              type="button" 
              variant="outline"
              className="w-full"
              onClick={fillDemoCredentials}
              disabled={isLoading}
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
      </CardContent>
    </Card>
  );
}
