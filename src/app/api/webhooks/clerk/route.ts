import { Webhook } from 'svix'
import { headers } from 'next/headers'
import { WebhookEvent } from '@clerk/nextjs/server'
import { prisma } from '@/lib/db/client'

export async function POST(req: Request) {
  const body = await req.text()
  const headerPayload = await headers()

  const svixId = headerPayload.get('svix-id')
  const svixTimestamp = headerPayload.get('svix-timestamp')
  const svixSignature = headerPayload.get('svix-signature')

  if (!svixId || !svixTimestamp || !svixSignature) {
    return new Response('Missing svix headers', { status: 400 })
  }

  const webhookSecret = process.env.CLERK_WEBHOOK_SECRET
  if (!webhookSecret) {
    // Deployment/config bug — log server-side only, don't leak config state to caller
    console.error('[Webhook] CLERK_WEBHOOK_SECRET is not set')
    return new Response('Internal error', { status: 500 })
  }

  const wh = new Webhook(webhookSecret)
  let event: WebhookEvent

  try {
    event = wh.verify(body, {
      'svix-id': svixId,
      'svix-timestamp': svixTimestamp,
      'svix-signature': svixSignature,
    }) as WebhookEvent
  } catch {
    return new Response('Invalid webhook signature', { status: 400 })
  }

  if (event.type === 'user.created' || event.type === 'user.updated') {
    const { id, email_addresses, first_name, last_name } = event.data
    const email = email_addresses[0]?.email_address

    if (!email) {
      return new Response('No email address found', { status: 400 })
    }

    // Only compute displayName from non-null values
    const displayName = `${first_name ?? ''} ${last_name ?? ''}`.trim()

    await prisma.user.upsert({
      where: { clerkId: id },
      update: {
        email,
        // Only update displayName if non-empty — prevents overwriting a valid name
        // when Clerk fires user.updated for unrelated changes (e.g. avatar upload)
        ...(displayName ? { displayName } : {}),
      },
      create: {
        clerkId: id,
        email,
        displayName: displayName || 'StepDish User',
      },
    })
  }

  return new Response('OK', { status: 200 })
}
