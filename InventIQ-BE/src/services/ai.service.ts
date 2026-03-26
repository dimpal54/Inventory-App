import OpenAI from 'openai';

const aiClient = new OpenAI({
    apiKey: process.env.OPENROUTER_API_KEY || 'missing-openrouter-api-key',
    baseURL: process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1',
    defaultHeaders: {
        'HTTP-Referer': process.env.SITE_URL || 'http://localhost:4200',
        'X-OpenRouter-Title': process.env.SITE_NAME || 'Inventory AI App'
    }
});

export default aiClient;
