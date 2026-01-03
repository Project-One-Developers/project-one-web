import { ExternalLink, FileSpreadsheet } from "lucide-react"
import { notFound } from "next/navigation"
import { getSpreadsheetLinkById } from "@/actions/spreadsheet-links"
import { Button } from "@/components/ui/button"
import { GlassCard } from "@/components/ui/glass-card"
import { iconButtonVariants } from "@/components/ui/icon-button"

type SpreadsheetPageProps = {
    params: Promise<{ id: string }>
}

const SHEETS_REGEX = /docs\.google\.com\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/
const DOCS_REGEX = /docs\.google\.com\/document\/d\/([a-zA-Z0-9_-]+)/

/**
 * Converts a Google Sheets URL to an embeddable format.
 * If not a Google Sheets URL, returns null (not embeddable).
 */
function toEmbedUrl(url: string): string | null {
    // Match Google Sheets URLs
    const sheetsMatch = SHEETS_REGEX.exec(url)
    if (sheetsMatch?.[1]) {
        return `https://docs.google.com/spreadsheets/d/${sheetsMatch[1]}/edit?usp=sharing&embedded=true`
    }

    // Match Google Docs URLs
    const docsMatch = DOCS_REGEX.exec(url)
    if (docsMatch?.[1]) {
        return `https://docs.google.com/document/d/${docsMatch[1]}/preview`
    }

    return null
}

export default async function SpreadsheetPage({ params }: SpreadsheetPageProps) {
    const { id } = await params
    const spreadsheet = await getSpreadsheetLinkById(id)

    if (!spreadsheet) {
        notFound()
    }

    const embedUrl = toEmbedUrl(spreadsheet.url)

    if (!embedUrl) {
        return (
            <div className="w-full h-full flex items-center justify-center p-4">
                <GlassCard
                    padding="xl"
                    className="flex flex-col items-center justify-center gap-4 max-w-md"
                >
                    <FileSpreadsheet className="w-16 h-16 text-muted-foreground" />
                    <p className="text-muted-foreground text-center">
                        This URL cannot be embedded directly.
                        <br />
                        Only Google Sheets and Docs are supported for embedding.
                    </p>
                    <Button asChild>
                        <a href={spreadsheet.url} target="_blank" rel="noreferrer">
                            <ExternalLink className="w-4 h-4 mr-2" />
                            Open in new tab
                        </a>
                    </Button>
                </GlassCard>
            </div>
        )
    }

    return (
        <div className="w-full h-screen relative">
            <a
                href={spreadsheet.url}
                target="_blank"
                rel="noreferrer"
                className={iconButtonVariants({ variant: "default", size: "sm" })}
                style={{ position: "absolute", bottom: 12, left: 12, zIndex: 10 }}
                title="Open in new tab"
            >
                <ExternalLink className="w-4 h-4" />
            </a>
            <iframe src={embedUrl} className="w-full h-full" title={spreadsheet.title} />
        </div>
    )
}
