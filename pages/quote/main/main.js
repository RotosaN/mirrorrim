import { initializeApp } from "https://www.gstatic.com/firebasejs/13.1.0/firebase-app.js";
import {
    getDatabase,
    onValue,
    push,
    ref,
    serverTimestamp,
    set,
} from "https://www.gstatic.com/firebasejs/13.1.0/firebase-database.js";

const firebaseConfig = {
    apiKey: "AIzaSyCBsQzCZZJhtmw0KTbqi_WED17DVQon8U4",
    authDomain: "mirrorrim-database.firebaseapp.com",
    databaseURL: "https://mirrorrim-database-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "mirrorrim-database",
    storageBucket: "mirrorrim-database.firebasestorage.app",
    messagingSenderId: "854890428075",
    appId: "1:854890428075:web:8989fc10338f6fb32429ee",
};

const questionTotal = 9;
const loginScreen = document.querySelector("#login-screen");
const waitingScreen = document.querySelector("#waiting-screen");
const gameScreen = document.querySelector("#game-screen");
const loginForm = document.querySelector("#login-form");
const usernameInput = document.querySelector("#username");
const questionImage = document.querySelector("#question-image");
const questionImageDialog = document.querySelector("#question-image-dialog");
const expandedQuestionImage = document.querySelector("#expanded-question-image");
const previousQuestionButton = document.querySelector("#previous-question");
const nextQuestionButton = document.querySelector("#next-question");
const answerForm = document.querySelector("#answer-form");
const answerInput = document.querySelector("#answer");
const answerSubmitButton = document.querySelector("#answer-submit");
const answerStatus = document.querySelector("#answer-status");
const databaseStatusElements = document.querySelectorAll(".database-status");

let username = "";
let gameStarted = false;
let currentQuestion = 1;
let database;
let databaseError = "";

function setDatabaseStatus(message) {
    databaseStatusElements.forEach((element) => {
        element.textContent = message;
    });
}

function renderScreen() {
    loginScreen.hidden = Boolean(username);
    waitingScreen.hidden = !username || gameStarted;
    gameScreen.hidden = !username || !gameStarted;

    if (databaseError) {
        setDatabaseStatus(databaseError);
        return;
    }

    if (gameStarted && !username) {
        setDatabaseStatus("ゲームが始まりました。ユーザー名を入力して参加してください。");
    }

    if (username && !gameStarted) {
        setDatabaseStatus("主催者によるゲーム開始を待っています...");
    }
}

function renderQuestion() {
    questionImage.src = `../media/imgs/question/jp_q${currentQuestion}.png`;
    questionImage.alt = `問題${currentQuestion}`;
    questionImage.setAttribute("aria-label", `問題${currentQuestion}をクリックして拡大`);
    questionImage.setAttribute("role", "button");
    questionImage.tabIndex = 0;
    previousQuestionButton.disabled = currentQuestion === 1;
    nextQuestionButton.disabled = currentQuestion === questionTotal;
}

function openQuestionImage() {
    expandedQuestionImage.src = questionImage.src;
    expandedQuestionImage.alt = questionImage.alt;
    questionImageDialog.showModal();
}

questionImage.addEventListener("click", openQuestionImage);
questionImage.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        openQuestionImage();
    }
});

expandedQuestionImage.addEventListener("click", () => {
    questionImageDialog.close();
});

questionImageDialog.addEventListener("click", (event) => {
    if (event.target === questionImageDialog) {
        questionImageDialog.close();
    }
});

loginForm.addEventListener("submit", (event) => {
    event.preventDefault();
    username = usernameInput.value.trim();

    if (!username) {
        usernameInput.focus();
        return;
    }

    renderScreen();
});

previousQuestionButton.addEventListener("click", () => {
    if (currentQuestion > 1) {
        currentQuestion -= 1;
        renderQuestion();
        answerStatus.textContent = "";
    }
});

nextQuestionButton.addEventListener("click", () => {
    if (currentQuestion < questionTotal) {
        currentQuestion += 1;
        renderQuestion();
        answerStatus.textContent = "";
    }
});

answerForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const answer = answerInput.value.trim();

    if (!answer || !database) {
        return;
    }

    answerSubmitButton.disabled = true;
    answerStatus.textContent = "回答を送信しています...";

    try {
        const answerRef = push(ref(database, "game/answers"));
        await set(answerRef, {
            username,
            questionNumber: currentQuestion,
            answer,
            submittedAt: serverTimestamp(),
        });
        answerInput.value = "";
        answerStatus.textContent = "回答を送信しました。";
    } catch (error) {
        console.error("回答の送信に失敗しました。", error);
        answerStatus.textContent = "回答を送信できませんでした。データベースの書き込み権限を確認してください。";
    } finally {
        answerSubmitButton.disabled = false;
    }
});

renderQuestion();

try {
    const app = initializeApp(firebaseConfig);
    database = getDatabase(app);

    onValue(
        ref(database, "game/started"),
        (snapshot) => {
            gameStarted = snapshot.val() === true;
            databaseError = "";
            renderScreen();
        },
        (error) => {
            console.error("ゲーム状態の取得に失敗しました。", error);
            databaseError = "Firebaseに接続できません。データベースの読み取り権限を確認してください。";
            setDatabaseStatus(databaseError);
        },
    );
} catch (error) {
    console.error("Firebaseの初期化に失敗しました。", error);
    databaseError = "Firebaseを初期化できませんでした。接続設定を確認してください。";
    setDatabaseStatus(databaseError);
}