// 统一 API 响应封装（PRD §9）：成功 { ok:true, data }；失败 { ok:false, error:{code,message,details?} }
import { NextResponse } from "next/server";

export function ok<T>(data: T, init?: ResponseInit) {
  return NextResponse.json({ ok: true as const, data }, init);
}

type ErrCode =
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "VALIDATION"
  | "CONFLICT"
  | "INTERNAL";

const STATUS: Record<ErrCode, number> = {
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  VALIDATION: 422,
  CONFLICT: 409,
  INTERNAL: 500,
};

export function fail(
  code: ErrCode,
  message: string,
  details?: unknown,
) {
  return NextResponse.json(
    { ok: false as const, error: { code, message, details } },
    { status: STATUS[code] },
  );
}

// 列表分页参数解析（?page&pageSize），带安全边界
export function parsePagination(searchParams: URLSearchParams) {
  const page = Math.max(1, Number(searchParams.get("page")) || 1);
  const pageSizeRaw = Number(searchParams.get("pageSize")) || 20;
  const pageSize = Math.min(100, Math.max(1, pageSizeRaw));
  return { page, pageSize, skip: (page - 1) * pageSize, take: pageSize };
}
