"use client";

import { useState } from "react";
import {
  Bot,
  Code,
  Brain,
  Sparkles,
  Terminal,
  Cpu,
  Zap,
  Cloud,
  GitBranch,
  MessageSquare,
  Wrench,
  Shield,
  Layers,
  Monitor,
} from "lucide-react";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";

interface Tool {
  name: string;
  icon: React.ElementType;
  category: "international" | "domestic";
}

const tools: Tool[] = [
  { name: "Claude Code", icon: Bot, category: "international" },
  { name: "Cursor", icon: Code, category: "international" },
  { name: "GitHub Copilot", icon: GitBranch, category: "international" },
  { name: "Windsurf", icon: Cloud, category: "international" },
  { name: "Aider", icon: Terminal, category: "international" },
  { name: "Gemini CLI", icon: Sparkles, category: "international" },
  { name: "Codex", icon: Cpu, category: "international" },
  { name: "OpenCode", icon: Code, category: "international" },
  { name: "OpenClaw", icon: Wrench, category: "international" },
  { name: "Trae", icon: Zap, category: "international" },
  { name: "Amp", icon: Zap, category: "international" },
  { name: "Kiro", icon: Shield, category: "international" },
  { name: "Replit", icon: Layers, category: "international" },
  { name: "Warp", icon: Terminal, category: "international" },
  { name: "Kimi Code", icon: Brain, category: "domestic" },
  { name: "Coze", icon: MessageSquare, category: "domestic" },
  { name: "GLM", icon: Brain, category: "domestic" },
  { name: "Doubao", icon: Sparkles, category: "domestic" },
  { name: "通义灵码", icon: Cloud, category: "domestic" },
  { name: "天工 AI", icon: Monitor, category: "domestic" },
  { name: "Qwen Code", icon: Cpu, category: "domestic" },
  { name: "DeepSeek Coder", icon: Brain, category: "domestic" },
  { name: "Spark Code", icon: Zap, category: "domestic" },
  { name: "元宝", icon: Sparkles, category: "domestic" },
];

function ToolCard({ tool, index, isVisible }: { tool: Tool; index: number; isVisible: boolean }) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      className={`group relative flex items-center gap-3 px-4 py-3 rounded-lg border border-zinc-800 bg-zinc-900/50 hover:border-emerald-500/30 hover:bg-zinc-900 hover:scale-105 transition-all duration-300 cursor-default ${
        isVisible
          ? "opacity-100 translate-y-0"
          : "opacity-0 translate-y-4"
      }`}
      style={{ transitionDelay: `${index * 30}ms` }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <tool.icon className="size-4 text-zinc-500 group-hover:text-emerald-400 transition-colors shrink-0" />
      <span className="text-sm text-zinc-300 group-hover:text-zinc-100 transition-colors truncate">
        {tool.name}
      </span>
      <span
        className={`ml-auto text-[10px] px-1.5 py-0.5 rounded font-mono shrink-0 ${
          tool.category === "international"
            ? "text-blue-400/60 bg-blue-500/5"
            : "text-orange-400/60 bg-orange-500/5"
        }`}
      >
        {tool.category === "international" ? "INT" : "CN"}
      </span>
      {/* Hover badge */}
      {hovered && (
        <span className="absolute -top-2 -right-2 text-[10px] px-1.5 py-0.5 rounded bg-emerald-500 text-white font-medium animate-in fade-in">
          已支持
        </span>
      )}
    </div>
  );
}

export default function ToolWall() {
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
            20+ AI工具，一视同仁
          </h2>
          <p className="text-zinc-400 text-lg">
            国际工具与国产工具全覆盖，你的提示词无处不在
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {tools.map((tool, index) => (
            <ToolCard
              key={tool.name}
              tool={tool}
              index={index}
              isVisible={isVisible}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
