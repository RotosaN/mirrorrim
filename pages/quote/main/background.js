const canvas = document.querySelector("#background-wave");
const context = canvas.getContext("2d");
const motionPreference = window.matchMedia("(prefers-reduced-motion: reduce)");

if (!context) {
    console.error("背景アニメーション用のCanvasを初期化できませんでした。");
} else {
    let width = 0;
    let height = 0;
    let animationFrame = 0;
    const spacing = 38;

    function resizeCanvas() {
        const pixelRatio = Math.min(window.devicePixelRatio || 1, 1.5);
        width = window.innerWidth;
        height = window.innerHeight;
        canvas.width = Math.round(width * pixelRatio);
        canvas.height = Math.round(height * pixelRatio);
        context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
        drawWave(0);
    }

    function drawWave(time) {
        context.clearRect(0, 0, width, height);

        for (let y = -spacing; y <= height + spacing; y += spacing) {
            for (let x = -spacing; x <= width + spacing; x += spacing) {
                const depth = Math.sin(x * 0.012 + time) * Math.cos(y * 0.015 - time * 0.75);
                const perspective = 700 / (700 - depth * 24);
                const projectedX = (x - width / 2) * perspective + width / 2;
                const projectedY = (y - height / 2) * perspective + height / 2 + depth * 10;
                const intensity = (depth + 1) / 2;
                const radius = 1.1 + intensity * 1.1;

                context.beginPath();
                context.arc(projectedX, projectedY, radius, 0, Math.PI * 2);
                context.fillStyle = `rgba(255, 127, 0, ${0.1 + intensity * 0.18})`;
                context.fill();
            }
        }
    }

    function animate(timestamp) {
        drawWave(timestamp * 0.00035);
        if (!motionPreference.matches) {
            animationFrame = window.requestAnimationFrame(animate);
        }
    }

    function updateMotionPreference() {
        window.cancelAnimationFrame(animationFrame);
        if (motionPreference.matches) {
            drawWave(0);
        } else {
            animationFrame = window.requestAnimationFrame(animate);
        }
    }

    window.addEventListener("resize", resizeCanvas);
    motionPreference.addEventListener("change", updateMotionPreference);
    resizeCanvas();
    updateMotionPreference();
}
