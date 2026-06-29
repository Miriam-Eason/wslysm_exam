import Link from "next/link";
import Image from "next/image";

// 入口落地页：三端登录导航（便于联调与角色切换）
const PORTALS = [
  { href: "/student/login", title: "学生端", desc: "做题、练习、考试、错题本" },
  { href: "/teacher/login", title: "教师端", desc: "班级、题库、组卷、成绩统计" },
  { href: "/admin/login", title: "超管端", desc: "教师 / 学生账号管理" },
];

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-10 bg-surface px-6 py-16">
      <header className="flex flex-col items-center gap-5 text-center">
        <Image
          src="/school-logo.png"
          alt="无锡旅游商贸高等职业技术学校"
          width={1500}
          height={234}
          priority
          className="h-auto w-full max-w-[420px]"
        />
        <div className="h-px w-16 bg-outline-variant/50" />
        <h1 className="text-3xl font-bold tracking-tight text-on-surface">
          无锡旅商智能练测系统
        </h1>
        <p className="text-on-surface-variant">请选择登录入口</p>
      </header>

      <div className="grid w-full max-w-3xl gap-4 sm:grid-cols-3">
        {PORTALS.map((p) => (
          <Link
            key={p.href}
            href={p.href}
            className="group flex flex-col gap-2 rounded-[var(--radius-card)] border border-outline-variant/60 bg-surface-container-lowest p-6 shadow-[0_4px_24px_rgba(0,91,193,0.06)] transition hover:-translate-y-0.5 hover:shadow-[0_10px_36px_rgba(0,91,193,0.12)]"
          >
            <h2 className="text-lg font-semibold text-on-surface group-hover:text-primary">
              {p.title}
            </h2>
            <p className="text-sm text-on-surface-variant">{p.desc}</p>
          </Link>
        ))}
      </div>
    </main>
  );
}
