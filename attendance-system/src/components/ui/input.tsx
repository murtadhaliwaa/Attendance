import * as React from "react"
import { Input as InputPrimitive } from "@base-ui/react/input"

import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <InputPrimitive
      type={type}
      data-slot="input"
      className={cn(
        "box-border w-full min-w-0 rounded-lg border border-bg-border bg-bg-elevated px-2.5 text-sm text-text-primary transition-colors outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium file:leading-7 placeholder:text-text-secondary placeholder:opacity-100 focus-visible:border-blue-primary focus-visible:ring-3 focus-visible:ring-blue-primary/30 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-status-absent aria-invalid:ring-3 aria-invalid:ring-status-absent/20",
        className
      )}
      {...props}
    />
  )
}

export { Input }
