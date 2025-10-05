"use client"

import * as React from "react"
import * as LabelPrimitive from "@radix-ui/react-label"

import { cn } from "@/lib/utils"

function Label({ className, children, ...props }: React.ComponentProps<typeof LabelPrimitive.Root>) {
  const renderChildren = () => {
    if (typeof children === "string" || typeof children === "number") {
      return children
    }
    if (React.isValidElement(children)) {
      return children
    }
    if (typeof children === "object" && children !== null) {
      if (Array.isArray(children)) {
        return children.map((child, index) => (
          <span key={index}>{typeof child === "object" ? "[Object]" : String(child)}</span>
        ))
      }
      // For plain objects, try to extract meaningful text properties
      if (children.hasOwnProperty("text")) {
        return String(children.text)
      }
      if (children.hasOwnProperty("key") && children.hasOwnProperty("text")) {
        return `${children.key}. ${children.text}`
      }
      // Fallback for other objects
      return "[Object]"
    }
    return children
  }

  return (
    <LabelPrimitive.Root
      data-slot="label"
      className={cn(
        "flex items-center gap-2 text-sm leading-none font-medium select-none group-data-[disabled=true]:pointer-events-none group-data-[disabled=true]:opacity-50 peer-disabled:cursor-not-allowed peer-disabled:opacity-50",
        className,
      )}
      {...props}
    >
      {renderChildren()}
    </LabelPrimitive.Root>
  )
}

export { Label }
