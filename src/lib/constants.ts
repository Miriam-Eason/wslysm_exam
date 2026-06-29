// 一期统一默认密码（学生导入方案 §9）。绝不存明文，导入时整批 bcrypt 一次。
export const DEFAULT_STUDENT_PASSWORD = "wxls12345";

// 学号：9–10 位数字
export const STUDENT_NO_REGEX = /^[0-9]{9,10}$/;

// 单次导入行数上限（防滥用）
export const MAX_IMPORT_ROWS = 1000;
