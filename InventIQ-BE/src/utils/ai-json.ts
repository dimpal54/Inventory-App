export const parseJsonSafely = <T>(text: string, fallback: T): T => {
    const cleaned = text
        .replace(/```json\s*/gi, '')
        .replace(/```\s*/g, '')
        .trim();

    try {
        return JSON.parse(cleaned) as T;
    } catch {
        const firstBrace = cleaned.indexOf('{');
        const lastBrace = cleaned.lastIndexOf('}');

        if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
            const possibleJson = cleaned.slice(firstBrace, lastBrace + 1);

            try {
                return JSON.parse(possibleJson) as T;
            } catch {
                return fallback;
            }
        }

        return fallback;
    }
};