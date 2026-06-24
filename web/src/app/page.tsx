import Hero from "@/components/landing/Hero";
import Features from "@/components/landing/Features";
import ToolWall from "@/components/landing/ToolWall";
import Architecture from "@/components/landing/Architecture";
import QuickStart from "@/components/landing/QuickStart";
import OpenSourceCTA from "@/components/landing/OpenSourceCTA";
import Footer from "@/components/landing/Footer";

export default function Home() {
  return (
    <div className="flex flex-col flex-1 bg-zinc-950">
      <Hero />
      <Features />
      <ToolWall />
      <Architecture />
      <QuickStart />
      <OpenSourceCTA />
      <Footer />
    </div>
  );
}
