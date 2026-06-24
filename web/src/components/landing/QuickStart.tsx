"use client";

import { Download, ScanSearch, Rocket } from "lucide-react";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";

const steps = [
  {
    number: "01",
    icon: Download,
    title: "安装",
    command: "npx promptbridge007 init",
    description: "一行命令完成安装，零配置开箱即用",
  },
  {
    number: "02",
    icon: ScanSearch,
    title: "扫描",
    command: "promptbridge007 scan",
    description: "自动发现本地AI工具与提示词目录",
  },
  {
    number: "03",
    icon: Rocket,
    title: "部署",
    command: "promptbridge007 deploy --tool cursor",
    description: "指定目标工具，一键部署提示词",
  },
];

export default function QuickStart() {
  const { ref, isVisible } = useScrollAnimation();

  return (
    <section ref={ref} className="py-24 px-6">
      <div className="max-w-5xl mx-auto">
        <div
          className={`text-center mb-16 transition-all duration-700 ${
            isVisible
              ? "opacity-100 translate-y-0"
              : "opacity-0 translate-y-8"
          }`}
        >
          <h2 className="text-3xl sm:text-4xl font-bold text-zinc-100 mb-4">
            三步上手
          </h2>
          <p className="text-zinc-400 text-lg">
            从安装到部署，只需三条命令
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {steps.map((step, index) => (
            <div
              key={step.number}
              className={`relative p-6 rounded-xl border border-zinc-800 bg-zinc-900/50 transition-all duration-500 ${
                isVisible
                  ? "opacity-100 translate-y-0"
                  : "opacity-0 translate-y-8"
              }`}
              style={{ transitionDelay: `${index * 150}ms` }}
            >
              {/* Step number */}
              <div className="text-4xl font-bold text-zinc-800 mb-4 font-mono">
                {step.number}
              </div>

              {/* Icon */}
              <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center mb-4">
                <step.icon className="size-5 text-emerald-400" />
              </div>

              {/* Title */}
              <h3 className="text-lg font-semibold text-zinc-100 mb-2">
                {step.title}
              </h3>

              {/* Command */}
              <div className="px-3 py-2 rounded-md bg-zinc-950 border border-zinc-800 font-mono text-sm text-zinc-300 mb-3">
                <span className="text-emerald-400">$ </span>
                {step.command}
              </div>

              {/* Description */}
              <p className="text-zinc-500 text-sm">{step.description}</p>

              {/* Connector line (not on last item) */}
              {index < steps.length - 1 && (
                <div className="hidden md:block absolute top-1/2 -right-3 w-6 h-px bg-zinc-700" />
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
