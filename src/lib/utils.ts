import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

// className 合并：clsx 条件拼接 + tailwind-merge 去冲突
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
