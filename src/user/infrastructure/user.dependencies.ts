
import { RegisterUserUseCase } from "../application/use-cases/RegisterUserUseCase";
import { LoginUserUseCase } from "../application/use-cases/LoginUserUseCase";
import { GetUserByIdUseCase } from "../application/use-cases/GetUserByIdUseCase";
import { UpdateUserUseCase } from "../application/use-cases/UpdateUserUseCase";

import { RegisterUserController } from "./controllers/RegisterUserController";
import { LoginUserController } from "./controllers/LoginUserController";
import { GetUserByIdController } from "./controllers/GetUserByIdController";
import { UpdateUserController } from "./controllers/UpdateUserController";

import { BcryptService } from "../../security/bcrypt";


import { MysqlUserRepository } from "./adapters/MysqlUserRepository";


import { EncryptPasswordService } from "./services/EncryptPasswordService";
import { TokenService } from "./services/TokenService";



export const mysqlUserRepository = new MysqlUserRepository();

export const userEncryptPasswordService = new EncryptPasswordService(new BcryptService());
export const userTokenService = new TokenService();


export const loginUserUseCase = new LoginUserUseCase(
    mysqlUserRepository,
    userTokenService,
    userEncryptPasswordService
);

export const registerUserUseCase = new RegisterUserUseCase(
    mysqlUserRepository,
    userEncryptPasswordService
);

export const getUserByIdUseCase = new GetUserByIdUseCase( // <-- Instantiate new
    mysqlUserRepository
);

export const updateUserUseCase = new UpdateUserUseCase( // <-- Instantiate new
    mysqlUserRepository
);


export const registerUserController = new RegisterUserController(registerUserUseCase);
export const loginUserController = new LoginUserController(loginUserUseCase, mysqlUserRepository);
export const getUserByIdController = new GetUserByIdController(getUserByIdUseCase);
export const updateUserController = new UpdateUserController(updateUserUseCase);

