import { Response } from "express";

export class ControllerErrorUseCase {
    static async handle(error: Error, res:Response ): Promise<void> {
        console.error(error);

        res.status(500).send({
            status: 'error',
            message: 'An error occurred',
            error: error,
        });
    }
}