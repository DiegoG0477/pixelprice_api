// quotation/infrastructure/quotation.dependencies.ts

// Use Cases
import { CreateQuotationUseCase } from "../application/use-cases/CreateQuotationUseCase";
import { GetQuotationsByUserIdUseCase } from "../application/use-cases/GetQuotationsByUserIdUseCase";
import { GenerateQuotationDocxUseCase } from "../application/use-cases/GenerateQuotationDocxUseCase";
import { GetQuotationByProjectNameUseCase } from "../application/use-cases/GetQuotationByProjectNameUseCase";
import { GetUserByIdUseCase } from "../../user/application/use-cases/GetUserByIdUseCase";

// Controllers
import { CreateQuotationController } from "./controllers/CreateQuotationController";
import { GetQuotationsByUserIdController } from "./controllers/GetQuotationsByUserIdController";
import { GenerateQuotationDocxController } from "./controllers/GenerateQuotationDocxController";
import { GetQuotationByProjectNameController } from "./controllers/GetQuotationByProjectNameController";

// Repository Implementation
import { MysqlQuotationRepository } from "./adapters/MysqlQuotationRepository";

// Service Implementations
import { GeminiQuotationService } from "./services/gemini/GeminiQuotationService";
import { DocxGeneratorService } from "./services/docx/DocxGeneratorService";
import { FcmNotificationServiceAdapter } from "./services/firebase/FcmNotificationServiceAdapter"; // Use the adapter

// Shared Dependencies (Import instances or factories)
// IMPORTANT: Ensure the device token repository is correctly instantiated and imported
import { mysqlDeviceTokenRepository } from '../../device-token/infrastructure/deviceToken.dependencies'; // Adjust path
import { mysqlUserRepository } from "../../user/infrastructure/user.dependencies";

// Instantiate Repository
export const mysqlQuotationRepository = new MysqlQuotationRepository();

// Instantiate Services (Initialize clients/SDKs inside services or globally)
export const geminiQuotationService = new GeminiQuotationService();
export const docxGeneratorService = new DocxGeneratorService();
// Instantiate the adapter, passing the *actual* DeviceTokenRepository instance
export const quotationNotificationService = new FcmNotificationServiceAdapter(mysqlDeviceTokenRepository);

export const getUserByIdUseCase = new GetUserByIdUseCase(mysqlUserRepository);

// Instantiate Use Cases (Inject dependencies)
export const createQuotationUseCase = new CreateQuotationUseCase(
    mysqlQuotationRepository,
    geminiQuotationService,
    quotationNotificationService,
    getUserByIdUseCase
);

export const getQuotationsByUserIdUseCase = new GetQuotationsByUserIdUseCase(
    mysqlQuotationRepository
);

export const getQuotationByProjectNameUseCase = new GetQuotationByProjectNameUseCase(
    mysqlQuotationRepository
)

export const generateQuotationDocxUseCase = new GenerateQuotationDocxUseCase(
    mysqlQuotationRepository,
    docxGeneratorService
);

// Instantiate Controllers
export const createQuotationController = new CreateQuotationController(createQuotationUseCase);
export const getQuotationsByUserIdController = new GetQuotationsByUserIdController(getQuotationsByUserIdUseCase);
export const generateQuotationDocxController = new GenerateQuotationDocxController(generateQuotationDocxUseCase);
export const getQuotationByProjectNameController = new GetQuotationByProjectNameController(getQuotationByProjectNameUseCase)