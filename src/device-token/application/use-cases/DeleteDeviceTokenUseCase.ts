import { DeviceTokenRepository } from "../../domain/DeviceTokenRepository";

export class DeleteDeviceTokenUseCase {
    constructor(private readonly deviceTokenRepository: DeviceTokenRepository) {}

    async run(token: string): Promise<boolean> {
        if (!token) {
            console.warn("DeleteDeviceTokenUseCase: Missing token.");
            return false;
        }

        try {
            // The repository handles deleting the specific token regardless of user/patient
            await this.deviceTokenRepository.deleteToken(token);
            console.log(`Device token deleted successfully. Token start: ${token.substring(0, 10)}...`);
            return true;
        } catch (error) {
            console.error(`Error in DeleteDeviceTokenUseCase for token ${token.substring(0, 10)}...:`, error);
            return false;
        }
    }
}