export class User {
    constructor(
        readonly id: string, // Keep ID as string for consistency with User domain, repository will handle conversion
        readonly email: string,
        readonly password: string, // Password hash
        readonly name: string | null,
        readonly last_name: string | null,
        readonly created_at?: Date // Optional, based on schema default
    ) {}
}