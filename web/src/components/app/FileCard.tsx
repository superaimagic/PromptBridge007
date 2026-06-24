'use client';

import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TagBadges } from './TagBadges';
import type { FileItem } from '@/lib/api/client';

interface FileCardProps {
  file: FileItem;
  extra?: React.ReactNode;
}

export function FileCard({ file, extra }: FileCardProps) {
  return (
    <Link href={`/app/files/${file.id}`}>
      <Card className="bg-zinc-900 border-zinc-800 hover:border-zinc-600 transition-colors cursor-pointer h-full">
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-2 mb-2">
            <h3 className="font-medium text-zinc-100 truncate flex-1" title={file.name}>
              {file.name}
            </h3>
            <Badge variant="outline" className="text-xs shrink-0 bg-zinc-800 text-zinc-400 border-zinc-700">
              {file.license}
            </Badge>
          </div>

          <TagBadges tags={file.tags} maxDisplay={5} />

          <div className="flex items-center gap-3 mt-3 text-xs text-zinc-500">
            <span>📦 {file.install_count}</span>
            <span>⭐ {file.rating > 0 ? file.rating.toFixed(1) : '-'}</span>
            <span className="ml-auto">
              {new Date(file.updated_at).toLocaleDateString('zh-CN')}
            </span>
          </div>

          {extra}
        </CardContent>
      </Card>
    </Link>
  );
}
