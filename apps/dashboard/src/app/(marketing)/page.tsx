import { BuilderDemoProvider } from "@/features/builder-demo/builder-demo-context";
import { CommandsSection } from "@/features/marketing/commands-section";
import { DashboardSection } from "@/features/marketing/dashboard-section";
import { FaqSection } from "@/features/marketing/faq-section";
import { Hero } from "@/features/marketing/hero";
import { PlanSection } from "@/features/marketing/plan-section";
import { PricingSection } from "@/features/marketing/pricing-section";

export default function LandingPage() {
  return (
    <>
      {/* The provider links the hero prompt box to the plan preview below it. */}
      <BuilderDemoProvider>
        <Hero />
        <PlanSection />
      </BuilderDemoProvider>
      <DashboardSection />
      <CommandsSection />
      <PricingSection />
      <FaqSection />
    </>
  );
}
