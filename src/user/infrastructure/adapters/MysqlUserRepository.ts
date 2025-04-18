import { query } from "../../../shared/database/mysqlAdapter"; // Adjust path as needed
import { User } from "../../domain/entities/User";
import { UserRepository } from "../../domain/UserRepository";

export class MysqlUserRepository implements UserRepository {

    async registerUser(user: User): Promise<User | null> {
        const sql = "INSERT INTO users(email, password, name, last_name) VALUES(?, ?, ?, ?)";
        const params: any[] = [user.email, user.password, user.name, user.last_name];
        try {
            const [result]: any = await query(sql, params);
            // Check if insert was successful
            if (result.insertId) {
                // Return the user object with the newly generated ID (converted to string)
                return new User(
                    result.insertId.toString(),
                    user.email,
                    user.password, // Technically returning the hash, maybe omit? Or keep for consistency.
                    user.name,
                    user.last_name
                    // We don't fetch created_at here, could add another query if needed
                );
            }
            return null; // Insert failed
        } catch (error: any) {
            // Handle potential errors, like duplicate email
            console.error("Error in registerUser:", error);
             // Check for duplicate entry error code (ER_DUP_ENTRY for MySQL)
             if (error.code === 'ER_DUP_ENTRY') {
                 console.error(`Attempted to register user with duplicate email: ${user.email}`);
                 // Optionally throw a specific domain error or return null
             }
            return null;
        }
    }

    // // Implementation for getUsers if needed later
    // async getUsers(): Promise<User[] | null> {
    //     const sql = "SELECT id, email, name, last_name, created_at FROM users"; // Exclude password
    //     try {
    //         const [rows]: any = await query(sql, []);
    //         if (!rows || rows.length === 0) {
    //             return []; // Return empty array if no users found
    //         }
    //         const users: User[] = rows.map((row: any) => {
    //             return new User(
    //                 row.id.toString(), // Convert ID to string
    //                 row.email,
    //                 '', // Don't include password hash
    //                 row.name,
    //                 row.last_name,
    //                 row.created_at
    //             );
    //         });
    //         return users;
    //     } catch (error) {
    //         console.error("Error in getUsers:", error);
    //         return null;
    //     }
    // }

    async getPassword(email: string): Promise<string | null> {
        const sql = "SELECT password FROM users WHERE email = ?";
        const params: any[] = [email];
        try {
            const [rows]: any = await query(sql, params);
            if (rows && rows.length > 0) {
                return rows[0].password; // Return the hashed password
            }
            return null; // User not found
        } catch (error) {
            console.error("Error in getPassword:", error);
            return null;
        }
    }

    // // Implementation for changePassword if needed later
    // async changePassword(email: string, passwordHash: string): Promise<boolean | null> {
    //     const sql = "UPDATE users SET password = ? WHERE email = ?";
    //     const params: any[] = [passwordHash, email];
    //     try {
    //         const [result]: any = await query(sql, params);
    //         return result.affectedRows > 0;
    //     } catch (error) {
    //         console.error("Error in changePassword:", error);
    //         return null;
    //     }
    // }

    async getUserByEmail(email: string): Promise<User | null> {
        const sql = "SELECT id, email, name, last_name, created_at FROM users WHERE email = ?"; // Exclude password
        const params: any[] = [email];
        try {
            const [rows]: any = await query(sql, params);
            if (rows && rows.length > 0) {
                const row = rows[0];
                return new User(
                    row.id.toString(), // Convert ID to string
                    row.email,
                    '', // Password hash is not needed here
                    row.name,
                    row.last_name,
                    row.created_at
                );
            }
            return null; // User not found
        } catch (error) {
            console.error("Error in getUserByEmail:", error);
            return null;
        }
    }

     async getUserById(id: string): Promise<User | null> {
        const sql = "SELECT id, email, name, last_name, created_at FROM users WHERE id = ?"; // Exclude password
        const params: any[] = [id]; // ID should be used directly if DB expects number, or keep as string if query handles it
        try {
            const [rows]: any = await query(sql, params);
            if (rows && rows.length > 0) {
                const row = rows[0];
                return new User(
                    row.id.toString(), // Ensure consistency
                    row.email,
                    '', // Password hash is not needed here
                    row.name,
                    row.last_name,
                    row.created_at
                );
            }
            return null; // User not found
        } catch (error) {
            console.error("Error in getUserById:", error);
            return null;
        }
    }

    async updateUser(id: string, data: Partial<Pick<User, 'name' | 'last_name'>>): Promise<User | null> {
        // Build the SET part of the query dynamically for PATCH behavior
        const setClauses: string[] = [];
        const params: any[] = [];

        if (data.name !== undefined) {
            setClauses.push("name = ?");
            params.push(data.name);
        }
        if (data.last_name !== undefined) {
            setClauses.push("last_name = ?");
            params.push(data.last_name);
        }

        // If no valid fields were provided for update
        if (setClauses.length === 0) {
            console.warn(`updateUser called for ID ${id} with no fields to update.`);
            // Return the existing user data without making a DB call for update
            // Or return null if PATCH requires at least one field
             return this.getUserById(id); // Return current state
        }

        const sql = `UPDATE users SET ${setClauses.join(", ")} WHERE id = ?`;
        params.push(parseInt(id, 10)); // Add the ID for the WHERE clause

        try {
            const [result]: any = await query(sql, params);

            // Check if any row was actually updated
            if (result.affectedRows > 0) {
                // Fetch the updated user data to return it
                return await this.getUserById(id);
            } else {
                // No rows affected - likely means user with that ID doesn't exist
                console.warn(`Attempted to update user ID ${id}, but user was not found.`);
                return null; // User not found
            }
        } catch (error) {
            console.error(`Error in updateUser for ID ${id}:`, error);
            return null; // Indicate database error during update
        }
    }
}