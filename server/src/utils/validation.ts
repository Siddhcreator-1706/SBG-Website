export function isValidPhoneNumber(phone: string): boolean {
    if (!phone) return false;
    
    // Check for illegal characters. Allowed: digits, +, -, spaces, parentheses
    if (!/^[\d\+\-\(\)\s]+$/.test(phone)) return false;

    // Must have between 10 and 15 digits
    const digitsOnly = phone.replace(/\D/g, '');
    return digitsOnly.length >= 10 && digitsOnly.length <= 15;
}
