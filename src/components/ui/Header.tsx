import Link from 'next/link'
import {
  SignedIn,
  SignedOut,
  UserButton,
  currentUser,
} from '@clerk/nextjs'

export async function Header() {
  const user = await currentUser()

  return (
    <header className="site-header">
      <div className="header-inner">
        {/* Logo */}
        <Link href="/" className="header-logo" aria-label="StepDish home">
          <svg
            width="28"
            height="28"
            viewBox="0 0 28 28"
            fill="none"
            aria-hidden="true"
          >
            <circle cx="14" cy="14" r="13" stroke="currentColor" strokeWidth="2" />
            <path
              d="M8 10h12M8 14h8M8 18h10"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
          <span>StepDish</span>
        </Link>

        {/* Nav actions */}
        <nav className="header-nav" aria-label="Main navigation">
          <SignedIn>
            <span className="header-display-name">
              {user?.firstName ?? user?.emailAddresses[0]?.emailAddress ?? ''}
            </span>
            <Link href="/dashboard" className="header-link">
              Dashboard
            </Link>
            <UserButton afterSignOutUrl="/" />
          </SignedIn>

          <SignedOut>
            <Link href="/sign-in" className="header-link">
              Sign in
            </Link>
            <Link href="/sign-up" className="header-link header-link--primary">
              Get started
            </Link>
          </SignedOut>
        </nav>
      </div>
    </header>
  )
}
