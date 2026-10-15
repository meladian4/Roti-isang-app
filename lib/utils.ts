import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number): string {
  const hasDecimals = amount % 1 !== 0
  const maxDigits = amount > 0 && amount < 1 ? 3 : hasDecimals ? 2 : 0
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: maxDigits,
  }).format(amount)
}

export function formatDate(date: Date | string): string {
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(new Date(date))
}

export function formatNumber(num: number): string {
  const hasDecimals = num % 1 !== 0
  return new Intl.NumberFormat("id-ID", {
    maximumFractionDigits: hasDecimals ? 3 : 0,
  }).format(num)
}
