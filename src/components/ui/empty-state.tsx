import { cva, type VariantProps } from "class-variance-authority"
import * as React from "react"
import { cn } from "@/lib/utils"

const emptyStateVariants = cva("flex flex-col items-center justify-center text-center", {
    variants: {
        size: {
            sm: "py-8",
            default: "py-16",
            lg: "py-24",
            full: "min-h-[50vh]",
        },
    },
    defaultVariants: {
        size: "default",
    },
})

const emptyStateIconVariants = cva("flex items-center justify-center mb-4 bg-muted/50", {
    variants: {
        size: {
            sm: "w-12 h-12 rounded-xl",
            default: "w-16 h-16 rounded-2xl",
            lg: "w-20 h-20 rounded-2xl",
            full: "w-16 h-16 rounded-2xl",
        },
    },
    defaultVariants: {
        size: "default",
    },
})

export type EmptyStateProps = React.HTMLAttributes<HTMLDivElement> &
    VariantProps<typeof emptyStateVariants> & {
        icon?: React.ReactNode
        title: string
        description?: string
        action?: React.ReactNode
    }

const EmptyState = React.forwardRef<HTMLDivElement, EmptyStateProps>(
    ({ className, size, icon, title, description, action, ...props }, ref) => {
        return (
            <div
                ref={ref}
                className={cn(emptyStateVariants({ size }), className)}
                {...props}
            >
                {icon && (
                    <div className={emptyStateIconVariants({ size })}>
                        <span className="text-muted-foreground/50">{icon}</span>
                    </div>
                )}
                <h3 className="text-lg font-medium mb-1">{title}</h3>
                {description && (
                    <p className="text-sm text-muted-foreground max-w-sm">
                        {description}
                    </p>
                )}
                {action && <div className="mt-4">{action}</div>}
            </div>
        )
    }
)
EmptyState.displayName = "EmptyState"

export { EmptyState, emptyStateVariants }
