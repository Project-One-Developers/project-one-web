"use server"

import { mountTrackerService } from "@/services/mount-tracker.service"
import type { PlayerMountStatus } from "@/shared/models/mount.models"

export async function getPlayerMountStatuses(): Promise<PlayerMountStatus[]> {
    return mountTrackerService.getPlayerMountStatuses()
}
