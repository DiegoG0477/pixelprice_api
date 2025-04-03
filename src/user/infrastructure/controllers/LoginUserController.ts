import { Request, Response } from "express";
import { LoginUserUseCase } from "../../application/use-cases/LoginUserUseCase";

export class LoginUserController {
    constructor(private loginUserUseCase: LoginUserUseCase) {}

    async run(req: Request, res: Response): Promise<Response> {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                status: "error",
                message: "Email and password are required",
            });
        }

        try {
            const token = await this.loginUserUseCase.run(email, password);

            if(token){
                return res.status(200).json({
                    status: "success",
                    message: "User logged in successfully",
                    token // Send the generated JWT token
                });
            } else {
                // Use case returned null, indicating invalid credentials or user not found
                return res.status(401).json({ // 401 Unauthorized is more appropriate
                    status: "error",
                    message: "Invalid credentials",
                });
            }
        } catch (error) {
             console.error("Error in LoginUserController:", error);
            // Catch potential errors from the use case/services
            return res.status(500).json({ // Use 500 for unexpected errors
                status: "error",
                message: "An unexpected error occurred during login",
                error: error instanceof Error ? error.message : 'Unknown error',
            });
        }
    }
}