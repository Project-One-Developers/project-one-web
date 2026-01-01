import { cva, type VariantProps } from "class-variance-authority"
import * as React from "react"
import { cn } from "@/lib/utils"

const highlightBadgeVariants = cva(
    "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold w-fit shrink-0",
    {
        variants: {
            variant: {
                default: "bg-muted text-muted-foreground",
                dps: "bg-blue-500/20 text-blue-400",
                bis: "bg-green-500/20 text-green-400",
                tierset: "bg-purple-500/20 text-purple-400",
                upgrade: "bg-yellow-500/20 text-yellow-400",
                owned: "bg-muted text-muted-foreground",
                warning: "bg-orange-500/20 text-orange-400 border border-orange-500/30",
                main: "bg-amber-500/20 text-amber-400",
                note: "bg-blue-500/20 text-blue-400 border border-blue-500/30",
                primary: "bg-primary/20 text-primary",
            },
        },
        defaultVariants: {
            variant: "default",
        },
    }
)

export type HighlightBadgeProps = React.HTMLAttributes<HTMLSpanElement> &
    VariantProps<typeof highlightBadgeVariants> & {
        icon?: React.ReactNode
    }

const HighlightBadge = React.forwardRef<HTMLSpanElement, HighlightBadgeProps>(
    ({ className, variant, icon, children, ...props }, ref) => {
        return (
            <span
                ref={ref}
                className={cn(highlightBadgeVariants({ variant }), className)}
                {...props}
            >
                {icon}
                {children}
            </span>
        )
    }
)
HighlightBadge.displayName = "HighlightBadge"

export { HighlightBadge, highlightBadgeVariants }
