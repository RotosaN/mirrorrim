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
const playerName = document.querySelector(".playerName");
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
const correctOverlay = document.querySelector("#correct-overlay");
const correctImage = correctOverlay.querySelector("img");
const timerElement = document.querySelector(".timer");
const timerWrap = document.querySelector(".timer-wrap");
const pauseOverlay = document.querySelector("#pause-overlay");
const databaseStatusElements = document.querySelectorAll(".database-status");

const defaultGameDurationMs = 90 * 60 * 1000;
const timerCircumference = 2 * Math.PI * 30;
let username = "";
let gameStarted = false;
let currentQuestion = 1;
let database;
let databaseError = "";
let expectedAnswers = {};
let correctAnimationState = "hidden";
let correctHoldTimer;
let startedAt;
let paused = false;
let pausedAt;
let timerInterval;
let gameDurationMs = defaultGameDurationMs;

function setDatabaseStatus(message) {
    databaseStatusElements.forEach((element) => {
        element.textContent = message;
    });
}

function renderTimer() {
    if (typeof startedAt !== "number") {
        return;
    }

    const now = paused && typeof pausedAt === "number" ? pausedAt : Date.now();
    const remainingMs = Math.max(0, gameDurationMs - (now - startedAt));
    const remainingSeconds = Math.ceil(remainingMs / 1000);
    const minutes = Math.floor(remainingSeconds / 60);
    const seconds = remainingSeconds % 60;
    const progress = (remainingMs / gameDurationMs) * 100;

    timerElement.textContent = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
    timerWrap.style.setProperty("--timer-progress", String(Math.max(0, Math.min(100, progress))));
}

function startTimerUpdates() {
    window.clearInterval(timerInterval);
    renderTimer();
    if (paused || typeof startedAt !== "number") {
        return;
    }

    timerInterval = window.setInterval(renderTimer, 250);
}

function renderPauseOverlay() {
    pauseOverlay.hidden = !gameStarted || !paused;
}

function renderScreen() {
    loginScreen.hidden = Boolean(username);
    waitingScreen.hidden = !username || gameStarted;
    gameScreen.hidden = !username || !gameStarted;
    renderPauseOverlay();

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

function showCorrectAnimation() {
    window.clearTimeout(correctHoldTimer);
    correctAnimationState = "hidden";
    correctOverlay.hidden = true;
    correctOverlay.classList.remove("is-closing");
    correctImage.getAnimations().forEach((animation) => {
        animation.cancel();
    });
    void correctOverlay.offsetWidth;
    correctAnimationState = "playing";
    correctOverlay.hidden = false;
}

function finishCorrectAnimation() {
    window.clearTimeout(correctHoldTimer);
    if (correctAnimationState !== "playing") {
        return;
    }

    correctAnimationState = "closing";
    correctOverlay.classList.add("is-closing");
}

function isCorrectAnswer(answer) {
    const expectedAnswer = expectedAnswers[currentQuestion];
    return typeof expectedAnswer === "string"
        && answer.trim() === expectedAnswer.trim();
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

correctOverlay.addEventListener("click", finishCorrectAnimation);
correctImage.addEventListener("animationend", (event) => {
    if (event.target === correctImage && event.animationName === "correct-answer") {
        correctHoldTimer = window.setTimeout(finishCorrectAnimation, 700);
    }
});
correctOverlay.addEventListener("animationend", (event) => {
    if (event.target !== correctOverlay || event.animationName !== "correct-overlay-fade") {
        return;
    }

    correctAnimationState = "hidden";
    correctOverlay.hidden = true;
    correctOverlay.classList.remove("is-closing");
    correctOverlay.style.opacity = "";
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
        if (isCorrectAnswer(answer)) {
            showCorrectAnimation();
        }
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

    onValue(
        ref(database, "game/question"),
        (snapshot) => {
            const questions = snapshot.val() ?? {};
            expectedAnswers = Object.fromEntries(
                Object.entries(questions).map(([questionKey, question]) => [
                    Number(questionKey.replace("q", "")),
                    question?.answer,
                ]),
            );
        },
        (error) => {
            console.error("正解データの取得に失敗しました。", error);
            databaseError = "正解データを取得できません。データベースの読み取り権限を確認してください。";
            setDatabaseStatus(databaseError);
        },
    );

    onValue(
        ref(database, "game/startedAt"),
        (snapshot) => {
            startedAt = snapshot.val();
            startTimerUpdates();
        },
        (error) => {
            console.error("ゲーム開始時刻の取得に失敗しました。", error);
            databaseError = "ゲーム開始時刻を取得できません。データベースの読み取り権限を確認してください。";
            setDatabaseStatus(databaseError);
        },
    );

    onValue(
        ref(database, "game/timeLimit"),
        (snapshot) => {
            const timeLimitMinutes = Number(snapshot.val());

            if (!Number.isFinite(timeLimitMinutes) || timeLimitMinutes <= 0) {
                console.error("制限時間の値が不正です。", snapshot.val());
                databaseError = "制限時間を取得できません。game/timeLimitには0より大きい分数を設定してください。";
                setDatabaseStatus(databaseError);
                return;
            }

            gameDurationMs = timeLimitMinutes * 60 * 1000;
            databaseError = "";
            startTimerUpdates();
        },
        (error) => {
            console.error("制限時間の取得に失敗しました。", error);
            databaseError = "制限時間を取得できません。データベースの読み取り権限を確認してください。";
            setDatabaseStatus(databaseError);
        },
    );

    onValue(
        ref(database, "game/paused"),
        (snapshot) => {
            paused = snapshot.val() === true;
            renderPauseOverlay();
            startTimerUpdates();
        },
        (error) => {
            console.error("一時停止状態の取得に失敗しました。", error);
            databaseError = "一時停止状態を取得できません。データベースの読み取り権限を確認してください。";
            setDatabaseStatus(databaseError);
        },
    );

    onValue(
        ref(database, "game/pausedAt"),
        (snapshot) => {
            pausedAt = snapshot.val();
            if (paused) {
                renderTimer();
            }
        },
        (error) => {
            console.error("一時停止時刻の取得に失敗しました。", error);
            databaseError = "一時停止時刻を取得できません。データベースの読み取り権限を確認してください。";
            setDatabaseStatus(databaseError);
        },
    );
} catch (error) {
    console.error("Firebaseの初期化に失敗しました。", error);
    databaseError = "Firebaseを初期化できませんでした。接続設定を確認してください。";
    setDatabaseStatus(databaseError);
}