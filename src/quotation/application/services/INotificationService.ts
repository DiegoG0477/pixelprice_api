// quotation/application/services/INotificationService.ts
// NOTE: This can potentially be reused or extended from a shared location.
// If reused directly, ensure the implementation can handle user IDs.
import { Quotation } from "../../domain/entities/Quotation";

export interface INotificationService {
    /**
     * Sends a push notification about a newly generated quotation to the relevant user.
     * The implementation should handle fetching the user's device token(s).
     * @param quotation The newly created quotation details.
     * @returns Promise<boolean> indicating success or failure of sending.
     */
    sendNewQuotationNotification(quotation: Quotation): Promise<boolean>;

    // Potentially include other notification types if this service is shared
    // sendNewPrescriptionNotification?(prescription: any): Promise<boolean>;
}