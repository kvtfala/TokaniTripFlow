import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TokaniLogo } from "@/components/brand/TokaniLogo";
import { DemoLogin } from "@/components/DemoLogin";
import { 
  CheckCircle2, 
  AlertTriangle, 
  Target, 
  TrendingUp, 
  Shield, 
  Users,
  FileText,
  BarChart3,
  Clock,
  DollarSign,
  Eye,
  Zap,
  Calendar,
  Rocket,
  User
} from "lucide-react";

// Content Configuration - Easy to Update
const CONTENT = {
  hero: {
    title: "Tokani TripFlow",
    tagline: "Your Trusted Partner for Travel Approvals.",
    subtitle: "Fiji-built travel approval & vendor workflow platform for corporates, NGOs, statutory bodies, and government ministries.",
    demoNote: "Demo-only, pre-pilot version.",
    ctaPrimary: "View the Live Demo",
    ctaSecondary: "Request a Discussion"
  },
  mission: {
    heading: "Transforming How Fiji Manages Official Travel",
    body: "Tokani TripFlow's mission is to modernise and simplify how organisations in Fiji plan, approve, and manage official travel — delivering transparency, speed, cost savings, and strong governance at every step."
  },
  problems: {
    heading: "The Problems Organisations Face Today",
    items: [
      { icon: Clock, text: "Slow, manual approval flows (email, WhatsApp, spreadsheets)" },
      { icon: FileText, text: "Lost or incomplete RFQs" },
      { icon: Shield, text: "No procurement oversight or consistent vendor process" },
      { icon: DollarSign, text: "Budget leakage from inconsistent pricing" },
      { icon: AlertTriangle, text: "Miscommunication between traveller, manager, and coordinator" },
      { icon: Eye, text: "No central audit trail or visibility for finance" }
    ]
  },
  features: {
    heading: "How Tokani TripFlow Helps",
    items: [
      {
        icon: Users,
        title: "Structured Travel Request Workflow",
        description: "Clear workflow from Traveller → Manager → Coordinator → Vendor → Finance with role-based permissions and automated notifications."
      },
      {
        icon: Shield,
        title: "Vendor Management with Approved Lists",
        description: "Maintain approved vendor lists for Flights, Hotels, Transfers, and Visa services with full audit history and performance tracking."
      },
      {
        icon: Zap,
        title: "RFQ Automation Built for Fiji Vendors",
        description: "Travel agents handle flights only, with separate RFQs for hotels, transfers, and visa services matching Fiji's vendor ecosystem."
      },
      {
        icon: BarChart3,
        title: "Upload & Compare Quotes",
        description: "Compare cheapest, highest, and variance across vendor quotes with estimated savings visibility and attachment management."
      },
      {
        icon: FileText,
        title: "Finance & Audit Transparency",
        description: "Complete timeline of approvals, decisions, and attachments with immutable audit trail and FRCS-friendly export formats."
      },
      {
        icon: DollarSign,
        title: "Per Diem & Total Trip Cost Summary",
        description: "Automated per-diem calculations with configurable rates and comprehensive trip cost breakdown for budget control."
      }
    ]
  },
  objectives: {
    heading: "What Tokani TripFlow Aims to Achieve",
    items: [
      "Faster, cleaner approvals",
      "Stronger procurement governance and vendor control",
      "Empowered travel coordinators with a central workspace",
      "Reduced travel costs through quote comparison and savings visibility",
      "Clear finance visibility and audit-ready records",
      "A system tailored to Fiji's travel ecosystem"
    ]
  },
  roadmap: {
    heading: "Roadmap: From Demo to Full Launch",
    phases: [
      {
        phase: "Phase 1",
        status: "Completed",
        title: "Working Demo",
        features: [
          "Core workflow from request to approval",
          "RFQs and vendor management",
          "Quote upload & comparison",
          "Audit timeline",
          "Basic dashboards"
        ]
      },
      {
        phase: "Phase 2",
        status: "Funding Required",
        title: "Production Build",
        features: [
          "Secure authentication and RBAC",
          "Multi-tenant support",
          "Database hardening",
          "Email template engine",
          "UI/UX upgrade",
          "Offline support",
          "Performance optimisation"
        ]
      },
      {
        phase: "Phase 3",
        status: "Future",
        title: "Full Launch",
        features: [
          "Amadeus/GDS integration",
          "Mobile app",
          "Travel policy automation",
          "Advanced analytics & reporting",
          "Enterprise onboarding & training"
        ]
      }
    ]
  },
  founder: {
    heading: "About the Founder",
    name: "Desmond Bale",
    bio: "Tokani TripFlow was created by Desmond Bale, a corporate travel specialist with over a decade of experience designing, managing, and optimising travel workflows for organisations across Fiji and the Pacific.",
    expertise: [
      "Corporate travel management",
      "Regional and multi-sector itinerary planning",
      "High-volume travel coordination for NGOs, corporates, and government bodies",
      "Travel policy interpretation and compliance",
      "Vendor engagement and procurement alignment",
      "Fare analysis and cost-control strategies",
      "Travel systems design and digital process transformation"
    ],
    philosophy: "Tokani TripFlow wasn't inspired by overseas models. It was shaped by real, lived experience and built to match the way Fiji truly travels. Its purpose is simple: to bring structure, speed, transparency, and cost efficiency to every official trip made in Fiji."
  },
  cta: {
    heading: "Let's Transform Travel Management in Fiji",
    buttons: [
      { text: "View the Live Demo", primary: true },
      { text: "Request a Call", primary: false },
      { text: "Download Product Overview", primary: false }
    ]
  }
};

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section id="hero" className="relative overflow-hidden bg-gradient-to-br from-primary/10 via-background to-lagoon-light/20 py-16 md:py-24 lg:py-32">
        <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10"></div>
        <div className="container relative mx-auto max-w-6xl px-4 md:px-6">
          <div className="flex flex-col items-center text-center space-y-8">
            <Badge variant="outline" className="border-primary/40 text-primary" data-testid="badge-pre-pilot">
              {CONTENT.hero.demoNote}
            </Badge>
            
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl lg:text-7xl text-foreground" data-testid="heading-hero-title">
              {CONTENT.hero.title}
            </h1>
            
            <p className="text-xl md:text-2xl font-semibold text-primary max-w-3xl" data-testid="text-tagline">
              {CONTENT.hero.tagline}
            </p>
            
            <p className="text-base md:text-lg text-muted-foreground max-w-3xl leading-relaxed" data-testid="text-subtitle">
              {CONTENT.hero.subtitle}
            </p>

            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              <a href="#demo">
                <Button 
                  size="lg" 
                  className="text-base px-8 py-6 h-auto w-full sm:w-auto" 
                  data-testid="button-demo"
                >
                  {CONTENT.hero.ctaPrimary}
                </Button>
              </a>
              <a href="/api/login">
                <Button 
                  size="lg" 
                  variant="outline" 
                  className="text-base px-8 py-6 h-auto w-full sm:w-auto"
                  data-testid="button-contact"
                >
                  Sign In with Replit
                </Button>
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Demo Login Section */}
      <section id="demo" className="py-16 md:py-24 bg-muted/30">
        <div className="container mx-auto px-4 max-w-5xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4" data-testid="heading-demo">
              Try The Demo
            </h2>
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
              Experience Tokani TripFlow with full manager access to all features and dashboards
            </p>
          </div>
          <DemoLogin />
        </div>
      </section>

      {/* Mission Section */}
      <section id="mission" className="py-16 md:py-24 bg-card">
        <div className="container mx-auto max-w-5xl px-4 md:px-6">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-8 text-foreground" data-testid="heading-mission">
            {CONTENT.mission.heading}
          </h2>
          <p className="text-lg md:text-xl text-muted-foreground text-center leading-relaxed max-w-4xl mx-auto" data-testid="text-mission">
            {CONTENT.mission.body}
          </p>
        </div>
      </section>

      {/* Problems Section */}
      <section id="problems" className="py-16 md:py-24 bg-background">
        <div className="container mx-auto max-w-6xl px-4 md:px-6">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12 text-foreground" data-testid="heading-problems">
            {CONTENT.problems.heading}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {CONTENT.problems.items.map((problem, idx) => (
              <Card key={idx} className="border-destructive/20 hover-elevate" data-testid={`card-problem-${idx}`}>
                <CardContent className="pt-6">
                  <div className="flex items-start gap-3">
                    <problem.icon className="w-6 h-6 text-destructive flex-shrink-0 mt-1" />
                    <p className="text-sm md:text-base text-foreground leading-relaxed">
                      {problem.text}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Solution / Features Section */}
      <section id="features" className="py-16 md:py-24 bg-card">
        <div className="container mx-auto max-w-6xl px-4 md:px-6">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12 text-foreground" data-testid="heading-features">
            {CONTENT.features.heading}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {CONTENT.features.items.map((feature, idx) => (
              <Card key={idx} className="border-primary/20 hover-elevate" data-testid={`card-feature-${idx}`}>
                <CardHeader>
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                    <feature.icon className="w-6 h-6 text-primary" />
                  </div>
                  <CardTitle className="text-lg md:text-xl">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-sm md:text-base leading-relaxed">
                    {feature.description}
                  </CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Screenshots Section */}
      <section id="screenshots" className="py-16 md:py-24 bg-background">
        <div className="container mx-auto max-w-6xl px-4 md:px-6">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12 text-foreground" data-testid="heading-screenshots">
            See Tokani TripFlow in Action
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {[
              "Dashboard Overview",
              "Request Details",
              "Vendor RFQs",
              "Quotes & Approvals"
            ].map((label, idx) => (
              <Card key={idx} className="overflow-hidden hover-elevate" data-testid={`card-screenshot-${idx}`}>
                <div className="aspect-video bg-gradient-to-br from-muted to-muted/50 flex items-center justify-center border-b">
                  <div className="text-center space-y-2">
                    <div className="w-16 h-16 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
                      <BarChart3 className="w-8 h-8 text-primary" />
                    </div>
                    <p className="text-muted-foreground text-sm font-medium">Screenshot Placeholder</p>
                  </div>
                </div>
                <CardContent className="pt-4">
                  <p className="font-semibold text-center text-foreground">{label}</p>
                </CardContent>
              </Card>
            ))}
          </div>
          <p className="text-center text-sm text-muted-foreground mt-8 italic">
            Screenshots will be added from the live demo system
          </p>
        </div>
      </section>

      {/* Objectives Section */}
      <section id="objectives" className="py-16 md:py-24 bg-card">
        <div className="container mx-auto max-w-5xl px-4 md:px-6">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12 text-foreground" data-testid="heading-objectives">
            {CONTENT.objectives.heading}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {CONTENT.objectives.items.map((objective, idx) => (
              <div key={idx} className="flex items-start gap-3" data-testid={`item-objective-${idx}`}>
                <CheckCircle2 className="w-6 h-6 text-success flex-shrink-0 mt-0.5" />
                <p className="text-base md:text-lg text-foreground leading-relaxed">{objective}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Roadmap Section */}
      <section id="roadmap" className="py-16 md:py-24 bg-background">
        <div className="container mx-auto max-w-6xl px-4 md:px-6">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12 text-foreground" data-testid="heading-roadmap">
            {CONTENT.roadmap.heading}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {CONTENT.roadmap.phases.map((phase, idx) => (
              <Card 
                key={idx} 
                className={`${
                  phase.status === "Completed" 
                    ? "border-success/40 bg-success/5" 
                    : phase.status === "Funding Required"
                    ? "border-warning/40 bg-warning/5"
                    : "border-primary/40 bg-primary/5"
                } hover-elevate`}
                data-testid={`card-roadmap-${idx}`}
              >
                <CardHeader>
                  <div className="flex items-center justify-between mb-2">
                    <Badge 
                      variant={phase.status === "Completed" ? "default" : "outline"}
                      className={
                        phase.status === "Completed"
                          ? "bg-success hover:bg-success/90"
                          : phase.status === "Funding Required"
                          ? "border-warning text-warning"
                          : "border-primary text-primary"
                      }
                    >
                      {phase.status}
                    </Badge>
                  </div>
                  <CardTitle className="text-xl md:text-2xl">
                    {phase.phase}
                  </CardTitle>
                  <CardDescription className="text-base font-semibold text-foreground">
                    {phase.title}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {phase.features.map((feature, fIdx) => (
                      <li key={fIdx} className="flex items-start gap-2 text-sm">
                        <span className="text-primary mt-1">•</span>
                        <span className="text-muted-foreground">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Founder Section */}
      <section id="founder" className="py-16 md:py-24 bg-card">
        <div className="container mx-auto max-w-5xl px-4 md:px-6">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12 text-foreground" data-testid="heading-founder">
            {CONTENT.founder.heading}
          </h2>
          <Card className="border-primary/20">
            <CardContent className="pt-8">
              <div className="flex flex-col md:flex-row gap-8">
                <div className="flex-shrink-0 mx-auto md:mx-0">
                  <div className="w-32 h-32 rounded-full bg-gradient-to-br from-primary/20 to-lagoon/20 flex items-center justify-center">
                    <User className="w-16 h-16 text-primary" />
                  </div>
                </div>
                <div className="flex-1 space-y-6">
                  <div>
                    <p className="text-lg md:text-xl text-foreground leading-relaxed">
                      {CONTENT.founder.bio}
                    </p>
                  </div>
                  
                  <div>
                    <p className="font-semibold text-foreground mb-3">Expertise includes:</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {CONTENT.founder.expertise.map((skill, idx) => (
                        <div key={idx} className="flex items-start gap-2 text-sm">
                          <Target className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                          <span className="text-muted-foreground">{skill}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="pt-4 border-t">
                    <p className="text-base md:text-lg text-foreground leading-relaxed italic">
                      "{CONTENT.founder.philosophy}"
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Final CTA Section */}
      <section id="cta" className="py-16 md:py-24 bg-gradient-to-br from-primary/10 via-background to-lagoon-light/20">
        <div className="container mx-auto max-w-4xl px-4 md:px-6 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-8 text-foreground" data-testid="heading-cta">
            {CONTENT.cta.heading}
          </h2>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <a href="#demo">
              <Button
                size="lg"
                className="text-base px-8 py-6 h-auto w-full sm:w-auto"
                data-testid="button-cta-0"
              >
                View the Live Demo
              </Button>
            </a>
            <a href="/api/login">
              <Button
                size="lg"
                variant="outline"
                className="text-base px-8 py-6 h-auto w-full sm:w-auto"
                data-testid="button-cta-1"
              >
                Sign In with Replit
              </Button>
            </a>
            <a href="mailto:contact@tokani.com">
              <Button
                size="lg"
                variant="outline"
                className="text-base px-8 py-6 h-auto w-full sm:w-auto"
                data-testid="button-cta-2"
              >
                Request a Discussion
              </Button>
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 bg-card border-t">
        <div className="container mx-auto max-w-6xl px-4 md:px-6">
          <div className="text-center text-sm text-muted-foreground">
            <p>© 2024 Tokani TripFlow. Built for Fiji's Travel Ecosystem.</p>
            <p className="mt-2">Pre-pilot demo version. Contact for licensing and enterprise deployment.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
