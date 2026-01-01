import "server-only"
import { playerRepo } from "@/db/repositories/player.repo"
import type {
    EditPlayer,
    NewPlayer,
    Player,
    PlayerWithCharacters,
} from "@/shared/models/character.model"

export const playerService = {
    getById: async (id: string): Promise<Player | null> => {
        return playerRepo.getById(id)
    },

    getWithCharactersList: async (): Promise<PlayerWithCharacters[]> => {
        return playerRepo.getWithCharactersList()
    },

    getWithoutCharacters: async (): Promise<Player[]> => {
        return playerRepo.getWithoutCharactersList()
    },

    add: async (player: NewPlayer): Promise<Player | null> => {
        const id = await playerRepo.add(player)
        return playerRepo.getById(id)
    },

    edit: async (edited: EditPlayer): Promise<Player | null> => {
        await playerRepo.edit(edited)
        return playerRepo.getById(edited.id)
    },

    delete: async (id: string): Promise<void> => {
        await playerRepo.delete(id)
    },
}
