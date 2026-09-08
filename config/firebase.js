const admin = require("firebase-admin");

/**
 * Initialize Firebase Admin SDK.
 *
 * Credential resolution order:
 *   1. FIREBASE_SERVICE_ACCOUNT_BASE64  – base64-encoded JSON (best for Render / CI)
 *   2. FIREBASE_SERVICE_ACCOUNT_PATH    – path to a JSON key file
 *   3. Application Default Credentials  – auto-detected on GCP
 */
function initFirebase() {
    if (admin.apps.length > 0) {
        return admin.apps[0];
    }

    let credential;

    // 1. Base64-encoded service account (ideal for Render, Railway, etc.)
    if (process.env.FIREBASE_SERVICE_ACCOUNT_BASE64) {
        try {
            const json = Buffer.from(
                process.env.FIREBASE_SERVICE_ACCOUNT_BASE64,
                "base64"
            ).toString("utf-8");
            const serviceAccount = JSON.parse(json);
            credential = admin.credential.cert(serviceAccount);
            console.log("🔥 Firebase Admin: using base64 service account");
        } catch (err) {
            console.error("❌ Failed to parse FIREBASE_SERVICE_ACCOUNT_BASE64:", err.message);
        }
    }

    // 2. File path to service account JSON
    if (!credential && process.env.FIREBASE_SERVICE_ACCOUNT_PATH) {
        try {
            const serviceAccount = require(process.env.FIREBASE_SERVICE_ACCOUNT_PATH);
            credential = admin.credential.cert(serviceAccount);
            console.log("🔥 Firebase Admin: using service account file");
        } catch (err) {
            console.error("❌ Failed to load service account file:", err.message);
        }
    }

    // 3. Application Default Credentials (GCP environments)
    if (!credential) {
        credential = admin.credential.applicationDefault();
        console.log("🔥 Firebase Admin: using Application Default Credentials");
    }

    admin.initializeApp({ credential });
    console.log("✅ Firebase Admin SDK initialized successfully");

    return admin.app();
}

// Initialize on require
initFirebase();

module.exports = {
    admin,
    messaging: admin.messaging(),
};
