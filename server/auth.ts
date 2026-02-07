import crypto from "crypto";

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret";
const JWT_ALG = "HS256";
const JWT_TYPE = "JWT";
const TOKEN_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days

type JwtPayload = {
  sub: string;
  iat: number;
  exp: number;
};

function base64UrlEncode(value: object): string {
  return Buffer.from(JSON.stringify(value)).toString("base64url");
}

function base64UrlDecode<T>(value: string): T {
  return JSON.parse(Buffer.from(value, "base64url").toString("utf8")) as T;
}

function sign(input: string): string {
  return crypto
    .createHmac("sha256", JWT_SECRET)
    .update(input)
    .digest("base64url");
}

export function createToken(userId: string): string {
  const now = Math.floor(Date.now() / 1000);
  const payload: JwtPayload = {
    sub: userId,
    iat: now,
    exp: now + TOKEN_TTL_SECONDS,
  };

  const header = { alg: JWT_ALG, typ: JWT_TYPE };
  const encodedHeader = base64UrlEncode(header);
  const encodedPayload = base64UrlEncode(payload);
  const unsignedToken = `${encodedHeader}.${encodedPayload}`;
  const signature = sign(unsignedToken);

  return `${unsignedToken}.${signature}`;
}

export function verifyToken(token: string): JwtPayload | null {
  const parts = token.split(".");
  if (parts.length !== 3) return null;

  const [encodedHeader, encodedPayload, signature] = parts;
  const unsignedToken = `${encodedHeader}.${encodedPayload}`;
  const expectedSignature = sign(unsignedToken);

  const signatureBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expectedSignature);
  if (
    signatureBuffer.length !== expectedBuffer.length ||
    !crypto.timingSafeEqual(signatureBuffer, expectedBuffer)
  ) {
    return null;
  }

  const header = base64UrlDecode<{ alg: string; typ: string }>(encodedHeader);
  if (header.alg !== JWT_ALG || header.typ !== JWT_TYPE) {
    return null;
  }

  const payload = base64UrlDecode<JwtPayload>(encodedPayload);
  if (payload.exp < Math.floor(Date.now() / 1000)) {
    return null;
  }

  return payload;
}
