import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import { format } from "date-fns"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function toLocalISOString(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

export function isValidPhoneNumber(phone: string): boolean {
    if (!phone) return false;
    if (!/^[\d\+\-\(\)\s]+$/.test(phone)) return false;
    const digitsOnly = phone.replace(/\D/g, '');
    return digitsOnly.length >= 10 && digitsOnly.length <= 15;
}
