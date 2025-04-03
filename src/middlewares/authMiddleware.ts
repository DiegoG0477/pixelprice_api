import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import { NextFunction, Request, Response } from "express";

dotenv.config();

const secretKey: string = process.env.JWT_SECRET as string;

export const authMiddleware = (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    const authHeader = req.header("Authorization");

    if (!authHeader) {
        return res.status(401).json({
            error: "unauthorized",
        });
    }

    // Separa la parte "Bearer" del token y remueve espacios
    const token = authHeader.startsWith("Bearer ")
        ? authHeader.slice(7)
        : authHeader;

    console.log(token)

    try {
        const decode = jwt.verify(token, secretKey) as jwt.JwtPayload;

        console.log("decode", decode);

        (req as any).userId = decode.id;

        next();
    } catch (error) {
        return res.status(401).json({
            error: "unauthorized",
        });
    }
};