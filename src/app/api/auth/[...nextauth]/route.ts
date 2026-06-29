// NextAuth v5 路由处理器：所有 /api/auth/* 请求（含 callback/credentials、signout）由此承接
import { handlers } from "@/auth";

export const { GET, POST } = handlers;
