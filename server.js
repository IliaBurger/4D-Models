const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 10000;

// Настройка хранилища для загружаемых 3D файлов
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});
const upload = multer({ storage: storage });

// База данных SQLite
const dbFile = path.join(__dirname, 'pxs.db');
const db = new sqlite3.Database(dbFile, (err) => {
    if (err) {
        console.error('Ошибка подключения к БД:', err.message);
    } else {
        console.log('Подключено к базе данных SQLite.');
        db.run(`CREATE TABLE IF NOT EXISTS assets (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT,
            category TEXT,
            author TEXT,
            price REAL,
            file_path TEXT
        )`);
    }
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname)));
app.use('/uploads', express.static(uploadDir));

// Получение списка всех моделей
app.get('/api/assets', (req, res) => {
    db.all("SELECT * FROM assets ORDER BY id DESC", [], (err, rows) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json(rows);
    });
});

// Загрузка новой модели
app.post('/api/assets', upload.single('modelFile'), (req, res) => {
    const { title, category, author, price } = req.body;
    const filePath = req.file ? `/uploads/${req.file.filename}` : null;

    const query = `INSERT INTO assets (title, category, author, price, file_path) VALUES (?, ?, ?, ?, ?)`;
    db.run(query, [title, category, author, price || 0, filePath], function(err) {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json({
            id: this.lastID,
            title,
            category,
            author,
            price,
            file_path: filePath
        });
    });
});

// Удаление модели по ID (и физического файла с диска)
app.delete('/api/assets/:id', (req, res) => {
    const assetId = req.params.id;
    
    db.get("SELECT file_path FROM assets WHERE id = ?", [assetId], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        
        if (row && row.file_path) {
            const fullPath = path.join(__dirname, row.file_path);
            if (fs.existsSync(fullPath)) {
                fs.unlinkSync(fullPath);
            }
        }

        db.run("DELETE FROM assets WHERE id = ?", [assetId], function(err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ success: true, deletedID: assetId });
        });
    });
});

app.listen(PORT, () => {
    console.log(`Сервер запущен на порту ${PORT}`);
});
