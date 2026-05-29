import { currentUser } from '@clerk/nextjs/server'

export default async function DashboardPage() {
  const user = await currentUser()

  return (
    <main>
      <h1>Welcome back, {user?.firstName ?? 'Chef'} 👋</h1>
      <p>Your recipe dashboard is coming soon.</p>
    </main>
  )
}
