import { type ClassValue, clsx } from "clsx";
import { format } from "date-fns";
import { twMerge } from "tailwind-merge";

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

/** 
 * Gets the Date object representing the current moment in IST,
 * mapped to local time for easy calendar math.
 */
export function getISTNow(): Date {
    const now = new Date();
    const str = now.toLocaleString("en-US", { timeZone: "Asia/Kolkata" });
    return new Date(str);
}

/** Format a date string strictly in IST (Asia/Kolkata) */
export function formatISTDate(date: string | Date, options?: Intl.DateTimeFormatOptions): string {
    const d = new Date(date);
    return d.toLocaleDateString('en-US', { timeZone: 'Asia/Kolkata', ...options });
}

/** Format a time string strictly in IST (Asia/Kolkata) */
export function formatISTTime(date: string | Date, options?: Intl.DateTimeFormatOptions): string {
    const d = new Date(date);
    return d.toLocaleTimeString('en-US', { timeZone: 'Asia/Kolkata', ...options });
}

/** 
 * Safely extract Date components (year, month, day, hour, minute) 
 * strictly in the Asia/Kolkata timezone to avoid local-clock drift.
 */
export function getISTParts(date: string | Date) {
    const d = new Date(date);
    const parts = new Intl.DateTimeFormat('en-US', {
        timeZone: 'Asia/Kolkata',
        year: 'numeric', month: 'numeric', day: 'numeric',
        hour: 'numeric', minute: 'numeric', hour12: false
    }).formatToParts(d);
    
    const getPart = (type: string) => parseInt(parts.find(p => p.type === type)?.value || '0', 10);
    const hour = getPart('hour');
    
    return {
        year: getPart('year'),
        month: getPart('month') - 1, // 0-indexed like JS Date
        date: getPart('day'),
        hours: hour === 24 ? 0 : hour,
        minutes: getPart('minute')
    };
}
