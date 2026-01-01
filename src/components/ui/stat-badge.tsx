import { cva, type VariantProps } from "class-variance-authority"
import * as React from "react"
import { cn } from "@/lib/utils"

const statBadgeVariants = cva(
    "inline-flex items-center gap-2 px-4 py-2 backdrop-blur-sm rounded-full border text-sm",
    {
        variants: {
            variant: {
                default: "bg-card/30 border-border/30",
                primary: "bg-primary/10 border-primary/30",
                warning: "bg-orange-500/10 border-orange-500/30",
                success: "bg-green-500/10 border-green-500/30",
                info: "bg-blue-500/10 border-blue-500/30",
            },
        },
        defaultVariants: {
            variant: "default",
        },
    }
)

const statBadgeLabelVariants = cva("", {
    variants: {
        variant: {
            default: "text-muted-foreground",
            primary: "text-primary/80",
            warning: "text-orange-300/80",
            success: "text-green-300/80",
            info: "text-blue-300/80",
        },
    },
    defaultVariants: {
        variant: "default",
    },
})

const statBadgeValueVariants = cva("font-semibold", {
    variants: {
        variant: {
            default: "text-foreground",
            primary: "text-primary",
            warning: "text-orange-400",
            success: "text-green-400",
            info: "text-blue-400",
        },
    },
    defaultVariants: {
        variant: "default",
    },
})

export type StatBadgeProps = React.HTMLAttributes<HTMLDivElement> &
    VariantProps<typeof statBadgeVariants> & {
        icon?: React.ReactNode
        label: string
        value: React.ReactNode
    }

const StatBadge = React.forwardRef<HTMLDivElement, StatBadgeProps>(
    ({ className, variant, icon, label, value, ...props }, ref) => {
        return (
            <div
                ref={ref}
                className={cn(statBadgeVariants({ variant }), className)}
                {...props}
            >
                {icon && (
                    <span className="w-4 h-4 shrink-0 flex items-center justify-center">
                        {icon}
                    </span>
                )}
                <span className={statBadgeLabelVariants({ variant })}>{label}</span>
                <span className={statBadgeValueVariants({ variant })}>{value}</span>
            </div>
        )
    }
)
StatBadge.displayName = "StatBadge"

export { StatBadge, statBadgeVariants }
