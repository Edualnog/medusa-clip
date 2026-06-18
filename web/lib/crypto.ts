import crypto from "node:crypto";

// AES-256-GCM pra cifrar a chave de API do usuario antes de guardar.
// O segredo (KEY_ENCRYPTION_SECRET) vive SO no servidor — nem um dump do banco
// revela as chaves sem ele. Use o MESMO segredo em dev e em producao (Vercel).

function getKey(): Buffer {
  const secret = process.env.KEY_ENCRYPTION_SECRET;
  if (!secret) throw new Error("KEY_ENCRYPTION_SECRET ausente no servidor");
  const buf = Buffer.from(secret, secret.length === 64 ? "hex" : "base64");
  if (buf.length !== 32) {
    throw new Error("KEY_ENCRYPTION_SECRET precisa ter 32 bytes (base64 ou hex)");
  }
  return buf;
}

export function encrypt(plain: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", getKey(), iv);
  const ct = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv.toString("base64"), tag.toString("base64"), ct.toString("base64")].join(":");
}

export function decrypt(blob: string): string {
  const [ivb, tagb, ctb] = blob.split(":");
  const decipher = crypto.createDecipheriv("aes-256-gcm", getKey(), Buffer.from(ivb, "base64"));
  decipher.setAuthTag(Buffer.from(tagb, "base64"));
  return Buffer.concat([decipher.update(Buffer.from(ctb, "base64")), decipher.final()]).toString("utf8");
}
