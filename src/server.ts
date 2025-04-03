import express from "express";
import morgan from "morgan";
import { Signale } from "signale";
import dotenv from "dotenv";
import * as admin from 'firebase-admin';

try {
    // Check if already initialized (useful for hot-reloading environments)
    if (admin.apps.length === 0) {
        // Initialize *without* arguments - it will automatically use
        // the GOOGLE_APPLICATION_CREDENTIALS environment variable
        admin.initializeApp();
        console.log('Firebase Admin SDK initialized successfully.');
    } else {
         console.log('Firebase Admin SDK already initialized.');
    }
} catch (error) {
    console.error('Firebase Admin SDK initialization failed:', error);
    // Decide if you want to exit the process if Firebase is critical
    // process.exit(1);
}


import { userRouter } from "./user/infrastructure/routes/UserRouter";
import { quotationRouter } from "./quotation/infrastructure/routes/QuotationRouter";
import { deviceTokenRouter } from "./device-token/infrastructure/routes/DeviceTokenRouter";

dotenv.config();

const PORT = process.env.SERVER_PORT ?? 8080;

const app = express();

const signale = new Signale();

app.use(express.json());
app.use(morgan("dev"));
app.use("/users", userRouter);
app.use("/quotations", quotationRouter);
app.use('/device-tokens', deviceTokenRouter);

app.listen(PORT, async () => {
    signale.success("Server online in port " + PORT);
});