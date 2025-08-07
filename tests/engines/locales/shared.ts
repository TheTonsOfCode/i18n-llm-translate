import * as path from 'path'

export interface LocaleEnvironment {
    name: string
    code: string
    description: string
    directoryPath: string
    applicationContext: string[]
}

const EnvironmentKeys = ['zoo', 'restaurant', 'with-cache'] as const;
type EnvironmentKey = typeof EnvironmentKeys[number];

let MOCK_ENVIRONMENTS: LocaleEnvironment[] | undefined = undefined;

export function getMockEnvironments(): LocaleEnvironment[] {
    if (MOCK_ENVIRONMENTS) {
        return MOCK_ENVIRONMENTS;
    }

    const environmentNames: EnvironmentKey[] = (process.env?.TEST_ENVIRONMENTS?.split(',') || ['zoo']) as unknown as EnvironmentKey[];

    for (let environmentName of environmentNames) {
        // @ts-ignore
        if (!EnvironmentKeys.includes(environmentName)) {
            throw new Error(`Locale environment "${environmentName}" not found.`);
        }
    }

    function enabled(key: EnvironmentKey) {
        return environmentNames.includes(key) || environmentNames.includes('*' as EnvironmentKey);
    }

    const environments: LocaleEnvironment[] = [];

    if (enabled('zoo')) {
        environments.push({
            name: 'Foo Zoo',
            code: 'zoo',
            description: 'Zoo management application for animal care and visitor services',
            directoryPath: path.join(__dirname, 'env-zoo'),
            applicationContext: [
                'Zoo management application for animal care and visitor services.',
                'Contains translations for animals, exhibits, staff, visitors, and common zoo operations.',
                'Includes variables for animal names, feeding times, temperatures, and visitor information.'
            ]
        });
    }

    if (enabled('restaurant')) {
        environments.push({
            name: 'Restaurant Management',
            code: 'restaurant',
            description: 'Restaurant management application for orders, menu, and staff coordination',
            directoryPath: path.join(__dirname, 'env-restaurant'),
            applicationContext: [
                'Restaurant management application for orders, menu, and staff coordination.',
                'Contains translations for menu items, order processing, and staff management.',
                'Includes variables for prices, cooking times, staff names, and order details.'
            ]
        });
    }

    if (enabled('with-cache')) {
        environments.push({
            name: 'Cache Test Environment',
            code: 'with-cache',
            description: 'Environment for testing translation caching functionality',
            directoryPath: path.join(__dirname, 'env-with-cache'),
            applicationContext: [
                'Test environment for translation caching functionality.',
                'Contains sample translations for cache testing scenarios.',
                'Used to verify cache behavior and performance optimization.'
            ]
        });
    }

    if (!environments.length) {
        throw new Error(`No locale environments found`);
    }

    MOCK_ENVIRONMENTS = environments;

    return environments;
}

export function getEnvironmentByCode(code: string): LocaleEnvironment | undefined {
    return getMockEnvironments().find(env => env.code === code);
}

export function getAllEnvironmentCodes(): string[] {
    return getMockEnvironments().map(env => env.code);
}