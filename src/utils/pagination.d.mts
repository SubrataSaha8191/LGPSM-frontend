export function pageWindow(current: number, total: number): (number | "...")[];
export function paginate<T>(items: T[], page: number, pageSize: number): { current: number; totalPages: number; rows: T[] };
