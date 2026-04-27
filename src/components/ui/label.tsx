import * as React from "react"

import { cn } from "@/lib/utils"

// Field wires a Label and a control together via a generated id so screen
// readers can announce the label when the control gets focus. Wrap a
// Label + Input/Select/etc and the Field will inject htmlFor / id
// automatically. Existing forms keep working untouched.
const FieldContext = React.createContext<string | null>(null)

function Field({ id, children, className }: { id?: string; className?: string; children: React.ReactNode }) {
  const generatedId = React.useId()
  const value = id ?? generatedId
  return (
    <FieldContext.Provider value={value}>
      <div className={className}>{children}</div>
    </FieldContext.Provider>
  )
}

function useFieldId(): string | null {
  return React.useContext(FieldContext)
}

function Label({ className, htmlFor, ...props }: React.ComponentProps<"label">) {
  const fieldId = useFieldId()
  return (
    <label
      data-slot="label"
      htmlFor={htmlFor ?? fieldId ?? undefined}
      className={cn(
        "flex items-center gap-2 text-sm leading-none font-medium select-none group-data-[disabled=true]:pointer-events-none group-data-[disabled=true]:opacity-50 peer-disabled:cursor-not-allowed peer-disabled:opacity-50",
        className
      )}
      {...props}
    />
  )
}

export { Label, Field, useFieldId }
