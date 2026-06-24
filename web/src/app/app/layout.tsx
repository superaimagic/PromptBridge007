'use client'

import { useState } from 'react'
import AppSidebar from '@/components/app/AppSidebar'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false)
  return (
    <div className="flex h-screen overflow-hidden bg-zinc-950">
      <AppSidebar collapsed={collapsed} onToggle={() => setCollapsed(!collapsed)} />
      <main className="flex-1 overflow-auto bg-zinc-900 text-zinc-100">
        {children}
      </main>
    </div>
  )
}
