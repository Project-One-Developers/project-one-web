import { ChevronDown, ChevronUp } from "lucide-react"
import * as React from "react"
import { cn } from "@/lib/utils"

type NumberInputBaseProps = Omit<
    React.ComponentProps<"input">,
    "type" | "onChange" | "value"
> & {
    min?: number
    max?: number
    step?: number
    suffix?: string
}

type RequiredNumberInputProps = NumberInputBaseProps & {
    allowEmpty?: false
    value: number
    onChange: (value: number) => void
}

type OptionalNumberInputProps = NumberInputBaseProps & {
    allowEmpty: true
    value: number | undefined
    onChange: (value: number | undefined) => void
}

export type NumberInputProps = RequiredNumberInputProps | OptionalNumberInputProps

function NumberInput(props: NumberInputProps) {
    const {
        className,
        value,
        onChange,
        min,
        max,
        step = 1,
        suffix,
        allowEmpty,
        disabled,
        ...rest
    } = props

    // Internal state to allow free typing without immediate validation
    const [inputValue, setInputValue] = React.useState<string>(
        value !== undefined ? String(value) : ""
    )

    // Sync internal state when external value changes
    React.useEffect(() => {
        setInputValue(value !== undefined ? String(value) : "")
    }, [value])

    const clamp = (val: number) => {
        let clamped = val
        if (min !== undefined) {
            clamped = Math.max(min, clamped)
        }
        if (max !== undefined) {
            clamped = Math.min(max, clamped)
        }
        return clamped
    }

    const commitValue = (val: string) => {
        // Empty case
        if (val === "") {
            if (allowEmpty) {
                ;(onChange as (v: number | undefined) => void)(undefined)
            } else {
                // Revert to previous value
                setInputValue(String(value))
            }
            return
        }

        const parsed = parseFloat(val)
        if (isNaN(parsed)) {
            // Invalid input - revert
            setInputValue(value !== undefined ? String(value) : "")
            return
        }

        const clamped = clamp(parsed)
        setInputValue(String(clamped))
        if (allowEmpty) {
            ;(onChange as (v: number | undefined) => void)(clamped)
        } else {
            ;(onChange as (v: number) => void)(clamped)
        }
    }

    const increment = () => {
        if (disabled) {
            return
        }
        const base = value ?? min ?? 0
        const clamped = clamp(base + step)
        if (allowEmpty) {
            ;(onChange as (v: number | undefined) => void)(clamped)
        } else {
            ;(onChange as (v: number) => void)(clamped)
        }
    }

    const decrement = () => {
        if (disabled) {
            return
        }
        const base = value ?? min ?? 0
        const clamped = clamp(base - step)
        if (allowEmpty) {
            ;(onChange as (v: number | undefined) => void)(clamped)
        } else {
            ;(onChange as (v: number) => void)(clamped)
        }
    }

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setInputValue(e.target.value)
    }

    const handleBlur = () => {
        commitValue(inputValue)
    }

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "ArrowUp") {
            e.preventDefault()
            increment()
        } else if (e.key === "ArrowDown") {
            e.preventDefault()
            decrement()
        } else if (e.key === "Enter") {
            commitValue(inputValue)
        }
    }

    return (
        <div className="relative flex items-center">
            <input
                type="number"
                inputMode="numeric"
                data-slot="number-input"
                value={inputValue}
                onChange={handleInputChange}
                onBlur={handleBlur}
                onKeyDown={handleKeyDown}
                min={min}
                max={max}
                step={step}
                disabled={disabled}
                className={cn(
                    "file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground dark:bg-input/30 border-input h-9 w-full min-w-0 rounded-md border bg-transparent px-3 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
                    "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
                    "aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
                    "[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none",
                    suffix ? "pr-16" : "pr-8",
                    className
                )}
                {...rest}
            />
            {suffix && (
                <span className="absolute right-7 text-sm text-muted-foreground">
                    {suffix}
                </span>
            )}
            <div className="absolute right-0 flex h-full flex-col border-l border-input">
                <button
                    type="button"
                    tabIndex={-1}
                    onClick={increment}
                    disabled={
                        disabled ||
                        (max !== undefined && value !== undefined && value >= max)
                    }
                    className="flex h-1/2 w-6 items-center justify-center rounded-tr-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:pointer-events-none disabled:opacity-50"
                    aria-label="Increment"
                >
                    <ChevronUp className="size-3" />
                </button>
                <button
                    type="button"
                    tabIndex={-1}
                    onClick={decrement}
                    disabled={
                        disabled ||
                        (min !== undefined && value !== undefined && value <= min)
                    }
                    className="flex h-1/2 w-6 items-center justify-center rounded-br-md border-t border-input text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:pointer-events-none disabled:opacity-50"
                    aria-label="Decrement"
                >
                    <ChevronDown className="size-3" />
                </button>
            </div>
        </div>
    )
}

export { NumberInput }
