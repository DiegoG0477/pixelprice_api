import { Request, Response } from 'express';
import { RegisterUserUseCase } from '../../application/use-cases/RegisterUserUseCase';
import { User } from '../../domain/entities/User'; // Import User if needed for response typing

export class RegisterUserController {
    constructor(readonly registerUserUseCase: RegisterUserUseCase) {}

    async run(req: Request, res: Response): Promise<Response> {
        const data = req.body;
        try {
             // Basic validation
             if (!data.email || !data.password) {
                return res.status(400).send({
                    status: 'error',
                    message: 'Email and password are required fields',
                });
            }

            const user = await this.registerUserUseCase.run(
                data.email,
                data.password,
                data.name ?? null, // Use nullish coalescing for optional fields
                data.last_name ?? null
            );

            console.log('Datos de registro user:', req.body);

            if (user) {
                // Exclude password from response
                const userResponse: Omit<User, 'password'> = {
                     id: user.id,
                     email: user.email,
                     name: user.name,
                     last_name: user.last_name,
                     created_at: user.created_at
                 };

                return res.status(201).send({
                    status: 'success',
                    message: 'User registered successfully',
                    data: {
                        user: userResponse,
                    },
                });
            } else {
                // More specific error? Maybe check if user was null due to duplicate email
                return res.status(400).send({
                    status: 'error',
                    message: 'User not registered (possibly duplicate email or server error)',
                });
            }
        } catch (error) {
            console.error("Error in RegisterUserController:", error)
            // Determine if it's a known error (like validation) vs internal server error
            return res.status(500).send({ // Use 500 for unexpected errors
                status: 'error',
                message: 'An unexpected error occurred during registration',
                error: error instanceof Error ? error.message : 'Unknown error', // Avoid sending full error object in production
            });
        }
    }
}