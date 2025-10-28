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
        const body = JSON.parse(event.body);
        const imageBase64 = body.imageBase64;
        
        if (!imageBase64) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: 'No image provided' })
            };
        }

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
                found_text: movieInfo.foundText
            })
        };

    } catch (error) {
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: 'Server error: ' + error.message })
        };
    }
};

async function callVisionAPI(imageBase64) {
    const VISION_API_URL = 'https://vision.googleapis.com/v1/images:annotate?key=' + VISION_API_KEY;
    
    const requestData = {
        requests: [{
            image: { content: imageBase64 },
            features: [{ type: 'TEXT_DETECTION', maxResults: 5 }]
        }]
    };

    const response = await axios.post(VISION_API_URL, requestData);
    return response.data;
}

function extractMovieFromVision(visionData) {
    if (!visionData.responses || !visionData.responses[0]) {
        return { name: 'No data from API', confidence: 0, foundText: '' };
    }

    const response = visionData.responses[0];
    const textAnnotations = response.textAnnotations || [];
    
    let detectedText = '';
    if (textAnnotations.length > 0) {
        detectedText = textAnnotations[0].description;
        const movieMatch = findMovieInText(detectedText);
        if (movieMatch) {
            return { name: movieMatch, confidence: 85, foundText: detectedText };
        }
    }
    
    return { name: 'Movie not found', confidence: 0, foundText: detectedText };
}

function findMovieInText(text) {
    const lowerText = text.toLowerCase();
    const movies = ['greenland', 'inception', 'matrix', 'avatar', 'interstellar'];
    
    for (const movie of movies) {
        if (lowerText.includes(movie)) {
            return movie;
        }
    }
    return null;
}
