const express = require('express');
const app = express();
app.use('/uploads', express.static('uploads'));
// Константы для Telegram-канала
const TG_CHANNEL_URL = "https://t.me/Public4DRY";
const TG_CHANNEL_USERNAME = "@Public4DRY";

app.use(express.json());

// Эндпоинт для передачи конфигурации клиенту
app.get('/api/config', (req, res) => {
    res.json({
        telegramUrl: TG_CHANNEL_URL,
        telegramUsername: TG_CHANNEL_USERNAME
    });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server started on port ${PORT}`);
});
