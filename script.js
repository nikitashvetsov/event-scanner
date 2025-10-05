// --- 1. ФИКСИРОВАННЫЕ ДАННЫЕ (ИМИТАЦИЯ) ---

// Города/Деревни в радиусе ~100 км от Hürth-Efferen
const CITIES_NEARBY = [
    "Кёльн (Köln)",
    "Бонн (Bonn)",
    "Дюссельдорф (Düsseldorf)",
    "Аахен (Aachen)",
    "Мёнхенгладбах (Mönchengladbach)",
    "Леверкузен (Leverkusen)",
    "Брюль (Brühl)",
    "Майнц (Mainz)" // Для демонстрации большего расстояния
];

// Темы по умолчанию
const DEFAULT_TOPICS = [
    "Open Air Концерты",
    "Фестивали",
    "Деревенские События",
    "События в Замках",
    "Технические Музеи",
    "Железнодорожные Музеи",
    "Дни Открытых Дверей"
];

// Имитация базы данных событий
const ALL_EVENTS = [
    { id: 1, title: "Рейнский Фестиваль Еды", date: "2025-10-18", city: "Кёльн (Köln)", topic: "Фестивали", description: "Большой фестиваль уличной еды у Рейна." },
    { id: 2, title: "День Открытых Дверей в Замке Затсвай", date: "2025-10-19", city: "Брюль (Brühl)", topic: "События в Замках", description: "Экскурсии и рыцарское шоу." },
    { id: 3, title: "Концерт 'Осенний Рок'", date: "2025-10-19", city: "Дюссельдорф (Düsseldorf)", topic: "Open Air Концерты", description: "Вечер рок-музыки под открытым небом." },
    { id: 4, title: "Выставка старых локомотивов", date: "2025-10-25", city: "Мёнхенгладбах (Mönchengladbach)", topic: "Железнодорожные Музеи", description: "Показ исторических поездов." },
    { id: 5, title: "Праздник урожая в деревне", date: "2025-10-26", city: "Аахен (Aachen)", topic: "Деревенские События", description: "Традиционный праздник с музыкой и танцами." },
    { id: 6, title: "Ночь в техническом музее", date: "2025-10-25", city: "Леверкузен (Leverkusen)", topic: "Технические Музеи", description: "Специальная ночная экскурсия по экспонатам." },
    { id: 7, title: "Большой Open Air Фестиваль", date: "2025-10-26", city: "Бонн (Bonn)", topic: "Фестивали", description: "Закрытие сезона фестивалей." },
    { id: 8, title: "Ярмарка в Замке Затсвай", date: "2025-11-02", city: "Брюль (Brühl)", topic: "События в Замках", description: "Средневековая ярмарка." },
    // Событие вне "диапазона" двух выходных, чтобы проверить фильтрацию
    { id: 9, title: "Событие в Майнце", date: "2025-11-08", city: "Майнц (Mainz)", topic: "Дни Открытых Дверей", description: "Далекое событие." }
];

// --- 2. ФУНКЦИИ ДЛЯ РАБОТЫ С ДАТАМИ ---

/**
 * Форматирует объект Date в строку YYYY-MM-DD
 * @param {Date} dateObj - объект даты
 * @returns {string} - строка даты
 */
