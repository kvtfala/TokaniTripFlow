// Replit Auth Integration - Landing page for logged-out users
// Reference: blueprint:javascript_log_in_with_replit

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Plane, Shield, TrendingUp, Users } from "lucide-react";

export default function Landing() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-cyan-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      {/* Header */}
      <header className="container mx-auto px-4 py-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Plane className="w-8 h-8 text-primary" />
            <h1 className="text-2xl font-bold">Tokani TripFlow</h1>
          </div>
          <a href="/api/login">
            <Button size="lg" data-testid="button-login">
              Sign In
            </Button>
          </a>
        </div>
      </header>

      {/* Hero Section */}
      <main className="container mx-auto px-4 py-16 md:py-24">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
            Bula! Welcome to TripFlow
          </h2>
          <p className="text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto mb-8">
            Streamline your travel management from request to reconciliation with enterprise-grade workflows built for the Pacific
          </p>
          <a href="/api/login">
            <Button size="lg" className="text-lg px-8 py-6" data-testid="button-get-started">
              Get Started
            </Button>
          </a>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
          <Card className="hover-elevate">
            <CardHeader>
              <Plane className="w-10 h-10 mb-4 text-primary" />
              <CardTitle>Smart Workflows</CardTitle>
              <CardDescription>
                Multi-level approval flows with automated routing and delegation support
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="hover-elevate">
            <CardHeader>
              <TrendingUp className="w-10 h-10 mb-4 text-primary" />
              <CardTitle>Cost Control</CardTitle>
              <CardDescription>
                Automated per-diem calculations, budget tracking, and expense reconciliation
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="hover-elevate">
            <CardHeader>
              <Shield className="w-10 h-10 mb-4 text-primary" />
              <CardTitle>Compliance Ready</CardTitle>
              <CardDescription>
                Visa checking, audit trails, and FRCS-friendly record keeping
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="hover-elevate">
            <CardHeader>
              <Users className="w-10 h-10 mb-4 text-primary" />
              <CardTitle>Role-Based Access</CardTitle>
              <CardDescription>
                Coordinators, managers, and travel desk with personalized dashboards
              </CardDescription>
            </CardHeader>
          </Card>
        </div>

        {/* CTA Section */}
        <div className="mt-24 text-center">
          <Card className="max-w-2xl mx-auto bg-primary text-primary-foreground">
            <CardHeader>
              <CardTitle className="text-2xl md:text-3xl">
                Ready to transform your travel management?
              </CardTitle>
              <CardDescription className="text-primary-foreground/80 text-lg">
                Sign in to access your personalized dashboard and start managing travel requests efficiently
              </CardDescription>
            </CardHeader>
            <CardContent>
              <a href="/api/login">
                <Button size="lg" variant="secondary" className="text-lg px-8 py-6" data-testid="button-sign-in-cta">
                  Sign In to Your Account
                </Button>
              </a>
            </CardContent>
          </Card>
        </div>
      </main>

      {/* Footer */}
      <footer className="container mx-auto px-4 py-8 mt-16 border-t">
        <div className="text-center text-muted-foreground">
          <p>Tokani TripFlow - Enterprise Travel Management for the Pacific Region</p>
          <p className="text-sm mt-2">Built for Pacific Foods Group Pte Ltd</p>
        </div>
      </footer>
    </div>
  );
}
