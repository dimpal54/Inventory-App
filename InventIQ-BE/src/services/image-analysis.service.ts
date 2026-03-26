import fs from 'fs';
import aiClient from './ai.service';

const MODEL = process.env.OPENROUTER_MODEL || 'openrouter/free';

export const analyzeInventoryImage = async (
    filePath: string,
    entityType: 'product' | 'category' | 'supplier'
) => {
    const fileBuffer = fs.readFileSync(filePath);
    const base64Image = fileBuffer.toString('base64');

    const prompt = `
You are analyzing an inventory-related image.

Return ONLY raw JSON.
Do NOT wrap the response in markdown.
Do NOT use \`\`\`json.
Do NOT add explanation before or after JSON.
Do not invent values.
If a field is not visible, return empty string.

Entity type: ${entityType}

Expected JSON shape:
{
  "entityType": "${entityType}",
  "confidenceNote": "short note",
  "data": {}
}
`;

    const completion = await aiClient.chat.completions.create(
        {
            model: MODEL,
            messages: [
                {
                    role: 'user',
                    content: [
                        { type: 'text', text: prompt },
                        {
                            type: 'image_url',
                            image_url: {
                                url: `data:image/jpeg;base64,${base64Image}`
                            }
                        }
                    ]
                }
            ],
            temperature: 0.2
        },
        {
            headers: {
                'HTTP-Referer': process.env.SITE_URL || 'http://localhost:4200',
                'X-Title': process.env.SITE_NAME || 'Inventory AI App'
            }
        }
    );

    const text = completion.choices[0]?.message?.content || '{}';
    return JSON.parse(text);
};