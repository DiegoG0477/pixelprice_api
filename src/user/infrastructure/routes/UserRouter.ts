import express from "express";


import { loginUserController, registerUserController } from "../user.dependencies";

const userRouter = express.Router();

userRouter.post("/auth/login", async (req, res) => {
    await loginUserController.run(req, res);
});

userRouter.post('/', (req, res) => registerUserController.run(req, res));


export { userRouter };