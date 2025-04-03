export interface IEncryptPasswordService {
    encodePassword(password: string): Promise<string>;
    verifyPassword(word: string, passwordEncode: string): Promise<boolean>;
}