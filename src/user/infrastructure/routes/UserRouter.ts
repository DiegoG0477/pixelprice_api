import express from "express";


import { loginUserController, registerUserController } from "../user.dependencies";
import { authMiddleware } from "../../../middlewares/authMiddleware";
import { getUserByIdController } from "../user.dependencies";
import { updateUserController } from "../user.dependencies";

const userRouter = express.Router();

userRouter.post("/auth/login", async (req, res) => {
    await loginUserController.run(req, res);
});

userRouter.post('/', (req, res) => registerUserController.run(req, res));

userRouter.get('/:id', authMiddleware, (req, res) => getUserByIdController.run(req, res));

userRouter.patch('/:id', authMiddleware, (req, res) => updateUserController.run(req, res));


export { userRouter };