function formatDate(dateObj) {
    const year = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, '0'); // Месяцы с 0
    const day = String(dateObj.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

/**
 * Находит дату начала и конца следующих двух выходных (сб-вс)
 * @returns {{startDate: string, endDate: string}}
 */
function calculateNextTwoWeekends() {
    const today = new Date();
    const dates = [];

    // Ищем дату начала следующих выходных (ближайшая суббота)
    let current = new Date(today);
    while (current.getDay() !== 6) { // 6 - суббота
        current.setDate(current.getDate() + 1);
    }
    dates.push(new Date(current)); // Первая суббота

    // Находим дату конца вторых выходных (второе воскресенье)
    // Добавляем 7 дней (для перехода на следующую субботу) и еще 1 день (для воскресенья)
    current.setDate(current.getDate() + 7 + 1); 
    dates.push(new Date(current)); // Второе воскресенье

    return {
        startDate: formatDate(dates[0]),
        endDate: formatDate(dates[1])
    };
}

// --- 3. ИНИЦИАЛИЗАЦИЯ ИНТЕРФЕЙСА ---

/**
 * Устанавливает начальные значения дат и создает чекбоксы тем
 */
function initializeApp() {
    const { startDate, endDate } = calculateNextTwoWeekends();
    
    // Установка дат по умолчанию
    document.getElementById('date-start').value = startDate;
    document.getElementById('date-end').value = endDate;

    // Создание чекбоксов для тем
    const container = document.getElementById('topics-container');
    
    DEFAULT_TOPICS.forEach((topic, index) => {
        const div = document.createElement('div');
        div.className = 'topic-item';
        
        const input = document.createElement('input');
        input.type = 'checkbox';
        input.id = `topic-${index}`;
        input.name = 'topic';
        input.value = topic;
        input.checked = true; // По умолчанию выбраны все

        const label = document.createElement('label');
        label.htmlFor = `topic-${index}`;
        label.textContent = topic;

        div.appendChild(input);
        div.appendChild(label);
        container.appendChild(div);
    });

    // Автоматический поиск событий при загрузке (по датам по умолчанию)
    filterEvents();
}

// Запускаем инициализацию при загрузке страницы
document.addEventListener('DOMContentLoaded', initializeApp);


// --- 4. ОСНОВНАЯ ЛОГИКА ФИЛЬТРАЦИИ ---

/**
 * Фильтрует события на основе выбранных пользователем фильтров
 */
function filterEvents() {
    // 1. Получение фильтров
    const startDateStr = document.getElementById('date-start').value;
    const endDateStr = document.getElementById('date-end').value;

    const selectedTopics = Array.from(document.querySelectorAll('input[name="topic"]:checked'))
                               .map(checkbox => checkbox.value);

    // Преобразование строковых дат в объекты Date для сравнения
    const startDate = new Date(startDateStr);
    const endDate = new Date(endDateStr);

    // 2. Фильтрация данных
    const filteredEvents = ALL_EVENTS.filter(event => {
        const eventDate = new Date(event.date);

        // a) Фильтрация по дате
        // Сравниваем только YYYY-MM-DD
        const isDateMatch = eventDate >= startDate && eventDate <= endDate;
        
        // b) Фильтрация по теме
        const isTopicMatch = selectedTopics.includes(event.topic);
        
        // c) Фильтрация по географии (Городам в списке)
        const isCityMatch = CITIES_NEARBY.includes(event.city);

        return isDateMatch && isTopicMatch && isCityMatch;
    });

    // 3. Отображение результатов
    displayEvents(filteredEvents);
}

/**
 * Отображает список событий в HTML
 * @param {Array<Object>} events - Массив отфильтрованных событий
 */
function displayEvents(events) {
    const listContainer = document.getElementById('events-list');
    listContainer.innerHTML = ''; // Очищаем предыдущие результаты

    if (events.length === 0) {
        listContainer.innerHTML = '<p>К сожалению, событий по заданным критериям не найдено. Попробуйте изменить даты или темы.</p>';
        return;
    }

    events.forEach(event => {
        const card = document.createElement('div');
        card.className = 'event-card';

        // Форматируем дату для более красивого вывода
        const displayDate = new Date(event.date).toLocaleDateString('ru-RU', { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric',
            weekday: 'long'
        });

        card.innerHTML = `
            <h3>${event.title}</h3>
            <p><strong>📅 Дата:</strong> ${displayDate}</p>
            <p><strong>📍 Место:</strong> ${event.city}</p>
            <p><strong>🏷️ Тема:</strong> ${event.topic}</p>
            <p>${event.description}</p>
        `;
        listContainer.appendChild(card);
    });
}
