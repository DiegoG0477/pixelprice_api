import { UserRepository } from "../../domain/UserRepository";
import { IEncryptPasswordService } from "../../domain/services/IEncryptPasswordService";
import { ITokenService } from "../services/ITokenService";

export class LoginUserUseCase {
    constructor(
        readonly userRepository: UserRepository,
        readonly tokenService: ITokenService,
        readonly encryptService: IEncryptPasswordService
    ) {}

    async run(email: string, password: string): Promise<string | null> {
        try {
            const encodedPassword = await this.userRepository.getPassword(email);
            if (encodedPassword === null) {
                console.warn(`Login attempt for non-existent user: ${email}`);
                return null; // User not found
            }

            const isPasswordValid = await this.encryptService.verifyPassword(
                password,
                encodedPassword
            );

            if (!isPasswordValid) {
                console.warn(`Invalid password attempt for user: ${email}`);
                return null; // Invalid password
            }

            // Password is valid, get user details to include ID in token
            const user = await this.userRepository.getUserByEmail(email);
            if (!user || !user.id) {
                // This shouldn't happen if getPassword returned a value, but check defensively
                console.error(`Could not retrieve user details after successful password check for email: ${email}`);
                return null;
            }

            const token = await this.tokenService.generateToken(user.id);

            return token;
        } catch (error) {
            console.error("Error in LoginUserUseCase:", error);
            return null;
        }
    }
}