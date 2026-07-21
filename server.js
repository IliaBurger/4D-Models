const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

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

// Раздача статических файлов из корня проекта (CSS, загруженные модели и т.д.)
app.use(express.static(__dirname));
// Отдельно разрешаем доступ к папке uploads по URL /uploads/...
app.use('/uploads', express.static(uploadDir));

// Явные маршруты для страниц, чтобы исключить ошибку Cannot GET
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/admin.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'admin.html'));
});

// Временное хранилище списка моделей в памяти
let assets = [];

// API: Получить список всех моделей
app.get('/api/assets', (req, res) => {
  res.json(assets);
});

// API: Загрузить новую модель (из admin.html)
app.post('/api/assets', upload.single('file'), (req, res) => {
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

// API: Удалить модель по ID
app.delete('/api/assets/:id', (req, res) => {
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
