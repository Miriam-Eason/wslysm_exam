import Image from "next/image";

type Props = {
  /** 门户角色小标签，如「教师端」「学生端」「超管控制台」 */
  role: string;
  /** 副标题说明 */
  subtitle: string;
  /** 对齐：学生端移动居中，教师/超管 PC 左对齐 */
  align?: "left" | "center";
  /** 角色标签颜色（超管端用中性色） */
  roleClassName?: string;
};

// 登录页品牌区：校徽 + 系统名「无锡旅商智能练测系统」+ 门户副标题
export function LoginBrand({
  role,
  subtitle,
  align = "left",
  roleClassName = "text-primary",
}: Props) {
  const center = align === "center";
  return (
    <header
      className={`mb-8 flex flex-col gap-5 ${center ? "items-center text-center" : ""}`}
    >
      <Image
        src="/school-logo.png"
        alt="无锡旅游商贸高等职业技术学校"
        width={1500}
        height={234}
        priority
        className={`h-auto w-full ${center ? "max-w-[260px]" : "max-w-[300px]"}`}
      />
      {/* 校徽与系统名之间的发丝分隔，呼应院校官方质感 */}
      <div
        className={`h-px bg-outline-variant/50 ${center ? "w-16" : "w-full"}`}
      />
      <div className={`flex flex-col gap-2 ${center ? "items-center" : ""}`}>
        <span
          className={`text-xs font-semibold uppercase tracking-widest ${roleClassName}`}
        >
          {role}
        </span>
        <h1 className="text-2xl font-bold tracking-tight text-on-surface">
          无锡旅商智能练测系统
        </h1>
        <p className="text-sm text-on-surface-variant">{subtitle}</p>
      </div>
    </header>
  );
}
