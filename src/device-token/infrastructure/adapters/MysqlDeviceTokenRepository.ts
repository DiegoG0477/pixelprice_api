import { query } from "../../../shared/database/mysqlAdapter"; // Adjust path if needed
import { DeviceTokenRepository, DeviceType } from "../../domain/DeviceTokenRepository";

export class MysqlDeviceTokenRepository implements DeviceTokenRepository {

    // IMPORTANT: Assumes your `device_tokens` table now has a `user_id` column
    // (likely INT, possibly Foreign Key to users.id) instead of `patient_id`.
    // Make sure the database schema is updated accordingly.
    // Example schema change:
    // ALTER TABLE device_tokens DROP FOREIGN KEY `fk_patient_id`; -- If exists
    // ALTER TABLE device_tokens DROP COLUMN patient_id;
    // ALTER TABLE device_tokens ADD COLUMN user_id INT NOT NULL AFTER id; -- Adjust position as needed
    // ALTER TABLE device_tokens ADD CONSTRAINT fk_user_id FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE; -- Optional FK
    // ALTER TABLE device_tokens ADD UNIQUE KEY unique_token (token); -- Ensure token uniqueness for ON DUPLICATE KEY UPDATE

    async saveToken(userId: string, token: string, deviceType?: DeviceType): Promise<void> {
        const sql = `
            INSERT INTO device_tokens (user_id, token, device_type)
            VALUES (?, ?, ?)
            ON DUPLICATE KEY UPDATE user_id = VALUES(user_id), device_type = VALUES(device_type), updated_at = CURRENT_TIMESTAMP
        `;
        // Convert userId string to number for the database if user_id column is INT
        const params: any[] = [parseInt(userId, 10), token, deviceType ?? null];

        try {
            await query(sql, params);
            console.log(`Token saved/updated for user ${userId}. Token start: ${token.substring(0, 10)}...`);
        } catch (error: any) {
            console.error(`Error saving device token for user ${userId}:`, error);
            // Re-throw the error to be caught by the use case
            throw new Error(`Database error saving token: ${error.message}`);
        }
    }

    async getTokensByUserId(userId: string): Promise<string[] | null> { // Changed method name
        const sql = "SELECT token FROM device_tokens WHERE user_id = ?";
        const params: any[] = [parseInt(userId, 10)]; // Convert userId to number

        try {
            const [rows]: any = await query(sql, params);
            if (!rows) {
                console.error(`Query for tokens for user ${userId} returned undefined rows.`);
                return null; // Indicate DB error state
            }
            const tokens: string[] = rows.map((row: any) => row.token);
            console.log(`Retrieved ${tokens.length} tokens for user ${userId}.`);
            return tokens;
        } catch (error: any) {
            console.error(`Error getting tokens for user ${userId}:`, error);
            return null; // Indicate failure to retrieve (DB error)
        }
    }

    async deleteToken(token: string): Promise<boolean> { // Updated return type
        const sql = "DELETE FROM device_tokens WHERE token = ?";
        const params: any[] = [token];

        try {
            const [result]: any = await query(sql, params);
             if (result.affectedRows === 0) {
                 console.warn(`Attempted to delete non-existent token: ${token.substring(0, 10)}...`);
                 return false; // Indicate token wasn't found/deleted
             }
             console.log(`Deleted token: ${token.substring(0, 10)}...`);
             return true; // Indicate successful deletion
        } catch (error: any) {
            console.error(`Error deleting device token ${token.substring(0, 10)}...:`, error);
            // Re-throw or return false based on desired error handling
            // throw new Error(`Database error deleting token: ${error.message}`);
            return false; // Indicate failure due to error
        }
    }
}