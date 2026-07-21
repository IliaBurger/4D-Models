const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// Настройка логина и пароля администратора
const ADMIN_USER = "admin";
const ADMIN_PASS = "12345"; // Вы можете изменить пароль здесь

// Создаем папку для загрузок в корне, если она еще не создана
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Настройка хранилища для файлов моделей (.glb / .gltf) через multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ storage: storage });

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Раздача статических файлов из корня проекта
app.use(express.static(__dirname));
app.use('/uploads', express.static(uploadDir));

// Функция проверки авторизации (Basic Auth) для панели управления
function checkAuth(req, res, next) {
  const authheader = req.headers.authorization;
  if (!authheader) {
    res.setHeader('WWW-Authenticate', 'Basic realm="Admin Panel"');
    return res.status(401).send('Требуется авторизация');
  }

  const auth = Buffer.from(authheader.split(' ')[1], 'base64').toString().split(':');
  const user = auth[0];
  const pass = auth[1];

  if (user === ADMIN_USER && pass === ADMIN_PASS) {
    next();
  } else {
    res.setHeader('WWW-Authenticate', 'Basic realm="Admin Panel"');
    res.status(401).send('Неверный логин или пароль');
  }
}

// Явные маршруты для страниц
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Защищаем страницу админки паролем
app.get('/admin.html', checkAuth, (req, res) => {
  res.sendFile(path.join(__dirname, 'admin.html'));
});

// Хранилище списка моделей в памяти
let assets = [];

// API: Получить список всех моделей (доступно всем)
app.get('/api/assets', (req, res) => {
  res.json(assets);
});

// API: Загрузить новую модель (только для администратора)
app.post('/api/assets', checkAuth, upload.single('file'), (req, res) => {
  try {
    const { title, category, author } = req.body;
    
    if (!req.file) {
      return res.status(400).json({ error: 'Файл модели не передан' });
    }

    const file_path = `/uploads/${req.file.filename}`;

    const newAsset = {
      id: Date.now().toString(),
      title: title || 'Без названия',
      category: category || 'Furniture',
      author: author || '4D Models',
      file_path: file_path
    };

    assets.push(newAsset);
    res.status(201).json(newAsset);
  } catch (err) {
    console.error('Ошибка при загрузке модели:', err);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// API: Удалить модель по ID (только для администратора)
app.delete('/api/assets/:id', checkAuth, (req, res) => {
  const modelId = req.params.id;
  const modelIndex = assets.findIndex(a => a.id === modelId);

  if (modelIndex === -1) {
    return res.status(404).json({ error: 'Модель не найдена' });
  }

  const model = assets[modelIndex];
  
  // Удаляем физический файл с диска
  const absolutePath = path.join(__dirname, model.file_path);
  if (fs.existsSync(absolutePath)) {
    try {
      fs.unlinkSync(absolutePath);
    } catch (e) {
      console.error('Не удалось удалить файл с диска:', e);
    }
  }

  // Удаляем из массива
  assets.splice(modelIndex, 1);
  res.json({ success: true });
});

// Запуск сервера
app.listen(PORT, () => {
  console.log(`Сервер успешно запущен на порту ${PORT}`);
});
