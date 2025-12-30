import { cva, type VariantProps } from "class-variance-authority"
import { LoaderCircle } from "lucide-react"
import * as React from "react"
import { cn } from "@/lib/utils"

const loadingSpinnerContainerVariants = cva("flex flex-col items-center justify-center", {
    variants: {
        size: {
            sm: "min-h-[20vh]",
            default: "min-h-[40vh]",
            lg: "min-h-[50vh]",
            full: "min-h-screen",
        },
    },
    defaultVariants: {
        size: "default",
    },
})

const loadingSpinnerIconVariants = cva("animate-spin text-primary", {
    variants: {
        iconSize: {
            sm: "w-8 h-8",
            default: "w-10 h-10",
            lg: "w-12 h-12",
        },
    },
    defaultVariants: {
        iconSize: "default",
    },
})

const loadingSpinnerGlowVariants = cva(
    "absolute inset-0 rounded-full bg-primary/20 blur-xl animate-pulse",
    {
        variants: {
            glow: {
                true: "block",
                false: "hidden",
            },
        },
        defaultVariants: {
            glow: true,
        },
    }
)

export type LoadingSpinnerProps = React.HTMLAttributes<HTMLDivElement> &
    VariantProps<typeof loadingSpinnerContainerVariants> &
    VariantProps<typeof loadingSpinnerIconVariants> & {
        text?: string
        glow?: boolean
    }

const LoadingSpinner = React.forwardRef<HTMLDivElement, LoadingSpinnerProps>(
    ({ className, size, iconSize, text, glow = true, ...props }, ref) => {
        return (
            <div
                ref={ref}
                className={cn(loadingSpinnerContainerVariants({ size }), className)}
                {...props}
            >
                <div className="relative">
                    <div className={loadingSpinnerGlowVariants({ glow })} />
                    <LoaderCircle
                        className={cn(
                            "relative",
                            loadingSpinnerIconVariants({ iconSize })
                        )}
                    />
                </div>
                {text && <p className="mt-4 text-muted-foreground text-sm">{text}</p>}
            </div>
        )
    }
)
LoadingSpinner.displayName = "LoadingSpinner"

export { LoadingSpinner, loadingSpinnerContainerVariants }
