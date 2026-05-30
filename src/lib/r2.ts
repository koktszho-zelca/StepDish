import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

const REQUIRED_VARS = [
  'CLOUDFLARE_ACCOUNT_ID',
  'R2_ACCESS_KEY_ID',
  'R2_SECRET_ACCESS_KEY',
  'R2_BUCKET_NAME',
  'R2_PUBLIC_URL',
] as const

for (const v of REQUIRED_VARS) {
  if (!process.env[v]) {
    throw new Error(`[r2] Missing required environment variable: ${v}`)
  }
}

export const r2 = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
})

export const R2_BUCKET = process.env.R2_BUCKET_NAME!
export const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL!.replace(/\/$/, '')

/** Generate a presigned PUT URL valid for 5 minutes. */
export async function createPresignedUploadUrl({
  key,
  contentType,
  contentLength,
}: {
  key: string
  contentType: string
  contentLength: number
}): Promise<{ uploadUrl: string; publicUrl: string }> {
  const command = new PutObjectCommand({
    Bucket: R2_BUCKET,
    Key: key,
    ContentType: contentType,
    ContentLength: contentLength,
  })

  const uploadUrl = await getSignedUrl(r2, command, { expiresIn: 300 })
  const publicUrl = `${R2_PUBLIC_URL}/${key}`

  return { uploadUrl, publicUrl }
}
