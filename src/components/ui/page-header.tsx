import { ArrowLeft } from "lucide-react"
import { useRouter } from "next/navigation"
import * as React from "react"
import { cn } from "@/lib/utils"
import { GlassCard } from "./glass-card"
import { IconButton } from "./icon-button"

export type PageHeaderProps = React.HTMLAttributes<HTMLDivElement> & {
    /** Show back button that calls router.back() */
    showBack?: boolean
    /** Custom back handler (overrides default router.back()) */
    onBack?: () => void
}

const PageHeader = React.forwardRef<HTMLDivElement, PageHeaderProps>(
    ({ className, showBack, onBack, children, ...props }, ref) => {
        const router = useRouter()

        const handleBack = () => {
            if (onBack) {
                onBack()
            } else {
                router.back()
            }
        }

        return (
            <GlassCard
                ref={ref}
                padding="default"
                className={cn(
                    "flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shrink-0",
                    className
                )}
                {...props}
            >
                <div className="flex items-center gap-4">
                    {showBack && (
                        <IconButton
                            icon={<ArrowLeft className="w-4 h-4" />}
                            onClick={handleBack}
                            variant="default"
                        />
                    )}
                    {children}
                </div>
            </GlassCard>
        )
    }
)
PageHeader.displayName = "PageHeader"

// Sub-components for flexible composition
const PageHeaderContent = React.forwardRef<
    HTMLDivElement,
    React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
    <div ref={ref} className={cn("flex items-center gap-4", className)} {...props} />
))
PageHeaderContent.displayName = "PageHeaderContent"

const PageHeaderTitle = React.forwardRef<
    HTMLDivElement,
    React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
    <div ref={ref} className={cn("flex flex-col", className)} {...props} />
))
PageHeaderTitle.displayName = "PageHeaderTitle"

const PageHeaderActions = React.forwardRef<
    HTMLDivElement,
    React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
    <div
        ref={ref}
        className={cn("flex items-center gap-2 w-full sm:w-auto", className)}
        {...props}
    />
))
PageHeaderActions.displayName = "PageHeaderActions"

const PageHeaderDivider = React.forwardRef<
    HTMLDivElement,
    React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
    <div
        ref={ref}
        className={cn("hidden sm:block h-10 w-px bg-border/50 mx-2", className)}
        {...props}
    />
))
PageHeaderDivider.displayName = "PageHeaderDivider"

export {
    PageHeader,
    PageHeaderContent,
    PageHeaderTitle,
    PageHeaderActions,
    PageHeaderDivider,
}
