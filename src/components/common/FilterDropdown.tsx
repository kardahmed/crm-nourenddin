import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface FilterOption {
  value: string
  label: string
}

interface FilterDropdownProps {
  label: string
  options: FilterOption[]
  value: string
  onChange: (value: string) => void
}

export function FilterDropdown({ label, options, value, onChange }: FilterDropdownProps) {
  return (
    <Select value={value} onValueChange={(v) => { if (v) onChange(v) }}>
      <SelectTrigger className="h-9 w-[180px] border-immo-border-default bg-immo-bg-primary text-sm text-immo-text-primary focus:ring-immo-accent-green">
        <SelectValue placeholder={label} />
      </SelectTrigger>
      <SelectContent className="border-immo-border-default bg-immo-bg-card">
        {options.map((opt) => (
          <SelectItem
            key={opt.value}
            value={opt.value}
            className="text-sm text-immo-text-primary focus:bg-immo-bg-card-hover focus:text-immo-text-primary"
          >
            {opt.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
