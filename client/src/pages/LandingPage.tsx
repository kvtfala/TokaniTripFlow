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
  itt: {
    heading: "About Island Travel Technologies (ITT)",
    subtitle: "Fiji's homegrown travel-tech company — with a heart for community innovation.",
    intro: "Island Travel Technologies (ITT) is a Fiji-based software company specialising in travel systems, travel automation, and workflow technology designed specifically for the Pacific.",
    coreFocus: {
      heading: "Our core focus is building high-impact travel applications that improve:",
      items: [
        "Corporate travel approvals",
        "Vendor and procurement workflows",
        "Travel policy compliance",
        "Regional coordination",
        "Cost control and visibility",
        "Low-bandwidth usability for Pacific environments"
      ]
    },
    tagline: "We build practical, robust travel software tailored to how Fiji truly travels, not what international systems assume.",
    specialty: {
      heading: "Our Specialty: Travel Systems Designed for the Pacific",
      description: "ITT focuses on delivering modern, reliable systems for:",
      items: [
        "Travel approvals",
        "RFQ & vendor workflows",
        "Corporate mobility",
        "Group and regional travel planning",
        "Visa, ticketing, and booking processes",
        "Travel policy automation",
        "Corporate dashboards and analytics"
      ],
      footer: "This is our primary domain — our expertise. Tokani TripFlow is the flagship example of that capability."
    },
    community: {
      heading: "Beyond Travel: ITT's Commitment to Community Impact",
      intro: "While travel software is our core business, we believe technology should also uplift Fiji's young people.",
      purpose: "This is why ITT builds free, student-focused digital tools that create real opportunities:",
      tools: [
        {
          name: "Tokani Resume",
          description: "A free resume builder for Fiji's secondary and tertiary students — simple, professional, and easy to use."
        },
        {
          name: "Tokani Interview Guide",
          description: "An AI-powered interview practice assistant helping students prepare confidently for real job interviews."
        },
        {
          name: "Tokani Careers",
          description: "A guidance tool that matches students' subjects and interests to Fiji-based study paths, institutions, and career options."
        }
      ],
      footer: "These community apps are developed pro bono, as ITT's contribution to youth development, employability, and digital empowerment across Fiji."
    },
    purpose: {
      heading: "Why ITT Exists",
      intro: "Our purpose is two-fold:",
      points: [
        {
          title: "Build world-class travel systems designed for Fiji.",
          description: "Reliable, structured, transparent, and built for local realities."
        },
        {
          title: "Use technology to give back to the community.",
          description: "By creating free tools that help students build careers and gain confidence."
        }
      ],
      conclusion: "This blend of specialisation and social impact defines who we are: a local tech company with global-level ambition and a community-first heart."
    }
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
      <section id="hero" className="relative overflow-hidden">
        {/* Gradient Background: Tokani Blue → Aqua → Navy */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary via-secondary to-[hsl(var(--ttf-navy))]" />
        
        {/* Dark overlay for accessibility (WCAG AA) */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/30 to-black/50" />
        
        {/* Hero Content */}
        <div className="relative container mx-auto px-4 py-20 md:py-32">
          <div className="max-w-4xl mx-auto text-center">
            {/* Logo */}
            <div className="flex justify-center mb-8">
              <TokaniLogo variant="icon" className="h-24 w-24 md:h-32 md:w-32 shadow-2xl border-4 border-white/20" data-testid="img-hero-logo" />
            </div>

            <Badge variant="outline" className="border-white/40 text-white mb-6 bg-white/10 backdrop-blur-sm" data-testid="badge-pre-pilot">
              {CONTENT.hero.demoNote}
            </Badge>
            
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl lg:text-7xl text-white mb-6 leading-tight" data-testid="heading-hero-title">
              {CONTENT.hero.title}
            </h1>
            
            <p className="text-xl md:text-3xl font-medium text-white/95 max-w-3xl mx-auto mb-4" data-testid="text-tagline">
              {CONTENT.hero.tagline}
            </p>
            
            <p className="text-base md:text-lg text-white/90 max-w-3xl mx-auto leading-relaxed mb-12" data-testid="text-subtitle">
              {CONTENT.hero.subtitle}
            </p>

            <div className="flex justify-center items-center">
              <a href="#demo">
                <Button 
                  size="lg" 
                  variant="default"
                  className="text-lg px-10 py-7 shadow-xl w-full sm:w-auto" 
                  data-testid="button-demo"
                >
                  {CONTENT.hero.ctaPrimary}
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

      {/* ITT Section */}
      <section id="itt" className="py-16 md:py-24 bg-card">
        <div className="container mx-auto max-w-5xl px-4 md:px-6">
          {/* Main Heading */}
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-4 text-foreground" data-testid="heading-itt">
            {CONTENT.itt.heading}
          </h2>
          <p className="text-lg text-center text-muted-foreground mb-12 italic">
            {CONTENT.itt.subtitle}
          </p>

          {/* Introduction */}
          <div className="mb-12">
            <p className="text-lg md:text-xl text-foreground leading-relaxed mb-6">
              {CONTENT.itt.intro}
            </p>
            
            {/* Core Focus */}
            <div className="mb-6">
              <p className="text-base md:text-lg text-foreground font-semibold mb-3">
                {CONTENT.itt.coreFocus.heading}
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-4">
                {CONTENT.itt.coreFocus.items.map((item, idx) => (
                  <div key={idx} className="flex items-start gap-2">
                    <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                    <span className="text-muted-foreground">{item}</span>
                  </div>
                ))}
              </div>
            </div>

            <p className="text-base md:text-lg text-foreground leading-relaxed font-medium italic">
              {CONTENT.itt.tagline}
            </p>
          </div>

          {/* Specialty Section */}
          <Card className="border-primary/20 mb-8">
            <CardHeader>
              <CardTitle className="text-xl md:text-2xl">
                {CONTENT.itt.specialty.heading}
              </CardTitle>
              <CardDescription className="text-base">
                {CONTENT.itt.specialty.description}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-4">
                {CONTENT.itt.specialty.items.map((item, idx) => (
                  <div key={idx} className="flex items-start gap-2">
                    <Target className="w-4 h-4 text-primary flex-shrink-0 mt-1" />
                    <span className="text-sm text-muted-foreground">{item}</span>
                  </div>
                ))}
              </div>
              <p className="text-base text-foreground leading-relaxed mt-4 pt-4 border-t font-medium">
                {CONTENT.itt.specialty.footer}
              </p>
            </CardContent>
          </Card>

          {/* Community Impact Section */}
          <Card className="border-secondary/20 mb-8">
            <CardHeader>
              <CardTitle className="text-xl md:text-2xl">
                {CONTENT.itt.community.heading}
              </CardTitle>
              <CardDescription className="text-base">
                {CONTENT.itt.community.intro}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-base text-foreground mb-4">
                {CONTENT.itt.community.purpose}
              </p>
              
              <div className="space-y-4 mb-6">
                {CONTENT.itt.community.tools.map((tool, idx) => (
                  <div key={idx} className="border-l-4 border-secondary pl-4 py-2">
                    <h4 className="font-bold text-foreground mb-1">{tool.name}</h4>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {tool.description}
                    </p>
                  </div>
                ))}
              </div>

              <p className="text-base text-muted-foreground leading-relaxed italic pt-4 border-t">
                {CONTENT.itt.community.footer}
              </p>
            </CardContent>
          </Card>

          {/* Purpose Section */}
          <Card className="border-primary/20">
            <CardHeader>
              <CardTitle className="text-xl md:text-2xl">
                {CONTENT.itt.purpose.heading}
              </CardTitle>
              <CardDescription className="text-base">
                {CONTENT.itt.purpose.intro}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 mb-6">
                {CONTENT.itt.purpose.points.map((point, idx) => (
                  <div key={idx} className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center mt-1">
                      <span className="text-primary font-bold">{idx + 1}</span>
                    </div>
                    <div>
                      <h4 className="font-bold text-foreground mb-1">{point.title}</h4>
                      <p className="text-sm text-muted-foreground">{point.description}</p>
                    </div>
                  </div>
                ))}
              </div>

              <p className="text-base md:text-lg text-foreground leading-relaxed font-medium pt-4 border-t">
                {CONTENT.itt.purpose.conclusion}
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Final CTA Section */}
      <section id="cta" className="relative overflow-hidden py-20 md:py-28">
        {/* Gradient Background: Tokani Blue → Aqua → Navy */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary via-secondary to-[hsl(var(--ttf-navy))]" />
        
        {/* Dark overlay for accessibility (WCAG AA) */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/30 to-black/50" />
        
        <div className="container relative mx-auto max-w-4xl px-4 md:px-6 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-8 text-white" data-testid="heading-cta">
            {CONTENT.cta.heading}
          </h2>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <a href="#demo">
              <Button
                size="lg"
                variant="default"
                className="text-lg px-10 py-7 shadow-xl w-full sm:w-auto"
                data-testid="button-cta-0"
              >
                View the Live Demo
              </Button>
            </a>
            <a href="mailto:contact@tokani.com">
              <Button
                size="lg"
                variant="outline"
                className="text-lg px-10 py-7 bg-white/10 backdrop-blur-sm border-2 border-white/60 text-white hover:bg-white/20 hover:border-white w-full sm:w-auto"
                data-testid="button-cta-1"
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
