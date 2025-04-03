export type DeviceType = 'android' | 'ios' | 'web';

export interface DeviceTokenRepository {
    /**
     * Saves or updates a device token for a given user.
     * If the token already exists, it updates the user_id association and updated_at.
     * @param userId The ID of the user (as string, consistent with other features).
     * @param token The FCM device token.
     * @param deviceType Optional type of the device.
     * @returns Promise<void> Resolves on success, rejects on error.
     */
    saveToken(userId: string, token: string, deviceType?: DeviceType): Promise<void>;

    /**
     * Retrieves all active FCM tokens associated with a user.
     * @param userId The ID of the user.
     * @returns Promise<string[]> An array of token strings. Returns empty array if none found. Returns null on database error.
     */
    getTokensByUserId(userId: string): Promise<string[] | null>; // Changed method name

    /**
     * Deletes a specific device token from the database.
     * Typically called when a user logs out or the token becomes invalid.
     * @param token The FCM device token to delete.
     * @returns Promise<boolean> Returns true if a token was deleted, false otherwise or on error.
     */
    deleteToken(token: string): Promise<boolean>; // Added return type for clarity
}