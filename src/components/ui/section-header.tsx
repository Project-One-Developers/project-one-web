import * as React from "react"
import { cn } from "@/lib/utils"

export type SectionHeaderProps = React.HTMLAttributes<HTMLHeadingElement> & {
    as?: "h2" | "h3" | "h4" | "h5" | "h6"
    icon?: React.ReactNode
}

const SectionHeader = React.forwardRef<HTMLHeadingElement, SectionHeaderProps>(
    ({ className, as: Component = "h4", icon, children, ...props }, ref) => (
        <Component
            ref={ref}
            className={cn(
                "text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-2",
                className
            )}
            {...props}
        >
            {icon}
            {children}
        </Component>
    )
)
SectionHeader.displayName = "SectionHeader"

export { SectionHeader }
