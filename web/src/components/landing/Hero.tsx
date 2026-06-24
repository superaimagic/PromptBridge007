"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Copy, Check, ArrowRight } from "lucide-react";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";

function GithubIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
    </svg>
  );
}

export default function Hero() {
  const [copied, setCopied] = useState(false);
  const { ref, isVisible } = useScrollAnimation();

  const installCommand = "npx promptbridge007 init";

  const handleCopy = async () => {
    await navigator.clipboard.writeText(installCommand);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <section
      ref={ref}
      className="relative min-h-[90vh] flex items-center justify-center overflow-hidden"
    >
      {/* Background grid pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:64px_64px]" />
      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-zinc-950" />
      {/* Glow effect */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-emerald-500/5 rounded-full blur-[120px]" />

      <div
        className={`relative z-10 max-w-4xl mx-auto px-6 text-center transition-all duration-700 ${
          isVisible
            ? "opacity-100 translate-y-0"
            : "opacity-0 translate-y-8"
        }`}
      >
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-emerald-500/20 bg-emerald-500/5 text-emerald-400 text-xs font-mono mb-8">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          Licensed to prompt
        </div>

        {/* Title */}
        <h1 className="text-5xl sm:text-6xl md:text-7xl font-bold tracking-tight mb-6">
          <span className="text-zinc-100">Prompt</span>
          <span className="text-emerald-400">Bridge</span>
          <span className="text-zinc-100">007</span>
        </h1>

        {/* Subtitle */}
        <p className="text-xl sm:text-2xl text-zinc-300 mb-4 font-medium">
          你的提示词，007号特工全权管理
        </p>

        {/* Description */}
        <p className="text-zinc-400 text-base sm:text-lg max-w-2xl mx-auto mb-10 leading-relaxed">
          开源跨平台AI提示词管理系统。统一格式、一键部署、环境自动扫描，
          让你的提示词在20+AI工具间无缝流转。
        </p>

        {/* Install command */}
        <div className="inline-flex items-center gap-3 px-4 py-2.5 rounded-lg bg-zinc-900 border border-zinc-800 font-mono text-sm mb-8">
          <span className="text-emerald-400">$</span>
          <span className="text-zinc-200">{installCommand}</span>
          <button
            onClick={handleCopy}
            className="p-1 rounded hover:bg-zinc-800 transition-colors text-zinc-400 hover:text-zinc-200"
            aria-label="复制安装命令"
          >
            {copied ? (
              <Check className="size-4 text-emerald-400" />
            ) : (
              <Copy className="size-4" />
            )}
          </button>
        </div>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Button
            size="lg"
            className="bg-emerald-600 hover:bg-emerald-500 text-white px-6 h-11 text-base"
            render={<a href="/app" />}
          >
            开始使用
            <ArrowRight className="size-4" />
          </Button>
          <Button
            variant="outline"
            size="lg"
            className="px-6 h-11 text-base border-zinc-700 hover:bg-zinc-800"
            render={
              <a
                href="https://github.com/promptbridge007/promptbridge007"
                target="_blank"
                rel="noopener noreferrer"
              />
            }
          >
            <GithubIcon className="size-4" />
            GitHub
          </Button>
        </div>
      </div>
    </section>
  );
}
