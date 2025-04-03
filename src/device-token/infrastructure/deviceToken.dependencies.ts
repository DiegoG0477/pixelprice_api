import { MysqlDeviceTokenRepository } from "./adapters/MysqlDeviceTokenRepository";
import { RegisterDeviceTokenUseCase } from "../application/use-cases/RegisterDeviceTokenUseCase";
import { DeleteDeviceTokenUseCase } from "../application/use-cases/DeleteDeviceTokenUseCase";
import { RegisterDeviceTokenController } from "./controllers/RegisterDeviceTokenController";
import { DeleteDeviceTokenController } from "./controllers/DeleteDeviceTokenController";

export const mysqlDeviceTokenRepository = new MysqlDeviceTokenRepository();

// Instantiate Use Cases
export const registerDeviceTokenUseCase = new RegisterDeviceTokenUseCase(mysqlDeviceTokenRepository);
export const deleteDeviceTokenUseCase = new DeleteDeviceTokenUseCase(mysqlDeviceTokenRepository);

// Instantiate Controllers
export const registerDeviceTokenController = new RegisterDeviceTokenController(registerDeviceTokenUseCase);
export const deleteDeviceTokenController = new DeleteDeviceTokenController(deleteDeviceTokenUseCase);