import { requireRole } from "@/lib/auth-guard";
import { ExamClient } from "./exam-client";

export default async function ExamPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireRole("student");
  const { id } = await params;
  const examId = Number(id);
  return <ExamClient examId={examId} />;
}
