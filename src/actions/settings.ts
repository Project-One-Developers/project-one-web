"use server"

import { settingsRepo } from "@/db/repositories/settings"

export async function getConfig(key: string): Promise<string | null> {
    return await settingsRepo.get(key)
}

export async function setConfig(key: string, value: string): Promise<void> {
    await settingsRepo.set(key, value)
}

export async function deleteConfig(key: string): Promise<void> {
    await settingsRepo.delete(key)
}

export async function getAllConfig(): Promise<Record<string, string>> {
    return await settingsRepo.getAll()
}
