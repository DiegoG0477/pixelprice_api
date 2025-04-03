import bcrypt from "bcrypt";

export class BcryptService {
    async encodePassword(password: string): Promise<string> {
        const pass = bcrypt.hashSync(password, 10);
        return pass;
    }

    async verifyPassword(word: string, passwordEncode: string): Promise<boolean> {
        const result = bcrypt.compareSync(word, passwordEncode);
        return result;
    }
}