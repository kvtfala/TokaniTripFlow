// Tokani TripFlow - Official Branded Landing Page
// Replit Auth Integration - Landing page for logged-out users

import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, Users, DollarSign, ExternalLink } from "lucide-react";
import { TokaniLogo } from "@/components/brand/TokaniLogo";
import { DemoLogin } from "@/components/DemoLogin";

export default function Landing() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-white dark:bg-card border-b sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <TokaniLogo variant="full" />
            <a href="/api/login">
              <Button 
                size="lg" 
                variant="secondary"
                className="bg-[#E94A64] hover:bg-[#C7344E] text-white border-0"
                data-testid="button-login"
              >
                Sign In
              </Button>
            </a>
          </div>
        </div>
      </header>

      {/* Hero Section with Full-Width Gradient */}
      <section className="relative overflow-hidden">
        {/* Gradient Background: Coral → Lagoon → Dusk */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#E94A64] via-[#3C7DD9] to-[#0F1A34]" />
        
        {/* Dark overlay for text readability */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/20 to-black/40" />
        
        {/* Hero Content */}
        <div className="relative container mx-auto px-4 py-20 md:py-32">
          <div className="max-w-4xl mx-auto text-center">
            {/* Logo */}
            <div className="flex justify-center mb-8">
              <TokaniLogo variant="icon" className="h-24 w-24 md:h-32 md:w-32 shadow-2xl border-4 border-white/20" data-testid="img-hero-logo" />
            </div>

            {/* Main Headline */}
            <h2 className="text-4xl md:text-6xl lg:text-7xl font-bold text-white mb-6 leading-tight">
              Tokani TripFlow
            </h2>

            {/* Tagline */}
            <p className="text-xl md:text-3xl text-white/95 font-medium mb-12 leading-relaxed">
              Your Trusted Partner For Travel Approvals.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <a href="#demo">
                <Button 
                  size="lg" 
                  className="text-lg px-10 py-7 bg-[#E94A64] hover:bg-[#C7344E] text-white border-0 shadow-xl w-full sm:w-auto"
                  data-testid="button-try-demo"
                >
                  Try Demo
                </Button>
              </a>
              <a href="/api/login">
                <Button 
                  size="lg" 
                  variant="outline" 
                  className="text-lg px-10 py-7 bg-white/10 backdrop-blur-sm border-2 border-white/60 text-white hover:bg-white/20 hover:border-white w-full"
                  data-testid="button-sign-in-replit"
                >
                  Sign In with Replit
                </Button>
              </a>
            </div>
          </div>
        </div>

        {/* Wave Divider */}
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 120" className="w-full h-12 md:h-20 fill-background">
            <path d="M0,64L48,69.3C96,75,192,85,288,80C384,75,480,53,576,48C672,43,768,53,864,58.7C960,64,1056,64,1152,58.7C1248,53,1344,43,1392,37.3L1440,32L1440,120L1392,120C1344,120,1248,120,1152,120C1056,120,960,120,864,120C768,120,672,120,576,120C480,120,384,120,288,120C192,120,96,120,48,120L0,120Z"></path>
          </svg>
        </div>
      </section>

      {/* Demo Login Section */}
      <section id="demo" className="py-20 md:py-28 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h3 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Try The Demo
            </h3>
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
              Experience Tokani TripFlow with full manager access to all features and dashboards
            </p>
          </div>
          <DemoLogin />
        </div>
      </section>

      {/* Features Section */}
      <section id="about" className="py-20 md:py-28 bg-background">
        <div className="container mx-auto px-4">
          {/* Section Header */}
          <div className="text-center mb-16">
            <h3 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Built for the Pacific
            </h3>
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
              Streamline your travel management from request to reconciliation with enterprise-grade workflows
            </p>
          </div>

          {/* 3-Column Features Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {/* Feature 1: Travel Policy Automation */}
            <Card className="hover-elevate border-2 transition-all duration-300">
              <CardHeader className="text-center p-8">
                <div className="flex justify-center mb-6">
                  <div className="p-4 bg-[#3C7DD9]/10 rounded-xl">
                    <CheckCircle2 className="w-12 h-12 text-[#3C7DD9]" />
                  </div>
                </div>
                <CardTitle className="text-2xl mb-4">Travel Policy Automation</CardTitle>
                <CardDescription className="text-base leading-relaxed">
                  Automated per-diem calculations, visa checks, and policy compliance ensure every request meets standards before approval
                </CardDescription>
              </CardHeader>
            </Card>

            {/* Feature 2: Multi-Level Approvals */}
            <Card className="hover-elevate border-2 transition-all duration-300">
              <CardHeader className="text-center p-8">
                <div className="flex justify-center mb-6">
                  <div className="p-4 bg-[#E94A64]/10 rounded-xl">
                    <Users className="w-12 h-12 text-[#E94A64]" />
                  </div>
                </div>
                <CardTitle className="text-2xl mb-4">Multi-Level Approvals</CardTitle>
                <CardDescription className="text-base leading-relaxed">
                  Smart routing through coordinator, manager, and finance approvals with delegation support and audit trails
                </CardDescription>
              </CardHeader>
            </Card>

            {/* Feature 3: Corporate-Ready RFQ Flow */}
            <Card className="hover-elevate border-2 transition-all duration-300">
              <CardHeader className="text-center p-8">
                <div className="flex justify-center mb-6">
                  <div className="p-4 bg-[#0F1A34]/10 dark:bg-[#3C7DD9]/10 rounded-xl">
                    <DollarSign className="w-12 h-12 text-[#0F1A34] dark:text-[#3C7DD9]" />
                  </div>
                </div>
                <CardTitle className="text-2xl mb-4">Corporate-Ready RFQ Flow</CardTitle>
                <CardDescription className="text-base leading-relaxed">
                  Request for Quote workflow with vendor management, quote comparison, and policy-based vendor selection
                </CardDescription>
              </CardHeader>
            </Card>
          </div>

          {/* Additional Info */}
          <div className="mt-20 text-center max-w-3xl mx-auto">
            <Card className="bg-gradient-to-br from-[#3C7DD9]/5 to-[#E94A64]/5 border-2">
              <CardHeader className="p-8 md:p-12">
                <CardTitle className="text-2xl md:text-3xl mb-4 text-foreground">
                  Ready to transform your travel management?
                </CardTitle>
                <CardDescription className="text-base md:text-lg mb-8 text-muted-foreground">
                  Join leading organizations managing travel with confidence
                </CardDescription>
                <a href="/api/login">
                  <Button 
                    size="lg" 
                    className="text-lg px-10 py-6 bg-[#E94A64] hover:bg-[#C7344E] text-white border-0"
                    data-testid="button-get-started-cta"
                  >
                    Get Started Today
                  </Button>
                </a>
              </CardHeader>
            </Card>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#0F1A34] text-white py-12 border-t-4 border-[#3C7DD9]">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-3">
              <TokaniLogo variant="icon" className="h-10 w-10" data-testid="img-footer-logo" />
              <div className="flex flex-col">
                <span className="font-bold text-lg">Tokani TripFlow</span>
                <span className="text-sm text-white/70">Enterprise Travel Management</span>
              </div>
            </div>
            <div className="text-center md:text-right">
              <p className="text-white/90">Demo Environment - Island Travel Technologies</p>
              <p className="text-sm text-white/60 mt-1">© 2025 Tokani TripFlow. All rights reserved.</p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
