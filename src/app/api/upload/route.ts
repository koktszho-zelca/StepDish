import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { createPresignedUploadUrl } from '@/lib/r2'
import { randomUUID } from 'crypto'
import path from 'path'

const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])
const MAX_BYTES = 5 * 1024 * 1024 // 5 MB

export async function POST(req: NextRequest) {
  // Auth guard
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: { filename?: string; contentType?: string; contentLength?: number }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { filename, contentType, contentLength } = body

  // Validate content type
  if (!contentType || !ALLOWED_TYPES.has(contentType)) {
    return NextResponse.json({ error: 'Invalid file type' }, { status: 400 })
  }

  // Validate file size
  if (typeof contentLength === 'number' && contentLength > MAX_BYTES) {
    return NextResponse.json({ error: 'File too large' }, { status: 413 })
  }

  // Build a unique, collision-safe storage key scoped to the user
  const ext = filename ? path.extname(filename).toLowerCase() : '.jpg'
  const key = `uploads/${userId}/${randomUUID()}${ext}`

  try {
    const { uploadUrl, publicUrl } = await createPresignedUploadUrl({
      key,
      contentType,
      contentLength: contentLength ?? 0,
    })

    return NextResponse.json({ uploadUrl, publicUrl }, { status: 200 })
  } catch (err) {
    console.error('[upload] Failed to create presigned URL', err)
    return NextResponse.json({ error: 'Failed to generate upload URL' }, { status: 500 })
  }
}
