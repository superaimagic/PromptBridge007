"use client";

import { useScrollAnimation } from "@/hooks/useScrollAnimation";

const outputTools = [
  "Claude Code",
  "Cursor",
  "Copilot",
  "Windsurf",
  "Aider",
  "GLM",
  "DeepSeek",
  "Kimi",
];

export default function Architecture() {
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
            一次创建，处处部署
          </h2>
          <p className="text-zinc-400 text-lg">
            PIF统一格式作为核心枢纽，格式矩阵驱动多端输出
          </p>
        </div>

        {/* Architecture flow diagram */}
        <div
          className={`transition-all duration-700 delay-200 ${
            isVisible
              ? "opacity-100 translate-y-0"
              : "opacity-0 translate-y-8"
          }`}
        >
          <div className="flex flex-col items-center gap-8">
            {/* PIF Source */}
            <div className="relative w-full max-w-md">
              <div className="relative p-6 rounded-xl border-2 border-emerald-500/40 bg-emerald-500/5 text-center">
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 bg-zinc-950 text-emerald-400 text-xs font-mono rounded-full border border-emerald-500/30">
                  SOURCE
                </div>
                <div className="text-2xl font-bold text-emerald-400 mb-1">
                  PIF
                </div>
                <div className="text-sm text-zinc-400">
                  统一提示词格式 · Prompt Interchange Format
                </div>
              </div>
            </div>

            {/* Arrow down */}
            <div className="flex flex-col items-center">
              <svg
                width="2"
                height="40"
                className="text-emerald-500/40"
                viewBox="0 0 2 40"
              >
                <line
                  x1="1"
                  y1="0"
                  x2="1"
                  y2="32"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeDasharray="4 4"
                />
                <polygon
                  points="0,32 1,40 2,32"
                  fill="currentColor"
                />
              </svg>
            </div>

            {/* Format Matrix */}
            <div className="relative w-full max-w-lg">
              <div className="relative p-5 rounded-xl border border-zinc-700 bg-zinc-900/80 text-center">
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 bg-zinc-950 text-zinc-400 text-xs font-mono rounded-full border border-zinc-700">
                  ENGINE
                </div>
                <div className="text-lg font-semibold text-zinc-200 mb-1">
                  格式矩阵
                </div>
                <div className="text-sm text-zinc-500">
                  Format Matrix · 智能转换引擎
                </div>
              </div>
            </div>

            {/* Arrow down - branching */}
            <div className="flex flex-col items-center w-full max-w-3xl">
              <svg
                width="100%"
                height="50"
                viewBox="0 0 600 50"
                className="text-emerald-500/30"
                preserveAspectRatio="xMidYMid meet"
              >
                <line
                  x1="300"
                  y1="0"
                  x2="300"
                  y2="20"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeDasharray="4 4"
                />
                {/* Branch lines */}
                <line
                  x1="75"
                  y1="30"
                  x2="525"
                  y2="30"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeDasharray="4 4"
                />
                {/* Vertical drops */}
                {[75, 150, 225, 300, 375, 450, 525].map((x) => (
                  <line
                    key={x}
                    x1={x}
                    y1="30"
                    x2={x}
                    y2="45"
                    stroke="currentColor"
                    strokeWidth="1.5"
                  />
                ))}
              </svg>
            </div>

            {/* Output tools grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 w-full max-w-3xl">
              {outputTools.map((tool, index) => (
                <div
                  key={tool}
                  className={`flex items-center justify-center px-3 py-2.5 rounded-lg border border-zinc-800 bg-zinc-900/50 text-sm text-zinc-300 transition-all duration-500 ${
                    isVisible
                      ? "opacity-100 translate-y-0"
                      : "opacity-0 translate-y-4"
                  }`}
                  style={{ transitionDelay: `${500 + index * 80}ms` }}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mr-2 shrink-0" />
                  {tool}
                </div>
              ))}
            </div>

            {/* More indicator */}
            <div className="text-zinc-600 text-sm font-mono">
              + 12 more tools...
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
