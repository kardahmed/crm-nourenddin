import type { ReactNode } from 'react'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from './EmptyState'
import { Inbox } from 'lucide-react'

export interface Column<T> {
  key: string
  header: string
  render: (row: T) => ReactNode
  className?: string
}

interface DataTableProps<T> {
  columns: Column<T>[]
  data: T[]
  loading?: boolean
  emptyMessage?: string
  emptyIcon?: ReactNode
  rowKey: (row: T) => string
  onRowClick?: (row: T) => void
}

export function DataTable<T>({
  columns,
  data,
  loading = false,
  emptyMessage = 'Aucune donnée',
  emptyIcon,
  rowKey,
  onRowClick,
}: DataTableProps<T>) {
  if (loading) {
    return (
      <div className="overflow-hidden rounded-xl border border-immo-border-default">
        {/* Header skeleton */}
        <div className="flex gap-4 bg-immo-bg-card-hover px-4 py-3">
          {columns.map((col) => (
            <Skeleton key={col.key} className="h-3 w-24 bg-immo-border-default" />
          ))}
        </div>
        {/* Row skeletons */}
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="flex gap-4 border-t border-immo-border-default bg-immo-bg-card px-4 py-4"
          >
            {columns.map((col) => (
              <Skeleton key={col.key} className="h-4 w-28 bg-immo-border-default/50" />
            ))}
          </div>
        ))}
      </div>
    )
  }

  if (data.length === 0) {
    return (
      <div className="overflow-hidden rounded-xl border border-immo-border-default bg-immo-bg-card">
        <EmptyState
          icon={emptyIcon ?? <Inbox className="h-10 w-10" />}
          title={emptyMessage}
          description="Aucun élément ne correspond à vos critères"
        />
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-xl border border-immo-border-default">
      <table className="w-full">
        <thead>
          <tr className="bg-immo-bg-card-hover">
            {columns.map((col) => (
              <th
                key={col.key}
                className={`px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-immo-text-muted ${col.className ?? ''}`}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row) => (
            <tr
              key={rowKey(row)}
              onClick={() => onRowClick?.(row)}
              className={`border-t border-immo-border-default bg-immo-bg-card transition-colors hover:bg-immo-bg-card-hover ${
                onRowClick ? 'cursor-pointer' : ''
              }`}
            >
              {columns.map((col) => (
                <td
                  key={col.key}
                  className={`px-4 py-3.5 text-sm text-immo-text-primary ${col.className ?? ''}`}
                >
                  {col.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
