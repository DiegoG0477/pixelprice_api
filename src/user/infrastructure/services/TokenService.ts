import jwt, { Secret } from 'jsonwebtoken';
import { ITokenService } from "../../application/services/ITokenService";

export class TokenService implements ITokenService {
    async generateToken(userId: string): Promise<string> { // userId es el ID del paciente
        // Asegúrate de que JWT_SECRET se cargue correctamente (por ejemplo, mediante dotenv)
        const JWT_SECRET: Secret = process.env.JWT_SECRET ?? 'your-default-very-strong-secret'; // Solo para desarrollo, preferir la variable de entorno en producción
        if(JWT_SECRET === 'your-default-very-strong-secret'){
            console.warn("Using default JWT secret. Set JWT_SECRET environment variable for production.")
        }
        const expiresIn: number = 18000; // Configurable

        // El payload puede incluir más información si es necesario (por ejemplo, role), pero manténlo minimalista
        const payload = { id: userId /*, type: 'patient' // Opcional: distinguir tipos de token */ };

        // Se especifican los tipos correctamente para evitar errores en jwt.sign
        const token = jwt.sign(payload, JWT_SECRET, { expiresIn: expiresIn });

        console.log(`Generated token for patient ID: ${userId}`); // Evita registrar el token en producción

        return token;
    }
}