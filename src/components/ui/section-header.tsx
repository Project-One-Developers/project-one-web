import * as React from "react"
import { cn } from "@/lib/utils"

export type SectionHeaderProps = React.HTMLAttributes<HTMLHeadingElement> & {
    as?: "h2" | "h3" | "h4" | "h5" | "h6"
}

const SectionHeader = React.forwardRef<HTMLHeadingElement, SectionHeaderProps>(
    ({ className, as: Component = "h4", ...props }, ref) => (
        <Component
            ref={ref}
            className={cn(
                "text-xs font-medium text-muted-foreground uppercase tracking-wider",
                className
            )}
            {...props}
        />
    )
)
SectionHeader.displayName = "SectionHeader"

export { SectionHeader }
