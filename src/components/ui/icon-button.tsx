import { cva, type VariantProps } from "class-variance-authority"
import * as React from "react"
import { cn } from "@/lib/utils"

const iconButtonVariants = cva(
    "inline-flex items-center justify-center transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 disabled:pointer-events-none disabled:opacity-50",
    {
        variants: {
            variant: {
                default:
                    "bg-card/50 border border-border/50 hover:bg-card hover:border-primary/30",
                ghost: "hover:bg-accent/50",
                destructive: "hover:bg-destructive/10 hover:text-destructive",
                primary:
                    "bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/25",
                secondary:
                    "bg-card/50 border border-border/50 hover:bg-primary/10 hover:border-primary/30 hover:text-primary",
            },
            size: {
                sm: "w-8 h-8 rounded-lg",
                default: "w-10 h-10 rounded-xl",
                lg: "w-12 h-12 rounded-xl",
            },
        },
        defaultVariants: {
            variant: "default",
            size: "default",
        },
    }
)

const iconButtonIconVariants = cva("transition-transform group-hover:scale-110", {
    variants: {
        size: {
            sm: "w-4 h-4",
            default: "w-4 h-4",
            lg: "w-5 h-5",
        },
    },
    defaultVariants: {
        size: "default",
    },
})

export type IconButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> &
    VariantProps<typeof iconButtonVariants> & {
        icon: React.ReactNode
    }

const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(
    ({ className, variant, size, icon, ...props }, ref) => {
        return (
            <button
                ref={ref}
                className={cn("group", iconButtonVariants({ variant, size }), className)}
                {...props}
            >
                <span className={iconButtonIconVariants({ size })}>{icon}</span>
            </button>
        )
    }
)
IconButton.displayName = "IconButton"

export { IconButton, iconButtonVariants }
