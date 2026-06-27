'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  ScanSearch,
  FolderOpen,
  Globe,
  Rocket,
  RefreshCw,
  Settings,
  ShieldCheck,
  ChevronsLeft,
  ChevronsRight,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/tooltip'
import { Separator } from '@/components/ui/separator'

interface NavItem {
  label: string
  href: string
  icon: React.ElementType
}

const navItems: NavItem[] = [
  { label: '环境扫描', href: '/app/scan', icon: ScanSearch },
  { label: '私有库', href: '/app/library/private', icon: FolderOpen },
  { label: '公共库', href: '/app/library/public', icon: Globe },
  { label: '部署中心', href: '/app/deploy', icon: Rocket },
  { label: '同步管理', href: '/app/sync', icon: RefreshCw },
]

const bottomNavItems: NavItem[] = [
  { label: '管理后台', href: '/app/admin', icon: ShieldCheck },
  { label: '设置', href: '/app/settings', icon: Settings },
]

interface AppSidebarProps {
  collapsed: boolean
  onToggle: () => void
}

export default function AppSidebar({ collapsed, onToggle }: AppSidebarProps) {
  const pathname = usePathname()

  return (
    <TooltipProvider delay={0}>
      <aside
        className={cn(
          'flex h-screen flex-col border-r border-zinc-800 bg-zinc-950 transition-all duration-300 ease-in-out',
          collapsed ? 'w-16' : 'w-64'
        )}
      >
        {/* Logo Area */}
        <div className="flex h-14 items-center gap-2 px-4">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary font-bold text-primary-foreground text-sm">
            PB
          </div>
          {!collapsed && (
            <div className="flex flex-col overflow-hidden">
              <span className="text-sm font-bold text-zinc-100 truncate">PB007</span>
              <span className="text-[10px] text-zinc-500 truncate">词桥007</span>
            </div>
          )}
        </div>

        <Separator className="bg-zinc-800" />

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-2">
          <ul className="space-y-1 px-2">
            {navItems.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
              const Icon = item.icon

              const linkElement = (
                <Link
                  href={item.href}
                  className={cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
                    isActive
                      ? 'bg-zinc-800 text-zinc-100'
                      : 'text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200',
                    collapsed && 'justify-center px-0'
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  {!collapsed && <span className="truncate">{item.label}</span>}
                </Link>
              )

              if (collapsed) {
                return (
                  <li key={item.href}>
                    <Tooltip>
                      <TooltipTrigger render={linkElement} />
                      <TooltipContent side="right">{item.label}</TooltipContent>
                    </Tooltip>
                  </li>
                )
              }

              return <li key={item.href}>{linkElement}</li>
            })}
          </ul>
        </nav>

        <Separator className="bg-zinc-800" />

        {/* Bottom Navigation */}
        <div className="py-2">
          <ul className="space-y-1 px-2">
            {bottomNavItems.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
              const Icon = item.icon

              const linkElement = (
                <Link
                  href={item.href}
                  className={cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
                    isActive
                      ? 'bg-zinc-800 text-zinc-100'
                      : 'text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200',
                    collapsed && 'justify-center px-0'
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  {!collapsed && <span className="truncate">{item.label}</span>}
                </Link>
              )

              if (collapsed) {
                return (
                  <li key={item.href}>
                    <Tooltip>
                      <TooltipTrigger render={linkElement} />
                      <TooltipContent side="right">{item.label}</TooltipContent>
                    </Tooltip>
                  </li>
                )
              }

              return <li key={item.href}>{linkElement}</li>
            })}
          </ul>
        </div>

        {/* Collapse Toggle */}
        <div className="border-t border-zinc-800 p-2">
          <button
            onClick={onToggle}
            className={cn(
              'flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-zinc-400 transition-colors hover:bg-zinc-800/50 hover:text-zinc-200',
              collapsed && 'justify-center px-0'
            )}
          >
            {collapsed ? (
              <ChevronsRight className="h-4 w-4 shrink-0" />
            ) : (
              <>
                <ChevronsLeft className="h-4 w-4 shrink-0" />
                <span className="truncate">收起侧栏</span>
              </>
            )}
          </button>
        </div>
      </aside>
    </TooltipProvider>
  )
}
