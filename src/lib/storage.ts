import "server-only";
import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { randomUUID } from "node:crypto";

// Any S3-compatible bucket: Railway Buckets today, Cloudflare R2 or AWS S3 by changing these variables.
const cfg = {
  endpoint: process.env.S3_ENDPOINT,
  bucket: process.env.S3_BUCKET,
  region: process.env.S3_REGION || "auto",
  accessKeyId: process.env.S3_ACCESS_KEY_ID,
  secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
  forcePathStyle: process.env.S3_FORCE_PATH_STYLE === "true",
};

let client: S3Client | null = null;

export function storageConfigured(): boolean {
  return Boolean(cfg.endpoint && cfg.bucket && cfg.accessKeyId && cfg.secretAccessKey);
}

function s3(): S3Client {
  client ??= new S3Client({
    endpoint: cfg.endpoint,
    region: cfg.region,
    forcePathStyle: cfg.forcePathStyle,
    credentials: { accessKeyId: cfg.accessKeyId!, secretAccessKey: cfg.secretAccessKey! },
  });
  return client;
}

function safeName(name: string) {
  return name.replace(/[^A-Za-z0-9._-]+/g, "_").slice(-80) || "file";
}

/** Stores a file and returns its key. Keys are unguessable; files are never public. */
export async function putFile(prefix: string, filename: string, mimeType: string, bytes: Buffer): Promise<string> {
  const key = `${prefix}/${new Date().toISOString().slice(0, 10)}/${randomUUID()}-${safeName(filename)}`;
  await s3().send(
    new PutObjectCommand({ Bucket: cfg.bucket, Key: key, Body: bytes, ContentType: mimeType }),
  );
  return key;
}

export async function getFile(key: string): Promise<Buffer> {
  const res = await s3().send(new GetObjectCommand({ Bucket: cfg.bucket, Key: key }));
  const bytes = await res.Body?.transformToByteArray();
  if (!bytes) throw new Error(`Empty object: ${key}`);
  return Buffer.from(bytes);
}

/** Short-lived link for viewing a private file. Downloads come straight from the bucket. */
export async function signedUrl(key: string, filename: string, seconds = 300): Promise<string> {
  return getSignedUrl(
    s3(),
    new GetObjectCommand({
      Bucket: cfg.bucket,
      Key: key,
      ResponseContentDisposition: `inline; filename="${filename.replace(/["\\]/g, "")}"`,
    }),
    { expiresIn: seconds },
  );
}

/** Saves to the bucket when configured; otherwise returns the bytes to keep in Postgres (local development). */
export async function storeUpload(prefix: string, file: { name: string; type: string; bytes: Buffer }) {
  if (storageConfigured()) return { storageKey: await putFile(prefix, file.name, file.type, file.bytes), bytes: null };
  return { storageKey: null, bytes: file.bytes };
}

export async function loadUpload(row: { storageKey: string | null; bytes: Buffer | null }): Promise<Buffer> {
  if (row.storageKey) return getFile(row.storageKey);
  if (row.bytes) return row.bytes;
  throw new Error("File has no stored content");
}
