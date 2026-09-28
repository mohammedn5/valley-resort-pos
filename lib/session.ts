import { SignJWT, jwtVerify } from "jose";

export const SESSION_COOKIE_NAME = "valley_session";
export const SESSION_DURATION_SECONDS = 60 * 60 * 12; // 12 ساعة

export type SessionPayload = {
  userId: string;
  username: string;
  name: string;
  roleId: string;
  roleName: string;
  permissions: string[];
};

function getSecretKey(): Uint8Array {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error(
      "متغير البيئة SESSION_SECRET غير معرّف أو قصير جداً - أضِف قيمة عشوائية لا تقل عن 16 حرفاً في ملف .env",
    );
  }
  return new TextEncoder().encode(secret);
}

export async function createSessionToken(payload: SessionPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DURATION_SECONDS}s`)
    .sign(getSecretKey());
}

/**
 * تعمل في بيئتي Node.js و Edge Runtime على حد سواء (لذا يمكن استخدامها داخل الـ Middleware)
 */
export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecretKey());
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}
