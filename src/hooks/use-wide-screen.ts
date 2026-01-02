import * as React from "react"

// Breakpoint for "wide" screens (100% scaling on 2K monitors is ~2560px)
// 125% scaling on 2K is ~2048px, so 2200px is a good threshold
const WIDE_SCREEN_BREAKPOINT = 2200

export function useIsWideScreen() {
    const [isWide, setIsWide] = React.useState<boolean | undefined>(undefined)

    React.useEffect(() => {
        const mql = window.matchMedia(`(min-width: ${String(WIDE_SCREEN_BREAKPOINT)}px)`)
        const onChange = () => {
            setIsWide(window.innerWidth >= WIDE_SCREEN_BREAKPOINT)
        }
        mql.addEventListener("change", onChange)
        setIsWide(window.innerWidth >= WIDE_SCREEN_BREAKPOINT)
        return () => {
            mql.removeEventListener("change", onChange)
        }
    }, [])

    return isWide
}
