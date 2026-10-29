const { onValueWritten } = require("firebase-functions/v2/database");
const { initializeApp } = require("firebase-admin/app");
const { getDatabase, ServerValue } = require("firebase-admin/database");

initializeApp();

exports.recordGameStartTimeOnDatabaseChange = onValueWritten(
    {
        ref: "/game/started",
        region: "asia-southeast1",
    },
    async (event) => {
        const wasStarted = event.data.before.val() === true;
        const isStarted = event.data.after.val() === true;

        if (wasStarted || !isStarted) {
            return null;
        }

        await getDatabase().ref("game/startedAt").set(ServerValue.TIMESTAMP);
        return null;
    },
);
