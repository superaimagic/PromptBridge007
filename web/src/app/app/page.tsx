'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ScanSearch, Globe, Rocket, FileText, Wrench, Clock, FolderOpen } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { api } from '@/lib/api/client'

const ONBOARDING_KEY = 'pb007_onboarding_complete'

interface DashboardStats {
  totalPrompts: number
  deployedTools: number
  publicLibraryFiles: number
  lastSync: string | null
}

export default function AppDashboard() {
  const router = useRouter()
  const [stats, setStats] = useState<DashboardStats>({
    totalPrompts: 0,
    deployedTools: 0,
    publicLibraryFiles: 0,
    lastSync: null,
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Check onboarding status
    const onboardingComplete = localStorage.getItem(ONBOARDING_KEY)
    if (!onboardingComplete) {
      // Check if there are any projects/files
      api.getFiles({ page: 1, page_size: 1 }).then((res) => {
        const hasFiles = res.success && res.meta && res.meta.total > 0
        if (!hasFiles) {
          router.replace('/app/onboarding')
        }
      }).catch(() => {
        router.replace('/app/onboarding')
      })
    }
  }, [router])

  useEffect(() => {
    async function fetchStats() {
      try {
        const [filesRes, toolsRes, publicFilesRes, publicSourcesRes] = await Promise.allSettled([
          api.getFiles({ page: 1, page_size: 1 }),
          api.getTools(),
          api.getFiles({ library: 'public', page: 1, page_size: 1 }),
          api.getPublicSources(),
        ])

        setStats({
          totalPrompts:
            filesRes.status === 'fulfilled' && filesRes.value.success && filesRes.value.meta
              ? filesRes.value.meta.total
              : 0,
          deployedTools:
            toolsRes.status === 'fulfilled' && toolsRes.value.success && toolsRes.value.data
              ? toolsRes.value.data.length
              : 0,
          publicLibraryFiles:
            publicFilesRes.status === 'fulfilled' && publicFilesRes.value.success && publicFilesRes.value.meta
              ? publicFilesRes.value.meta.total
              : 0,
          lastSync:
            publicSourcesRes.status === 'fulfilled' && publicSourcesRes.value.success && publicSourcesRes.value.data
              ? publicSourcesRes.value.data
                  .filter((s) => s.last_sync_at)
                  .sort((a, b) => (b.last_sync_at || '').localeCompare(a.last_sync_at || ''))[0]
                  ?.last_sync_at || null
              : null,
        })
      } catch {
        // Silently fail - dashboard still shows with zeros
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
  }, [])

  const statCards = [
    {
      title: '提示词总数',
      value: stats.totalPrompts,
      icon: FileText,
      color: 'text-blue-400',
    },
    {
      title: '已部署工具',
      value: stats.deployedTools,
      icon: Wrench,
      color: 'text-green-400',
    },
    {
      title: '公共库文件',
      value: stats.publicLibraryFiles,
      icon: Globe,
      color: 'text-purple-400',
    },
    {
      title: '最近同步',
      value: stats.lastSync
        ? new Date(stats.lastSync).toLocaleString('zh-CN')
        : '暂无',
      icon: Clock,
      color: 'text-amber-400',
    },
  ]

  return (
    <div className="p-6 space-y-8">
      {/* Welcome */}
      <div>
        <h1 className="text-2xl font-bold text-zinc-100">欢迎使用 PromptBridge007</h1>
        <p className="mt-1 text-sm text-zinc-400">
          跨平台AI提示词管理系统 — 一次创建，处处部署
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((card) => {
          const Icon = card.icon
          return (
            <Card key={card.title} className="border-zinc-800 bg-zinc-900/50">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-zinc-400">
                  {card.title}
                </CardTitle>
                <Icon className={`h-4 w-4 ${card.color}`} />
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="h-7 w-20 animate-pulse rounded bg-zinc-800" />
                ) : (
                  <div className="text-2xl font-bold text-zinc-100">
                    {card.value}
                  </div>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="mb-4 text-lg font-semibold text-zinc-200">快捷操作</h2>
        <div className="flex flex-wrap gap-3">
          <Link href="/app/scan">
            <Button variant="outline" className="gap-2 border-zinc-700 bg-zinc-800 text-zinc-200 hover:bg-zinc-700 hover:text-zinc-100">
              <ScanSearch className="h-4 w-4" />
              扫描环境
            </Button>
          </Link>
          <Link href="/app/library/public">
            <Button variant="outline" className="gap-2 border-zinc-700 bg-zinc-800 text-zinc-200 hover:bg-zinc-700 hover:text-zinc-100">
              <Globe className="h-4 w-4" />
              浏览公共库
            </Button>
          </Link>
          <Link href="/app/deploy">
            <Button variant="outline" className="gap-2 border-zinc-700 bg-zinc-800 text-zinc-200 hover:bg-zinc-700 hover:text-zinc-100">
              <Rocket className="h-4 w-4" />
              部署提示词
            </Button>
          </Link>
          <Link href="/app/library/private">
            <Button variant="outline" className="gap-2 border-zinc-700 bg-zinc-800 text-zinc-200 hover:bg-zinc-700 hover:text-zinc-100">
              <FolderOpen className="h-4 w-4" />
              我的私有库
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
