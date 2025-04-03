// patient/application/services/ITokenService.ts
// NOTE: This is likely identical to the one in user/application/services
// You might want to move this to a shared application/auth location
export interface ITokenService {
    generateToken(userId: string): Promise<string>; // userId should be the patient's ID
}