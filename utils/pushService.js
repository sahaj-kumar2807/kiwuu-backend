const { messaging } = require("../config/firebase");

/**
 * Sends a push notification via Firebase Cloud Messaging (FCM).
 * @param {string} fcmToken - The target device's FCM registration token
 * @param {string} title - Notification title
 * @param {string} body - Notification body
 * @param {object} data - Extra data payload (e.g. { screen: 'chat', senderId: '...' })
 */
const sendPushNotification = async (fcmToken, title, body, data = {}) => {
    if (!fcmToken) return;

    // FCM tokens are typically 100+ chars and don't start with "ExponentPushToken"
    if (fcmToken.startsWith("ExponentPushToken")) {
        console.log(`⚠️ Skipping legacy Expo push token: ${fcmToken.slice(0, 30)}...`);
        return;
    }

    // Stringify all data values — FCM data payloads must be string key-value pairs
    const stringData = {};
    for (const [key, value] of Object.entries(data)) {
        stringData[key] = String(value);
    }

    const message = {
        token: fcmToken,
        notification: {
            title: title || "Kiwuu",
            body: body,
        },
        data: {
            screen: "chat",
            ...stringData,
        },
        android: {
            priority: "high",
            notification: {
                channelId: "kiwuu-pulses",
                sound: "default",
                priority: "max",
                defaultVibrateTimings: true,
                defaultSound: true,
                icon: "ic_notification",
                color: "#E04B60",
            },
        },
        // iOS (APNs) configuration for future iOS support
        apns: {
            payload: {
                aps: {
                    sound: "default",
                    badge: 1,
                    "content-available": 1,
                },
            },
        },
    };

    try {
        const response = await messaging.send(message);
        console.log("📲 FCM push notification sent:", response);
    } catch (error) {
        // Handle token expiration / invalid token gracefully
        if (
            error.code === "messaging/registration-token-not-registered" ||
            error.code === "messaging/invalid-registration-token"
        ) {
            console.log(`⚠️ FCM token expired or invalid: ${fcmToken.slice(0, 20)}...`);
            // Could optionally clear the token from the database here
        } else {
            console.error("❌ Error sending FCM push notification:", error.message || error);
        }
    }
};

module.exports = {
    sendPushNotification,
};
