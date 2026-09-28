import "server-only";
import { cookies } from "next/headers";
import { SESSION_COOKIE_NAME, verifySessionToken, type SessionPayload } from "@/lib/session";

/**
 * يقرأ الجلسة الحالية من الكوكي الموقّع (JWT). يعيد null إن كانت غير موجودة أو غير صالحة.
 */
export async function getSession(): Promise<SessionPayload | null> {
  const token = cookies().get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}

/**
 * يعيد الجلسة الحالية أو يرمي استثناءً إن لم يكن المستخدم مسجلاً دخوله.
 * تُستخدم داخل أي Server Action أو صفحة تتطلب مستخدماً مسجلاً دخوله.
 */
export async function requireSession(): Promise<SessionPayload> {
  const session = await getSession();
  if (!session) {
    throw new Error("يجب تسجيل الدخول للوصول لهذه الميزة");
  }
  return session;
}

/**
 * تتحقق من امتلاك المستخدم الحالي لصلاحية محددة (مثال: "pos.sell") قبل تنفيذ أي عملية حساسة.
 * تُستخدم في بداية أي Server Action يجب حمايته بمصفوفة الصلاحيات الديناميكية.
 */
export async function requirePermission(permissionKey: string): Promise<SessionPayload> {
  const session = await requireSession();
  if (!session.permissions.includes(permissionKey)) {
    throw new Error("ليس لديك صلاحية كافية لتنفيذ هذه العملية");
  }
  return session;
}

/**
 * يعيد معرّف المستخدم الحالي فقط. هذا هو نفس التوقيع (Signature) المستخدم في كل
 * المراحل السابقة (المشتريات، التحويلات، الورديات، المزامنة)، لذلك لا حاجة لتعديل
 * أي كود آخر يستدعيها بعد استبدال محتواها بنظام الجلسات الحقيقي.
 */
export async function getCurrentUserId(): Promise<string> {
  const session = await requireSession();
  return session.userId;
}
