# Discord Webhookの設定

回答がRealtime Databaseの`game/answers`に追加されると、Cloud FunctionsがDiscord Webhookへ回答を送信します。

## 初回設定

1. Discordで通知先チャンネルのWebhook URLを作成します。
2. リポジトリのルートで、Webhook URLをSecretとして登録します。

```powershell
firebase functions:secrets:set DISCORD_WEBHOOK_URL
```

3. Functionsをデプロイします。

```powershell
firebase deploy --only functions
```

Webhook URLはブラウザー側のコードに書かないでください。URLが漏れると、第三者がそのチャンネルへ投稿できるためです。
