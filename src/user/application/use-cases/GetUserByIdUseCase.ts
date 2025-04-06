// user/application/use-cases/GetUserByIdUseCase.ts
import { User } from "../../domain/entities/User";
import { UserRepository } from "../../domain/UserRepository";

export class GetUserByIdUseCase {
    constructor(
        readonly userRepository: UserRepository
    ) {}

    async run(id: string): Promise<User | null> {
        try {
            if (!id) {
                console.warn("GetUserByIdUseCase called without ID.");
                return null;
            }

            // Repository handles fetching and mapping, including returning null if not found
            const user = await this.userRepository.getUserById(id);

            // The repository should already exclude the password, but ensure this is the case.
            // If the repo implementation might include it, explicitly exclude it here:
            // if (user) {
            //    const { password, ...userWithoutPassword } = user;
            //    return userWithoutPassword as User; // Type assertion needed after omit
            // }
            // return null;
            // Assuming repo correctly excludes password:
            return user;

        } catch (error) {
            // Catch unexpected errors during use case execution
            console.error(`Error in GetUserByIdUseCase for ID ${id}:`, error);
            // Indicate failure, repository might have logged specific DB errors
            return null;
        }
    }
}