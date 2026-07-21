let currentPage = 1;
let currentCategory = 'All';
let currentSearch = '';
let currentSort = 'newest';
let currentFileUrl = '';
let downloadTimer = null;
let searchTimeout = null;

async function fetchModels() {
    try {
        const queryParams = new URLSearchParams({
            page: currentPage,
            category: currentCategory,
            search: currentSearch,
            sort: currentSort
        });

        const response = await fetch(`/api/models?${queryParams}`);
        const data = await response.json();

        renderModels(data.models);
        renderPagination(data.totalPages, data.page);
    } catch (err) {
        console.error('Ошибка загрузки моделей:', err);
    }
}

function renderModels(models) {
    const grid = document.getElementById('modelsGrid');
    grid.innerHTML = '';

    if (!models || models.length === 0) {
        grid.innerHTML = '<p style="color: var(--text-muted);">Модели не найдены.</p>';
        return;
    }

    models.forEach(model => {
        const card = document.createElement('div');
        card.className = 'model-card';
        
        // Рендерим превью-картинку или заглушку, если картинка не загружена
        const previewHTML = model.preview_url 
            ? `<img src="${model.preview_url}" alt="${model.title}" class="card-preview-img" loading="lazy">`
            : `<div class="card-preview-placeholder">3D Превью</div>`;

        card.innerHTML = `
            <div class="card-preview-container" onclick="openViewerModal('${model.file_url}')">
                ${previewHTML}
            </div>
            <div class="card-content">
                <span class="badge">${model.category}</span>
                <h3>${model.title}</h3>
                <p style="font-size: 13px; color: var(--text-muted); margin-bottom: 10px;">${model.description || ''}</p>
                <button class="download-btn" onclick="openSubModal('${model.file_url}')">Скачать GLB (Бесплатно)</button>
            </div>
        `;
        grid.appendChild(card);
    });
}

function renderPagination(totalPages, page) {
    const paginationContainer = document.getElementById('paginationContainer');
    paginationContainer.innerHTML = '';

    if (totalPages <= 1) return;

    // Кнопка «Назад»
    const prevBtn = document.createElement('button');
    prevBtn.className = 'page-btn';
    prevBtn.textContent = '← Назад';
    prevBtn.disabled = page === 1;
    prevBtn.onclick = () => {
        if (currentPage > 1) {
            currentPage--;
            fetchModels();
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    };
    paginationContainer.appendChild(prevBtn);

    // Номера страниц (выводим компактно)
    for (let i = 1; i <= totalPages; i++) {
        if (i === 1 || i === totalPages || (i >= page - 2 && i <= page + 2)) {
            const pageBtn = document.createElement('button');
            pageBtn.className = `page-btn ${i === page ? 'active' : ''}`;
            pageBtn.textContent = i;
            pageBtn.onclick = () => {
                currentPage = i;
                fetchModels();
                window.scrollTo({ top: 0, behavior: 'smooth' });
            };
            paginationContainer.appendChild(pageBtn);
        }
    }

    // Кнопка «Вперед»
    const nextBtn = document.createElement('button');
    nextBtn.className = 'page-btn';
    nextBtn.textContent = 'Вперед →';
    nextBtn.disabled = page === totalPages;
    nextBtn.onclick = () => {
        if (currentPage < totalPages) {
            currentPage++;
            fetchModels();
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    };
    paginationContainer.appendChild(nextBtn);
}

// Поиск с задержкой (Debounce), чтобы не дергать сервер при каждом нажатии клавиши
document.getElementById('searchInput').addEventListener('input', (e) => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
        currentSearch = e.target.value;
        currentPage = 1;
        fetchModels();
    }, 400);
});

// Сортировка
document.getElementById('sortSelect').addEventListener('change', (e) => {
    currentSort = e.target.value;
    currentPage = 1;
    fetchModels();
});

// Категории
document.getElementById('categoriesContainer').addEventListener('click', (e) => {
    if (e.target.tagName === 'BUTTON') {
        document.querySelectorAll('.cat-btn').forEach(btn => btn.classList.remove('active'));
        e.target.classList.add('active');
        currentCategory = e.target.getAttribute('data-category');
        currentPage = 1;
        fetchModels();
    }
});

// Модальное окно 3D просмотрщика
function openViewerModal(fileUrl) {
    const modal = document.getElementById('viewerModal');
    const viewer = document.getElementById('activeViewer');
    viewer.src = fileUrl;
    modal.style.display = 'flex';
}

function closeViewerModal() {
    const modal = document.getElementById('viewerModal');
    const viewer = document.getElementById('activeViewer');
    modal.style.display = 'none';
    viewer.src = ''; // Очищаем источник, чтобы остановить рендеринг и освободить память
}

// Модальное окно скачивания
function openSubModal(fileUrl) {
    currentFileUrl = fileUrl;
    document.getElementById('subModal').style.display = 'flex';
    document.getElementById('timerContainer').innerHTML = '';
    document.getElementById('finalDownloadBtn').style.display = 'none';
}

function closeModal() {
    document.getElementById('subModal').style.display = 'none';
    if (downloadTimer) clearInterval(downloadTimer);
}

function startDownloadTimer() {
    let timeLeft = 5;
    const timerContainer = document.getElementById('timerContainer');
    const finalBtn = document.getElementById('finalDownloadBtn');
    
    if (downloadTimer) clearInterval(downloadTimer);
    timerContainer.textContent = `Проверка подписки... (${timeLeft}с)`;

    downloadTimer = setInterval(() => {
        timeLeft--;
        if (timeLeft > 0) {
            timerContainer.textContent = `Проверка подписки... (${timeLeft}с)`;
        } else {
            clearInterval(downloadTimer);
            timerContainer.textContent = 'Готово! Вы можете скачать файл.';
            finalBtn.style.display = 'block';
        }
    }, 1000);
}

function executeDownload() {
    if (!currentFileUrl) return;
    const link = document.createElement('a');
    link.href = currentFileUrl;
    link.download = '';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    closeModal();
}

// Первичная загрузка
fetchModels();