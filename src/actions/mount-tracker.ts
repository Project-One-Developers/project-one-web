"use server"

import { safeAction } from "@/lib/errors/action-wrapper"
import { mountTrackerService } from "@/services/mount-tracker.service"
import type { PlayerMountStatus } from "@/shared/models/mount.models"

export const getPlayerMountStatuses = safeAction(
    async (): Promise<PlayerMountStatus[]> => {
        return mountTrackerService.getPlayerMountStatuses()
    }
)
