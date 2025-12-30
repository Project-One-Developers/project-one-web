import { cva, type VariantProps } from "class-variance-authority"
import * as React from "react"
import { cn } from "@/lib/utils"

const glassCardVariants = cva("backdrop-blur-sm border transition-all duration-300", {
    variants: {
        variant: {
            default: "bg-card/40 border-border/40",
            solid: "bg-card/60 border-border/50",
            subtle: "bg-card/30 border-border/30",
        },
        interactive: {
            true: "hover:border-primary/30 hover:bg-card/60 hover:shadow-lg hover:shadow-primary/5 cursor-pointer",
            false: "",
        },
        padding: {
            none: "p-0",
            sm: "p-3",
            default: "p-4",
            lg: "p-5",
            xl: "p-6",
        },
        rounded: {
            default: "rounded-2xl",
            lg: "rounded-xl",
            md: "rounded-lg",
            full: "rounded-full",
        },
    },
    defaultVariants: {
        variant: "default",
        interactive: false,
        padding: "default",
        rounded: "default",
    },
})

export type GlassCardProps = React.HTMLAttributes<HTMLDivElement> &
    VariantProps<typeof glassCardVariants> & {
        asChild?: boolean
    }

const GlassCard = React.forwardRef<HTMLDivElement, GlassCardProps>(
    ({ className, variant, interactive, padding, rounded, ...props }, ref) => {
        return (
            <div
                ref={ref}
                className={cn(
                    glassCardVariants({ variant, interactive, padding, rounded }),
                    className
                )}
                {...props}
            />
        )
    }
)
GlassCard.displayName = "GlassCard"

export { GlassCard, glassCardVariants }
