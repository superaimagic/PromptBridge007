'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ScanSearch, FolderOpen, CheckCircle2, ArrowRight, Loader2 } from 'lucide-react'
import { api } from '@/lib/api/client'

const ONBOARDING_KEY = 'pb007_onboarding_complete'

export default function OnboardingPage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [projectPath, setProjectPath] = useState('')
  const [scanning, setScanning] = useState(false)
  const [scanResult, setScanResult] = useState<{
    toolsFound: number
    promptsFound: number
  } | null>(null)

  // If onboarding already complete, redirect to /app
  useEffect(() => {
    if (typeof window !== 'undefined' && localStorage.getItem(ONBOARDING_KEY) === 'true') {
      router.replace('/app')
    }
  }, [router])

  const handleComplete = () => {
    localStorage.setItem(ONBOARDING_KEY, 'true')
    router.replace('/app')
  }

  const handleScan = async () => {
    setScanning(true)
    try {
      const res = await api.startScan(undefined, 'full')
      if (res.success && res.data) {
        // Poll for scan completion
        let scanId = res.data.scan_id
        let attempts = 0
        while (attempts < 30) {
          await new Promise((r) => setTimeout(r, 1000))
          const statusRes = await api.getScanStatus(scanId)
          if (statusRes.success && statusRes.data) {
            if (statusRes.data.status === 'completed') {
              setScanResult({
                toolsFound: statusRes.data.files_found || 0,
                promptsFound: statusRes.data.files_imported || 0,
              })
              break
            }
            if (statusRes.data.status === 'failed') {
              setScanResult({ toolsFound: 0, promptsFound: 0 })
              break
            }
          }
          attempts++
        }
        if (!scanResult) {
          setScanResult({ toolsFound: 0, promptsFound: 0 })
        }
      } else {
        setScanResult({ toolsFound: 0, promptsFound: 0 })
      }
    } catch {
      setScanResult({ toolsFound: 0, promptsFound: 0 })
    } finally {
      setScanning(false)
    }
  }

  // Auto-trigger scan on step 3
  useEffect(() => {
    if (step === 3 && !scanning && !scanResult) {
      handleScan()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step])

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-950 p-4">
      <Card className="w-full max-w-lg border-zinc-800 bg-zinc-900/80">
        {/* Step indicator */}
        <div className="flex items-center justify-center gap-2 pt-6 pb-2">
          {[1, 2, 3, 4].map((s) => (
            <div
              key={s}
              className={`h-2 w-8 rounded-full transition-colors ${
                s <= step ? 'bg-blue-500' : 'bg-zinc-700'
              }`}
            />
          ))}
        </div>

        {/* Step 1: Welcome */}
        {step === 1 && (
          <>
            <CardHeader className="text-center">
              <CardTitle className="text-2xl text-zinc-100">
                Welcome to PromptBridge007
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-center">
              <p className="text-zinc-400">
                跨平台AI提示词管理系统 — 一次创建，处处部署。
              </p>
              <p className="text-sm text-zinc-500">
                PromptBridge007 帮助您统一管理、格式转换和部署提示词到 24+ 种 AI 编程工具。
              </p>
              <Button
                onClick={() => setStep(2)}
                className="mt-4 gap-2 bg-blue-600 hover:bg-blue-700"
              >
                开始使用
                <ArrowRight className="h-4 w-4" />
              </Button>
            </CardContent>
          </>
        )}

        {/* Step 2: Choose Project Directory */}
        {step === 2 && (
          <>
            <CardHeader className="text-center">
              <CardTitle className="flex items-center justify-center gap-2 text-xl text-zinc-100">
                <FolderOpen className="h-5 w-5 text-amber-400" />
                选择项目目录
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-center text-sm text-zinc-400">
                指定您的工作目录，PromptBridge007 将在此目录下扫描和管理提示词。
              </p>
              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-300">
                  项目路径
                </label>
                <input
                  type="text"
                  value={projectPath}
                  onChange={(e) => setProjectPath(e.target.value)}
                  placeholder="留空则使用当前目录"
                  className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-200 placeholder-zinc-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div className="flex justify-between pt-2">
                <Button
                  variant="outline"
                  onClick={() => setStep(1)}
                  className="border-zinc-700 bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
                >
                  上一步
                </Button>
                <Button
                  onClick={() => setStep(3)}
                  className="gap-2 bg-blue-600 hover:bg-blue-700"
                >
                  下一步
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </>
        )}

        {/* Step 3: Scan Environment */}
        {step === 3 && (
          <>
            <CardHeader className="text-center">
              <CardTitle className="flex items-center justify-center gap-2 text-xl text-zinc-100">
                <ScanSearch className="h-5 w-5 text-green-400" />
                扫描您的环境
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-center">
              {scanning ? (
                <div className="flex flex-col items-center gap-3 py-6">
                  <Loader2 className="h-8 w-8 animate-spin text-blue-400" />
                  <p className="text-sm text-zinc-400">正在扫描已安装的 AI 工具...</p>
                </div>
              ) : scanResult ? (
                <div className="space-y-3 py-4">
                  <CheckCircle2 className="mx-auto h-10 w-10 text-green-400" />
                  <p className="text-sm text-zinc-300">扫描完成！</p>
                  <div className="flex justify-center gap-6 text-sm">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-400">{scanResult.toolsFound}</div>
                      <div className="text-zinc-500">发现文件</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-400">{scanResult.promptsFound}</div>
                      <div className="text-zinc-500">已导入</div>
                    </div>
                  </div>
                </div>
              ) : null}
              <div className="flex justify-between pt-2">
                <Button
                  variant="outline"
                  onClick={() => setStep(2)}
                  className="border-zinc-700 bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
                >
                  上一步
                </Button>
                <Button
                  onClick={() => setStep(4)}
                  disabled={scanning}
                  className="gap-2 bg-blue-600 hover:bg-blue-700"
                >
                  下一步
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </>
        )}

        {/* Step 4: All Set */}
        {step === 4 && (
          <>
            <CardHeader className="text-center">
              <CardTitle className="flex items-center justify-center gap-2 text-xl text-zinc-100">
                <CheckCircle2 className="h-5 w-5 text-green-400" />
                一切就绪！
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-center">
              <p className="text-zinc-400">
                您已成功配置 PromptBridge007。现在可以开始管理提示词、部署到各种 AI 工具。
              </p>
              <div className="rounded-lg border border-zinc-700 bg-zinc-800/50 p-4 text-left text-sm">
                <div className="mb-2 font-medium text-zinc-300">配置摘要</div>
                <div className="space-y-1 text-zinc-400">
                  <div>项目路径: {projectPath || '当前目录'}</div>
                  <div>扫描文件: {scanResult?.toolsFound ?? 0}</div>
                  <div>已导入: {scanResult?.promptsFound ?? 0}</div>
                </div>
              </div>
              <Button
                onClick={handleComplete}
                className="mt-2 gap-2 bg-blue-600 hover:bg-blue-700"
              >
                进入控制台
                <ArrowRight className="h-4 w-4" />
              </Button>
            </CardContent>
          </>
        )}
      </Card>
    </div>
  )
}
