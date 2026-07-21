document.addEventListener('DOMContentLoaded', () => {
  const modelsGrid = document.getElementById('modelsGrid');
  const searchInput = document.getElementById('searchInput');
  const categoryButtons = document.querySelectorAll('.category-btn');

  let allAssets = [];

  // Загрузка данных с сервера
  async function fetchAssets() {
    try {
      const response = await fetch('/api/assets');
      const data = await response.json();
      allAssets = data.assets || [];
      renderAssets(allAssets);
    } catch (e) {
      console.error('Ошибка загрузки моделей:', e);
    }
  }

  // Отрисовка карточек
  function renderAssets(items) {
    modelsGrid.innerHTML = '';
    
    if (items.length === 0) {
      modelsGrid.innerHTML = '<p style="color: var(--text-secondary);">Модели пока не добавлены.</p>';
      return;
    }

    items.forEach(item => {
      const card = document.createElement('div');
      card.className = 'model-card';
      card.innerHTML = `
        <div class="model-preview">3D Render (${item.category})</div>
        <div class="model-details">
          <div class="model-title">${item.title}</div>
          <div class="model-author">Автор: ${item.author}</div>
        </div>
      `;
      modelsGrid.appendChild(card);
    });
  }

  // Поиск по названию
  searchInput.addEventListener('input', (e) => {
    const val = e.target.value.toLowerCase();
    const filtered = allAssets.filter(item => item.title.toLowerCase().includes(val));
    renderAssets(filtered);
  });

  // Фильтрация по категориям
  categoryButtons.forEach(btn => {
    btn.addEventListener('click', (e) => {
      categoryButtons.forEach(b => b.classList.remove('active'));
      e.target.classList.add('active');
      
      const category = e.target.getAttribute('data-filter');
      if (category === 'all') {
        renderAssets(allAssets);
      } else {
        const filtered = allAssets.filter(item => item.category === category);
        renderAssets(filtered);
      }
    });
  });

  fetchAssets();
});
