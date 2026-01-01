import Image from "next/image"
import { match } from "ts-pattern"
import type { Character } from "@/shared/models/character.models"
import { realmNameToSlug } from "@/shared/wow.consts"

type WowCharacterLinkProps = {
    character: Character
    site: "raiderio" | "warcraftlogs" | "armory"
}

export const WowCharacterLink = ({ character, site }: WowCharacterLinkProps) => {
    const realmSlug = realmNameToSlug(character.realm)

    const href = match(site)
        .with(
            "warcraftlogs",
            () =>
                `https://www.warcraftlogs.com/character/eu/${realmSlug}/${character.name}?private=1`
        )
        .with(
            "raiderio",
            () => `https://raider.io/characters/eu/${realmSlug}/${character.name}`
        )
        .with(
            "armory",
            () =>
                `https://worldofwarcraft.blizzard.com/en-gb/character/eu/${realmSlug}/${character.name}`
        )
        .exhaustive()

    const iconSrc = match(site)
        .with(
            "warcraftlogs",
            () => "https://assets.rpglogs.com/img/warcraft/favicon.png?v=2"
        )
        .with("raiderio", () => "https://cdn.raiderio.net/images/mstile-150x150.png")
        .with(
            "armory",
            () =>
                "https://cdn.raiderio.net/assets/img/wow-icon-a718385c1d75ca9edbb3eed0a5546c30.png"
        )
        .exhaustive()

    return (
        <a href={href} rel="noreferrer" target="_blank">
            <Image
                src={iconSrc}
                alt={site}
                width={20}
                height={20}
                className="cursor-pointer"
            />
        </a>
    )
}
