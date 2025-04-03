import { User } from "./entities/User";

export interface UserRepository {
    registerUser(User: User): Promise<User | null>;
    getPassword(email: string): Promise<string | null>;
    getUserByEmail(email: string): Promise<User | null>;
    getUserById(id: string): Promise<User | null>; // Added for potential future use
}