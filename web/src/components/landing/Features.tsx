"use client";

import { ScanSearch, Rocket, ArrowLeftRight, Globe, Plug } from "lucide-react";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";

const features = [
  {
    icon: ScanSearch,
    title: "环境扫描",
    subtitle: "Environment Scan",
    description: "自动发现本地AI工具，智能扫描提示词目录",
  },
  {
    icon: Rocket,
    title: "一键部署",
    subtitle: "One-Click Deploy",
    description: "支持原版/定制/增量三种部署模式",
  },
  {
    icon: ArrowLeftRight,
    title: "格式转换",
    subtitle: "Format Convert",
    description: "PIF统一格式，支持20+工具原生输出",
  },
  {
    icon: Globe,
    title: "公共库",
    subtitle: "Public Library",
    description: "社区优质提示词，来源可追溯，许可可审计",
  },
  {
    icon: Plug,
    title: "MCP接入",
    subtitle: "MCP Integration",
    description: "AI Agent直接调用，标准协议无缝对接",
  },
];

export default function Features() {
  const { ref, isVisible } = useScrollAnimation();

  return (
    <section ref={ref} className="py-24 px-6">
      <div className="max-w-6xl mx-auto">
        <div
          className={`text-center mb-16 transition-all duration-700 ${
            isVisible
              ? "opacity-100 translate-y-0"
              : "opacity-0 translate-y-8"
          }`}
        >
          <h2 className="text-3xl sm:text-4xl font-bold text-zinc-100 mb-4">
            五大核心能力
          </h2>
          <p className="text-zinc-400 text-lg">
            全方位提示词管理，从发现到部署一站搞定
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <div
              key={feature.title}
              className={`group relative p-6 rounded-xl border border-zinc-800 bg-zinc-900/50 hover:border-emerald-500/30 hover:bg-zinc-900 transition-all duration-500 ${
                isVisible
                  ? "opacity-100 translate-y-0"
                  : "opacity-0 translate-y-8"
              }`}
              style={{ transitionDelay: `${index * 100}ms` }}
            >
              {/* Glow on hover */}
              <div className="absolute inset-0 rounded-xl bg-emerald-500/0 group-hover:bg-emerald-500/[0.02] transition-colors duration-500" />

              <div className="relative z-10">
                <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center mb-4 group-hover:bg-emerald-500/20 transition-colors">
                  <feature.icon className="size-5 text-emerald-400" />
                </div>
                <h3 className="text-lg font-semibold text-zinc-100 mb-1">
                  {feature.title}
                </h3>
                <p className="text-xs font-mono text-emerald-400/60 mb-3">
                  {feature.subtitle}
                </p>
                <p className="text-zinc-400 text-sm leading-relaxed">
                  {feature.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
