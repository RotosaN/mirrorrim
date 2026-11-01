const { onValueCreated, onValueWritten } = require("firebase-functions/v2/database");
const { defineSecret } = require("firebase-functions/params");
const { initializeApp } = require("firebase-admin/app");
const { getDatabase, ServerValue } = require("firebase-admin/database");

initializeApp();

const discordWebhookUrl = defineSecret("DISCORD_WEBHOOK_URL");

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

exports.handleGamePause = onValueWritten(
    {
        ref: "/game/paused",
        region: "asia-southeast1",
    },
    async (event) => {
        const wasPaused = event.data.before.val() === true;
        const isPaused = event.data.after.val() === true;
        const database = getDatabase();

        if (!wasPaused && isPaused) {
            await database.ref("game/pausedAt").set(ServerValue.TIMESTAMP);
            return null;
        }

        if (wasPaused && !isPaused) {
            const [pausedAtSnapshot, startedAtSnapshot] = await Promise.all([
                database.ref("game/pausedAt").once("value"),
                database.ref("game/startedAt").once("value"),
            ]);
            const pausedAt = pausedAtSnapshot.val();
            const startedAt = startedAtSnapshot.val();

            if (typeof pausedAt !== "number" || typeof startedAt !== "number") {
                throw new Error("一時停止時間または開始時間が見つからないため、タイマーを再開できません。");
            }

            await Promise.all([
                database.ref("game/startedAt").set(startedAt + Math.max(0, Date.now() - pausedAt)),
                database.ref("game/pausedAt").remove(),
            ]);
        }

        return null;
    },
);

exports.sendAnswerToDiscord = onValueCreated(
    {
        ref: "/game/answers/{answerId}",
        region: "asia-southeast1",
        secrets: [discordWebhookUrl],
    },
    async (event) => {
        const answer = event.data.val();
        if (!answer || typeof answer !== "object") {
            throw new Error("エラッタ！");
        }

        const questionNumber = Number(answer.questionNumber);
        const expectedAnswer = await getDatabase()
            .ref(`game/question/q${questionNumber}/answer`)
            .once("value")
            .then((snapshot) => snapshot.val());
        const isCorrect = typeof expectedAnswer === "string"
            && String(answer.answer ?? "").trim() === expectedAnswer.trim();
        const resultEmoji = isCorrect ? "<:correct:1566395794007924827>" : "<:incorrect:1566396672840437840>";

        const response = await fetch(discordWebhookUrl.value(), {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                content: [
                    `**${String(answer.username ?? "??")}**`,
                    `Q${String(answer.questionNumber ?? "??")} / A.${String(answer.answer ?? "")} ${resultEmoji}`,
                ].join("\n"),
                allowed_mentions: {
                    parse: [],
                },
            }),
        });

        if (!response.ok) {
            throw new Error(`Discord Webhookへの送信に失敗しました: HTTP ${response.status}`);
        }
    },
);
