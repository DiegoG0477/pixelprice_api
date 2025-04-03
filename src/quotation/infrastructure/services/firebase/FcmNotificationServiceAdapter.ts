import { INotificationService } from '../../../application/services/INotificationService';
import { DeviceTokenRepository } from '../../../../device-token/domain/DeviceTokenRepository'; // Path to actual repo
import { Quotation } from '../../../domain/entities/Quotation';
import { INotificationService as IQuotationNotificationService } from '../../../application/services/INotificationService';
import { FirebaseError } from 'firebase-admin/app';
import * as admin from 'firebase-admin'; // Import admin


// Helper to check if an object is a FirebaseError
function isFirebaseError(error: unknown): error is FirebaseError {
    return typeof error === 'object' && error !== null && 'code' in error && 'message' in error;
}


export class FcmNotificationServiceAdapter implements IQuotationNotificationService {

    // Inject the *shared* DeviceTokenRepository instance
    constructor(
        private readonly deviceTokenRepository: DeviceTokenRepository,
        private readonly fcmService?: INotificationService // Optional: Inject if reusing a more complex shared service
        ) {
         // Ensure Firebase is initialized (might be done centrally)
         if (admin.apps.length === 0) {
             console.warn("Firebase Admin SDK potentially not initialized before FcmNotificationServiceAdapter instantiation.");
             // Consider initializing here or throwing an error if required upfront
             // admin.initializeApp();
         } else {
             console.log("Firebase Admin SDK appears to be initialized.");
         }
    }

    async sendNewQuotationNotification(quotation: Quotation): Promise<boolean> {
         if (admin.apps.length === 0) {
             console.error("Firebase Admin SDK not initialized. Cannot send quotation notification.");
             return false;
         }

        const userId = quotation.userId; // Use userId from quotation

        try {
            // IMPORTANT: Assumes DeviceTokenRepository has `getTokensByUserId` or similar
            // If it only has `getTokensByPatientId`, you need to add the method there.
            const deviceTokens = await this.deviceTokenRepository.getTokensByUserId(userId);

            if (deviceTokens === null) {
                console.error(`Failed to retrieve device tokens for user ${userId} due to a database error.`);
                return false;
            }
            if (deviceTokens.length === 0) {
                console.warn(`No FCM device token found for user ID: ${userId}. Cannot send quotation notification.`);
                return false; // No tokens to send to
            }

            console.log(`Found ${deviceTokens.length} tokens for user ${userId}. Preparing notifications.`);

            // Construct the message payload
            const messagePayload: admin.messaging.MulticastMessage = {
                notification: {
                    title: 'Cotización Lista ✅',
                    body: `Tu cotización para el proyecto "${quotation.name}" está lista. ¡Revísala en la app!`,
                },
                data: {
                    quotationId: quotation.id,
                    quotationName: quotation.name,
                    userId: quotation.userId,
                    type: 'QUOTATION_READY', // Custom type for client handling
                },
                tokens: deviceTokens,
                 apns: { // iOS specific config
                    payload: {
                        aps: {
                            alert: {
                                title: 'Cotización Lista ✅',
                                body: `Tu cotización para el proyecto "${quotation.name}" está lista. ¡Revísala en la app!`,
                            },
                            sound: 'default',
                            badge: 1, // Example: set badge count
                            // 'content-available': 1 // If sending silent/data notification too
                        },
                    },
                },
                android: { // Android specific config
                    priority: 'high',
                     notification: {
                         // Add Android specific fields if needed, e.g., channel ID, icon
                         // channelId: 'quotation_channel',
                         // sound: 'default',
                         // clickAction: 'FLUTTER_NOTIFICATION_CLICK', // Example for Flutter
                     }
                },
            };

            // Send multicast message
            const response = await admin.messaging().sendEachForMulticast(messagePayload);

            console.log(`FCM multicast result: ${response.successCount} successes, ${response.failureCount} failures.`);

            let allSuccessful = response.failureCount === 0;

            // Handle failures and potentially remove invalid tokens
            if (response.failureCount > 0) {
                const failedTokens: string[] = [];
                response.responses.forEach((resp, idx) => {
                    if (!resp.success) {
                        const failedToken = deviceTokens[idx];
                        failedTokens.push(failedToken);
                        console.error(`Failed to send to token ${failedToken.substring(0,10)}...: ${resp.error?.message} (Code: ${resp.error?.code})`);
                        // Handle specific errors (like invalid token)
                        this.handleFcmError(resp.error, failedToken, userId); // Reuse error handling logic
                    } else {
                         console.log(`Successfully sent to token ${deviceTokens[idx].substring(0, 10)}... Message ID: ${resp.messageId}`);
                    }
                });
            }

            return allSuccessful;

        } catch (error) {
            console.error(`Unexpected error in sendNewQuotationNotification for user ID ${userId}:`, error);
             if (isFirebaseError(error)) {
                 console.error(`Firebase specific error code: ${error.code}`);
             }
            return false;
        }
    }

     // Reuse or adapt the error handling logic from Prescription service
     private async handleFcmError(error: admin.FirebaseError | undefined, token: string, userId: string): Promise<void> {
        if (!error) return;

        const invalidTokenCodes = [
            'messaging/registration-token-not-registered',
            'messaging/invalid-registration-token',
             'messaging/invalid-argument' // Can sometimes indicate bad token
        ];

        if (invalidTokenCodes.includes(error.code)) {
            console.warn(`FCM token ${token.substring(0, 10)}... for user ${userId} (Code: ${error.code}) is invalid/unregistered. Removing it.`);
            try {
                // IMPORTANT: Assumes DeviceTokenRepository has `deleteToken` method
                 const deleted = await this.deviceTokenRepository.deleteToken(token);
                 if (deleted) {
                    console.log(`Successfully deleted invalid token: ${token.substring(0, 10)}...`);
                 } else {
                    console.warn(`Token ${token.substring(0, 10)}... not found or failed to delete after FCM error.`);
                 }
            } catch (deleteError) {
                console.error(`Failed to delete invalid token ${token.substring(0, 10)}... from DB after FCM error:`, deleteError);
            }
        } else {
            console.error(`Unhandled Firebase Messaging error sending to ${token.substring(0, 10)}...: Code: ${error.code}, Message: ${error.message}`);
        }
    }
}