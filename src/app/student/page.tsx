import { requireRole } from "@/lib/auth-guard";
import { StudentExamList } from "@/components/student/exam-list";

export default async function StudentHome() {
  const session = await requireRole("student");
  return (
    <StudentExamList
      studentName={session.user.name ?? "同学"}
    />
  );
}
