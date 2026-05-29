export default function Home() {
  return (
    <main
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100dvh',
        gap: 'var(--space-4)',
        fontFamily: 'var(--font-body)',
      }}
    >
      <h1
        style={{
          fontSize: 'var(--text-2xl)',
          fontFamily: 'var(--font-display)',
          color: 'var(--color-primary)',
          fontWeight: 800,
        }}
      >
        🍳 StepDish
      </h1>
      <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-base)' }}>
        Coming soon.
      </p>
    </main>
  )
}
