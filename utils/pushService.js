const { Expo } = require("expo-server-sdk");

const expo = new Expo();

/**
 * Sends a real remote push notification to an Expo push token
 * @param {string} pushToken - The target Expo push token
 * @param {string} title - Notification title
 * @param {string} body - Notification body
 * @param {object} data - Extra data payload (e.g. { screen: 'chat', senderId: '...' })
 */
const sendPushNotification = async (pushToken, title, body, data = {}) => {
    if (!pushToken) return;

    if (!Expo.isExpoPushToken(pushToken)) {
        console.log(`⚠️ Invalid Expo push token: ${pushToken}`);
        return;
    }

    const message = {
        to: pushToken,
        sound: "default",
        title: title || "Kiwuu",
        body: body,
        data: {
            screen: "chat",
            ...data
        },
        channelId: "kiwuu-pulses",
        priority: "high",
        badge: 1
    };

    try {
        const chunks = expo.chunkPushNotifications([message]);
        for (const chunk of chunks) {
            const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
            console.log("📲 Expo push notification sent:", ticketChunk);
            for (const ticket of ticketChunk) {
                if (ticket.status === "error") {
                    console.error(`❌ Push ticket error: ${ticket.message} (${ticket.details?.error})`);
                }
            }
        }
    } catch (error) {
        console.error("❌ Error sending Expo push notification:", error);
    }
};

module.exports = {
    sendPushNotification
};
