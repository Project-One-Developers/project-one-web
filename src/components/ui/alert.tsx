import { cva, type VariantProps } from "class-variance-authority"
import * as React from "react"
import { cn } from "@/lib/utils"

const alertVariants = cva(
    "relative w-full rounded-xl border p-4 backdrop-blur-sm flex gap-3",
    {
        variants: {
            variant: {
                default: "bg-card/40 border-border/40 text-foreground",
                info: "bg-blue-500/10 border-blue-500/30 text-blue-400",
                warning: "bg-orange-500/10 border-orange-500/30 text-orange-400",
                destructive: "bg-red-500/10 border-red-500/30 text-red-400",
                success: "bg-green-500/10 border-green-500/30 text-green-400",
            },
        },
        defaultVariants: {
            variant: "default",
        },
    }
)

export type AlertProps = React.HTMLAttributes<HTMLDivElement> &
    VariantProps<typeof alertVariants>

const Alert = React.forwardRef<HTMLDivElement, AlertProps>(
    ({ className, variant, ...props }, ref) => (
        <div
            ref={ref}
            role="alert"
            className={cn(alertVariants({ variant }), className)}
            {...props}
        />
    )
)
Alert.displayName = "Alert"

// Icon wrapper - shrinks to fit icon, stays at top
const AlertIcon = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
    ({ className, ...props }, ref) => (
        <div ref={ref} className={cn("shrink-0 mt-0.5", className)} {...props} />
    )
)
AlertIcon.displayName = "AlertIcon"

// Content wrapper - stacks title and description vertically
const AlertContent = React.forwardRef<
    HTMLDivElement,
    React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
    <div ref={ref} className={cn("flex-1 space-y-1", className)} {...props} />
))
AlertContent.displayName = "AlertContent"

const AlertTitle = React.forwardRef<
    HTMLParagraphElement,
    React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
    <h5 ref={ref} className={cn("font-medium leading-tight", className)} {...props} />
))
AlertTitle.displayName = "AlertTitle"

const AlertDescription = React.forwardRef<
    HTMLParagraphElement,
    React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
    <p
        ref={ref}
        className={cn("text-sm opacity-80 leading-relaxed", className)}
        {...props}
    />
))
AlertDescription.displayName = "AlertDescription"

export { Alert, AlertIcon, AlertContent, AlertTitle, AlertDescription, alertVariants }
