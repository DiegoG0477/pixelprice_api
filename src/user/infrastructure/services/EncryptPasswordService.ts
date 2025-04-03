// patient/infrastructure/services/EncryptPasswordService.ts
// NOTE: This is likely identical to the one in user/infrastructure/services
// You might want to move this to a shared security/services location
import { BcryptService } from "../../../security/bcrypt"; // Adjust path as needed
import { IEncryptPasswordService } from "../../domain/services/IEncryptPasswordService";

export class EncryptPasswordService implements IEncryptPasswordService {
    constructor(
        // Assuming BcryptService is a singleton or easily instantiated
        readonly bcryptService: BcryptService
    ){}
    async encodePassword(password: string): Promise<string> {
        const pass = await this.bcryptService.encodePassword(password);
        return pass;
    }

    async verifyPassword(word: string, passwordEncode: string): Promise<boolean> {
        const result = await this.bcryptService.verifyPassword(word, passwordEncode);
        return result;
    }
}