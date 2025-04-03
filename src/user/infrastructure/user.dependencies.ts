
import { RegisterUserUseCase } from "../application/use-cases/RegisterUserUseCase";
import { LoginUserUseCase } from "../application/use-cases/LoginUserUseCase";

import { RegisterUserController } from "./controllers/RegisterUserController";
import { LoginUserController } from "./controllers/LoginUserController";

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


export const registerUserController = new RegisterUserController(registerUserUseCase);
export const loginUserController = new LoginUserController(loginUserUseCase);

