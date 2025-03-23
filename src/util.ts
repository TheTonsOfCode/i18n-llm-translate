export function flattenObject(obj: any, parentKey: string = ''): Record<string, string> {
    let result: Record<string, string> = {};

    for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
            const newKey = parentKey ? `${parentKey}.${key}` : key;

            if (typeof obj[key] === 'object' && obj[key] !== null) {
                Object.assign(result, flattenObject(obj[key], newKey));
            } else {
                result[newKey] = String(obj[key]);
            }
        }
    }

    return result;
}

export function unflattenObject(flatTranslations: Record<string, string>): Record<string, any> {
    const result: Record<string, any> = {};

    for (const key in flatTranslations) {
        if (flatTranslations.hasOwnProperty(key)) {
            const keys = key.split('.');
            let current = result;

            keys.forEach((part, index) => {
                if (index === keys.length - 1) {
                    current[part] = flatTranslations[key];
                } else {
                    if (!current[part]) {
                        current[part] = {};
                    }
                    current = current[part];
                }
            });
        }
    }

    return result;
}

export function logWithColor(color: 'red' | 'green' | 'yellow', firstMessage: string, ...otherMessages: any[]) {
    const colorCodes: Record<string, string> = {
        red: "\x1b[31m",
        green: "\x1b[32m",
        yellow: "\x1b[33m"
    };

    const colorCode = colorCodes[color] || "\x1b[0m"; // Default to reset if invalid color

    console.log(`${colorCode}%s\x1b[0m`, firstMessage, ...otherMessages);
}