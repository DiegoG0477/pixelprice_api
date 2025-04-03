import { DeviceTokenRepository, DeviceType } from "../../domain/DeviceTokenRepository";

export class RegisterDeviceTokenUseCase {
    constructor(private readonly deviceTokenRepository: DeviceTokenRepository) {}

    /**
     * Registers or updates a device token for a specific user.
     * @param userId The ID of the user.
     * @param token The FCM device token.
     * @param deviceType Optional type of the device ('android', 'ios', 'web').
     * @returns Promise<boolean> indicating success or failure.
     */
    async run(userId: string, token: string, deviceType?: DeviceType): Promise<boolean> {
        if (!userId || !token) {
            console.warn("RegisterDeviceTokenUseCase: Missing userId or token.");
            return false; // Indicate failure due to missing input
        }

        try {
            // The repository handles the "insert or update" logic using userId
            await this.deviceTokenRepository.saveToken(userId, token, deviceType);
            console.log(`Device token registered/updated successfully for user ${userId}. Token start: ${token.substring(0, 10)}...`);
            return true; // Indicate success
        } catch (error) {
            console.error(`Error in RegisterDeviceTokenUseCase for user ${userId}:`, error);
            return false; // Indicate failure
        }
    }
}