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
    return new Response('Webhook secret not configured', { status: 500 })
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
    const displayName = `${first_name ?? ''} ${last_name ?? ''}`.trim() || 'StepDish User'

    if (!email) {
      return new Response('No email address found', { status: 400 })
    }

    await prisma.user.upsert({
      where: { clerkId: id },
      update: { email, displayName },
      create: { clerkId: id, email, displayName },
    })
  }

  return new Response('OK', { status: 200 })
}
