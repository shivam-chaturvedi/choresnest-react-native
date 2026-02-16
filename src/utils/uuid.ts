import uuidModule from 'react-native-uuid';

type UuidGenerator = () => string;

const resolveGenerator = (): UuidGenerator | null => {
    if (typeof uuidModule === 'function') {
        return uuidModule;
    }

    const maybeModule = uuidModule as Record<string, any>;
    if (typeof maybeModule.v4 === 'function') {
        return maybeModule.v4.bind(maybeModule);
    }

    if (maybeModule.default && typeof maybeModule.default.v4 === 'function') {
        return maybeModule.default.v4.bind(maybeModule.default);
    }

    return null;
};

const uuidGenerator: UuidGenerator | null = resolveGenerator();

export const uuidv4 = (): string => {
    if (!uuidGenerator) {
        throw new Error('UUID generator is not available');
    }
    return uuidGenerator();
};
