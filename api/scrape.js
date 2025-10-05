// api/scrape.js

import Anthropic from "@anthropic-ai/sdk";
import axios from "axios";

// Инициализируем клиента Claude. 
// Ключ API будет автоматически взят из переменной окружения ANTHROPIC_API_KEY.
const anthropic = new Anthropic();

// Определяем наш список тем для LLM
const TOPICS = [
    "Open Air Концерты",
    "Фестивали",
    "Деревенские События",
    "События в Замках",
    "Технические Музеи",
    "Железнодорожные Музеи",
    "Дни Открытых Дверей"
];

// Здесь указываем сайты, которые будем парсить
const TARGET_URL = "https://www.burgsatzvey.de/"; 

export default async function handler(req, res) {
    // Устанавливаем заголовки CORS, чтобы твой фронтенд мог обращаться к API
    res.setHeader('Access-Control-Allow-Origin', '*'); 
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // Обрабатываем CORS-префлайт запрос
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'GET') {
        return res.status(405).json({ error: "Метод не разрешен. Используйте GET." });
    }

    try {
        // --- 1. Загрузка Сырого HTML ---
        console.log(`Загрузка HTML с ${TARGET_URL}...`);
        const response = await axios.get(TARGET_URL);
        const htmlContent = response.data;
        
        // Ограничиваем HTML, чтобы не переплачивать за огромные токены. 
        // 50 000 символов должно хватить для релевантной части страницы событий.
        const limitedHtml = htmlContent.substring(0, 50000); 

        // --- 2. Формирование Промпта для Claude ---
        const prompt = `
            Ты — эксперт по извлечению структурированных данных из HTML-кода. 
            Твоя задача — найти все предстоящие события, их даты, названия и описание в приложенном HTML.
            
            Требования:
            1. Извлекай только события, относящиеся к следующим темам: ${TOPICS.join(', ')}.
            2. Извлекай данные на следующие 2-3 месяца.
            3. Верни ТОЛЬКО валидный JSON-массив, где каждый объект имеет поля: 
               { 
                 "title": "Название события", 
                 "date": "Дата события в формате YYYY-MM-DD", 
                 "description": "Краткое описание", 
                 "topic": "Одна из заданных тем", 
                 "link": "Полный URL, если есть" 
               }

            НЕ ВКЛЮЧАЙ никаких пояснений, комментариев или других символов, кроме самого JSON-массива.
            
            --- HTML для анализа ---
            ${limitedHtml}
        `;

        // --- 3. Вызов Claude API ---
        console.log("Отправка запроса в Claude API...");

        const claudeResponse = await anthropic.messages.create({
            model: "claude-3-opus-20240229", // Используем мощную модель для сложных задач
            max_tokens: 4000,
            messages: [{ role: "user", content: prompt }],
            temperature: 0.1 // Низкая температура для точного извлечения данных
        });

        // Получаем текстовый ответ (JSON) от Claude
        const jsonText = claudeResponse.content[0].text.trim();
        
        // Claude может иногда возвращать JSON с дополнительными символами. 
        // Попытаемся найти и извлечь только массив [...]
        const jsonMatch = jsonText.match(/\[[\s\S]*?\]/);
        
        if (!jsonMatch) {
            console.error("Claude вернул невалидный JSON:", jsonText);
            return res.status(500).json({ error: "Не удалось извлечь валидный JSON из ответа Claude." });
        }
        
        const events = JSON.parse(jsonMatch[0]);

        // --- 4. Отправка Чистых Данных на Фронтенд ---
        res.status(200).json(events);

    } catch (error) {
        console.error("Ошибка API:", error.message);
        res.status(500).json({ 
            error: "Ошибка при обработке запроса", 
            details: error.message 
        });
    }
}
