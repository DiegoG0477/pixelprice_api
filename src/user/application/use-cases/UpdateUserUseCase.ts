// user/application/use-cases/UpdateUserUseCase.ts
import { User } from "../../domain/entities/User";
import { UserRepository } from "../../domain/UserRepository";

// Define the shape of the data allowed for update (this is already mutable)
interface UpdateUserData {
    name?: string | null;
    last_name?: string | null;
}

export class UpdateUserUseCase {
    constructor(
        readonly userRepository: UserRepository
    ) {}

    async run(id: string, data: UpdateUserData): Promise<User | null> {
        try {
            if (!id) {
                console.warn("UpdateUserUseCase called without ID.");
                return null;
            }

            if (data.name === undefined && data.last_name === undefined) {
                 console.warn(`UpdateUserUseCase called for ID ${id} with no update data.`);
                 return null;
            }

            // --- CORRECTION ---
            // Use the mutable UpdateUserData interface for dataToUpdate
            const dataToUpdate: UpdateUserData = {};

            // Assign values to the mutable object
            if (data.name !== undefined) {
                // Assign to dataToUpdate.name (which is mutable)
                dataToUpdate.name = data.name; // Remove trailing '?'
            }
            if (data.last_name !== undefined) {
                // Assign to dataToUpdate.last_name (which is mutable)
                dataToUpdate.last_name = data.last_name; // Remove trailing '?'
            }
            // --- END CORRECTION ---

            // Call repository. The repository method expects Partial<Pick<User...>>,
            // but our mutable UpdateUserData object is compatible and assignable to that type.
            // The repository *itself* won't modify the 'data' object it receives due to its type def.
            const updatedUser = await this.userRepository.updateUser(id, dataToUpdate);

            return updatedUser;

        } catch (error) {
            console.error(`Error in UpdateUserUseCase for ID ${id}:`, error);
            return null;
        }
    }
}