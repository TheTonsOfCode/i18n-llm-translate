
// TODO
// TODO
// TODO
// TODO
// TODO
// TODO
// TODO
// TODO
// TODO
// TODO


export type TranslationKey = string;

export type TranslationLeaf<Value> = {
    [key in TranslationKey]: Value;
};

export type TranslationPrimitiveValue = string | number | boolean;

export type TranslationArrayValue = TranslationPrimitiveValue[];

// Translation tree

export type TranslationTreeValue =
    | TranslationPrimitiveValue
    | TranslationArrayValue
    | TranslationTree;

export interface TranslationTree extends TranslationLeaf<TranslationTreeValue> {}

// Cache tree

export type TranslationCacheValue = TranslationLeaf<TranslationPrimitiveValue | TranslationArrayValue> & {
    valid: boolean
}

type TranslationCacheTreeValue =
    | TranslationPrimitiveValue
    | TranslationArrayValue
    | TranslationCacheTree;

interface TranslationCacheTree extends TranslationLeaf<TranslationCacheTreeValue> {}


/*

if (!cache) return null;
        if (typeof value === 'string') {
            const cachedTranslation = cache[language];
            return cachedTranslation ? cachedTranslation : null;
        } else if (typeof value === 'object' && value !== null) {
            return Object.fromEntries(
                Object.entries(value).map(([key, value]) => [key, walkCache(language, value, cache[key])])
            );
        }
 */

type TranslationWalkType = 'leaf' | 'array' | 'primitive' | 'null';

type TranslationWalker<A, B, R> = (
    a: A,
    aType: TranslationWalkType,
    b: B,
    bType: TranslationWalkType
) => R;

type TranslationWalkerSingle<A, R> = (
    value: A,
    type: TranslationWalkType
) => R;

function getType(val: any): TranslationWalkType {
    if (val === null || val === undefined) return 'null';
    if (Array.isArray(val)) return 'array';
    if (typeof val === 'object') return 'leaf';
    return 'primitive';
}

export function walkTree<A, R>(
    tree: TranslationLeaf<A>,
    walker: TranslationWalkerSingle<A, R>
): TranslationLeaf<R>;

export function walkTree<A, B, R>(
    a: TranslationLeaf<A>,
    b: TranslationLeaf<B>,
    walker: TranslationWalker<A, B, R>
): TranslationLeaf<R>;

export function walkTree(...args: any[]): any {
    if (args.length === 2) {
        const [tree, walker] = args;
        const result: Record<string, any> = {};

        for (const key in tree) {
            const val = tree[key];
            const type = getType(val);
            result[key] =
                type === 'leaf'
                    ? walkTree(val, walker)
                    : walker(val, type);
        }

        return result;
    }

    if (args.length === 3) {
        const [a, b, walker] = args;
        const result: Record<string, any> = {};
        const keys = new Set([...Object.keys(a), ...Object.keys(b)]);

        for (const key of keys) {
            const aVal = a[key];
            const bVal = b[key];
            const aType = getType(aVal);
            const bType = getType(bVal);

            result[key] =
                aType === 'leaf' && bType === 'leaf'
                    ? walkTree(aVal, bVal, walker)
                    : walker(aVal, aType, bVal, bType);
        }

        return result;
    }

    throw new Error("Invalid arguments to walkTree");
}

const a = {
    title: "Hello",
    count: 2,
    nested: {
        value: 5
    }
};

const b = {
    title: "Hi",
    count: 3,
    nested: {
        value: 5,
        other: "x"
    }
};

const diffTree = walkTree(a, b, (a, aType, b, bType) => {
    return `${aType} ${bType}`;
});

// Typ: TranslationLeaf<boolean>
console.log(diffTree);

const aa = {
    title: "Hello",
    count: 1,
    nested: {
        label: "Name",
        items: ["a", "b"]
    },
    ignored: "will be removed"
};

const bb = {
    title: "Hello",
    count: 2,
    nested: {
        label: "Name",
        items: ["a", "c"]
    },
    extra: "also removed"
};

const keepSame = (a: any, aType: TranslationWalkType, b: any, bType: TranslationWalkType) => {
    return a === b ? a : undefined;
};

const common = walkTree(aa, bb, keepSame);

walkTree(aa, (leaf, type) => {
    return type;
})

console.log(JSON.stringify(common, null, 2));