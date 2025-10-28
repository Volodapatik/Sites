const axios = require('axios');

const VISION_API_KEY = 'AIzaSyCDshRGojIokKmiIj3hMxikTJo9ET_EbXE';

exports.handler = async (event, context) => {
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
    };

    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 204, headers, body: '' };
    }

    try {
        const { imageBase64 } = JSON.parse(event.body);
        
        if (!imageBase64) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: 'Нужно изображение' })
            };
        }

        console.log('🔍 Анализируем через Google Vision API...');
        
        const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '');
        const visionResult = await callVisionAPI(base64Data);
        const movieInfo = extractMovieFromVision(visionResult);
        
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                status: 'success',
                movie_name: movieInfo.name,
                confidence: movieInfo.confidence,
                found_text: movieInfo.foundText,
                source: 'google_vision_api'
            })
        };

    } catch (error) {
        console.error('❌ Ошибка:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: 'Ошибка анализа' })
        };
    }
};

async function callVisionAPI(imageBase64) {
    const VISION_API_URL = `https://vision.googleapis.com/v1/images:annotate?key=${VISION_API_KEY}`;
    
    const requestData = {
        requests: [{
            image: { content: imageBase64 },
            features: [
                { type: 'TEXT_DETECTION', maxResults: 10 },
                { type: 'OBJECT_LOCALIZATION', maxResults: 10 },
                { type: 'LABEL_DETECTION', maxResults: 10 }
            ]
        }]
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
        console.log('
cat > netlify/functions/analyze.js << 'EOF'
const axios = require('axios');

const VISION_API_KEY = 'AIzaSyCDshRGojIokKmiIj3hMxikTJo9ET_EbXE';

exports.handler = async (event, context) => {
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
    };

    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 204, headers, body: '' };
    }

    try {
        const { imageBase64 } = JSON.parse(event.body);
        
        if (!imageBase64) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: 'Нужно изображение' })
            };
        }

        console.log('🔍 Анализируем через Google Vision API...');
        
        const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '');
        const visionResult = await callVisionAPI(base64Data);
        const movieInfo = extractMovieFromVision(visionResult);
        
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                status: 'success',
                movie_name: movieInfo.name,
                confidence: movieInfo.confidence,
                found_text: movieInfo.foundText,
                source: 'google_vision_api'
            })
        };

    } catch (error) {
        console.error('❌ Ошибка:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: 'Ошибка анализа' })
        };
    }
};

async function callVisionAPI(imageBase64) {
    const VISION_API_URL = `https://vision.googleapis.com/v1/images:annotate?key=${VISION_API_KEY}`;
    
    const requestData = {
        requests: [{
            image: { content: imageBase64 },
            features: [
                { type: 'TEXT_DETECTION', maxResults: 10 },
                { type: 'OBJECT_LOCALIZATION', maxResults: 10 },
                { type: 'LABEL_DETECTION', maxResults: 10 }
            ]
        }]
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
