"use server"

import {
    deleteConfig,
    getAllConfig,
    getConfig,
    setConfig,
} from "@/db/repositories/settings"

export async function getConfigAction(key: string): Promise<string | null> {
    return await getConfig(key)
}

export async function setConfigAction(key: string, value: string): Promise<void> {
    await setConfig(key, value)
}

export async function deleteConfigAction(key: string): Promise<void> {
    await deleteConfig(key)
}

export async function getAllConfigAction(): Promise<Record<string, string>> {
    return await getAllConfig()
}
