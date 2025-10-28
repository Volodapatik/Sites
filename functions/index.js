const functions = require('firebase-functions');
const axios = require('axios');

// 🔑 ТВОЙ КЛЮЧ
const VISION_API_KEY = 'AIzaSyCDshRGojIokKmiIj3hMxikTJo9ET_EbXE';
const VISION_API_URL = `https://vision.googleapis.com/v1/images:annotate?key=${VISION_API_KEY}`;

exports.analyzeScreenshot = functions.https.onRequest(async (req, res) => {
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(204).send('');
    if (req.method !== 'POST') return res.status(405).json({ error: 'Only POST' });

    try {
        const { imageBase64 } = req.body;
        
        if (!imageBase64) {
            return res.status(400).json({ error: 'Нужно изображение' });
        }

        console.log('🔍 Анализируем через Google Vision API...');
        
        const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '');
        const visionResult = await callVisionAPI(base64Data);
        const movieInfo = extractMovieFromVision(visionResult);
        
        res.json({
            status: 'success',
            movie_name: movieInfo.name,
            confidence: movieInfo.confidence,
            found_text: movieInfo.foundText,
            source: 'google_vision_api'
        });

    } catch (error) {
        console.error('❌ Ошибка:', error);
        res.status(500).json({ error: 'Ошибка анализа' });
    }
});

async function callVisionAPI(imageBase64) {
    const requestData = {
        requests: [
            {
                image: { content: imageBase64 },
                features: [
                    { type: 'TEXT_DETECTION', maxResults: 10 },
                    { type: 'OBJECT_LOCALIZATION', maxResults: 10 },
                    { type: 'LABEL_DETECTION', maxResults: 10 }
                ]
            }
        ]
    };

    const response = await axios.post(VISION_API_URL, requestData);
    return response.data;
}

function extractMovieFromVision(visionData) {
    const response = visionData.responses[0];
    const textAnnotations = response.textAnnotations || [];
    let detectedText = '';
    
    if (textAnnotations.length > 0) {
        detectedText = textAnnotations[0].description;
        console.log('📝 Найден текст:', detectedText);
        
        const movieMatch = findMovieInText(detectedText);
        if (movieMatch) {
            return {
                name: movieMatch,
                confidence: 85,
                foundText: detectedText
            };
        }
    }
    
    const objectAnnotations = response.localizedObjectAnnotations || [];
    const labels = response.labelAnnotations || [];
    
    console.log('🎭 Объекты:', objectAnnotations.map(obj => obj.name));
    console.log('🏷️ Метки:', labels.map(label => label.description));
    
    const movieFromObjects = analyzeObjectsForMovie(objectAnnotations, labels);
    if (movieFromObjects) return movieFromObjects;
    
    return {
        name: 'Не удалось определить фильм',
        confidence: 0,
        foundText: detectedText
    };
}

function findMovieInText(text) {
    const lowerText = text.toLowerCase();
    
    const movies = [
        'greenland', 'начало', 'inception', 'матрица', 'matrix',
        'аватар', 'avatar', 'интерстеллар', 'interstellar',
        'побег из шоушенка', 'shawshank', 'криминальное чтиво', 'pulp fiction',
        'звездные войны', 'star wars', 'гарри поттер', 'harry potter',
        'властелин колец', 'lord of the rings', 'форсаж', 'fast and furious'
    ];
    
    for (const movie of movies) {
        if (lowerText.includes(movie.toLowerCase())) {
            return movie;
        }
    }
    
    return null;
}

function analyzeObjectsForMovie(objects, labels) {
    const objectNames = objects.map(obj => obj.name);
    const labelNames = labels.map(label => label.description);
    
    if (objectNames.includes('person') && labelNames.includes('science fiction')) {
        return { name: 'Научно-фантастический фильм', confidence: 60, foundText: '' };
    }
    
    return null;
}

exports.healthCheck = functions.https.onRequest((req, res) => {
    res.set('Access-Control-Allow-Origin', '*');
    res.json({ 
        status: 'working', 
        message: 'Movie Finder API готов к работе!',
        timestamp: new Date().toISOString()
    });
});
