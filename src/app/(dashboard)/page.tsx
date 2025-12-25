import Image from "next/image"
import type { JSX } from "react"

export default function HomePage(): JSX.Element {
    return (
        <div className="flex flex-col items-center w-full justify-center mt-10 mb-10">
            <div>
                <Image
                    className="ml-auto mr-auto"
                    src="/logo.png"
                    alt="Project One Logo"
                    width={256}
                    height={256}
                    priority
                />
            </div>
        </div>
    )
}
