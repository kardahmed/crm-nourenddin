import { format } from 'date-fns'

interface CsvColumn<T> {
  header: string
  value: (row: T) => string | number | null | undefined
}

export function exportToCsv<T>(
  filename: string,
  data: T[],
  columns: CsvColumn<T>[],
) {
  const headers = columns.map(c => c.header)
  const rows = data.map(row =>
    columns.map(c => {
      const val = c.value(row)
      if (val == null) return ''
      const str = String(val)
      // Escape quotes and wrap if contains comma/quote/newline
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`
      }
      return str
    })
  )

  const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n')
  const BOM = '\uFEFF' // UTF-8 BOM for Excel compatibility
  const blob = new Blob([BOM + csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${filename}-${format(new Date(), 'yyyyMMdd-HHmm')}.csv`
  a.click()
  URL.revokeObjectURL(url)
}
