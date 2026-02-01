/**
 * Validates if the string is a valid email address.
 * Uses a standard regex pattern that checks for:
 * - Non-whitespace characters before the @
 * - An @ symbol
 * - Non-whitespace characters after the @
 * - A dot .
 * - Non-whitespace characters after the dot
 */
export const isValidEmail = (email: string): boolean => {
    if (!email) return false;

    // Robust email regex
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
};

/**
 * Validates if a password is strong enough.
 * Current requirement: Minimum 8 characters.
 */
export const isStrongPassword = (password: string): boolean => {
    if (!password) return false;
    return password.length >= 8;
};
