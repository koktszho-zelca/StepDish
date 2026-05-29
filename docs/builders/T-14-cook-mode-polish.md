# T-14 · Cook Mode Polish

> **Batch:** 3 · **Phase:** 3 — Quality & Retention · **Depends on:** T-08, T-06

---

## Context

T-08 introduced the basic Cook Mode overlay: full-screen step view with a timer and ingredient list. That's functional, but it falls short of a truly production-ready experience on mobile — which is where nearly all cooking happens.

T-14 adds the layer of polish that makes Cook Mode feel built for real kitchens:

- **Progress persistence** — if the user accidentally closes the overlay or refreshes the page mid-cook, they return to the correct step
- **Voice readout** — tapping the speaker icon reads the current step aloud via the Web Speech API, so users can listen with their hands covered in dough
- **Screen wake lock** — prevents the phone screen from going dark while cooking
- **Completion screen** — a satisfying "done" moment after the last step, with time summary and options to cook again
- **Keyboard shortcuts** — arrow keys and Escape work on desktop

---

## Scope

| Item | Detail |
|---|---|
| Progress persistence | `sessionStorage` — resumes at last step within same browser session |
| Voice readout | Web Speech API `SpeechSynthesis` — reads step action on demand |
| Screen wake lock | Screen Wake Lock API — keeps device screen on during Cook Mode |
| Completion screen | Animated checkmark + confetti + time summary + cook-again CTA |
| Keyboard shortcuts | `←` prev, `→` next, `Esc` exit; hint shown for 4s on open |
| Reduced motion | Confetti and animations disabled when `prefers-reduced-motion: reduce` |

---

## Files to Create / Modify

```
/src/hooks/useCookProgress.ts          ← NEW    — session progress hook
/src/hooks/useWakeLock.ts              ← NEW    — Screen Wake Lock API hook
/src/hooks/useSpeechReadout.ts         ← NEW    — SpeechSynthesis hook
/src/components/cook/CookMode.tsx      ← MODIFY — integrate all three hooks
/src/components/cook/CookComplete.tsx  ← NEW    — completion screen
/src/components/cook/ShortcutHints.tsx ← NEW    — keyboard shortcut hint overlay
```

---

## Behaviour Spec

### Progress Persistence

Cook Mode saves the current step index to `sessionStorage` on every navigation. On re-open, it reads the saved index and starts there.

```
User on Step 4 of 8
  → Phone screen times out
  → User unlocks phone, taps "Cook" again
  → Cook Mode opens at Step 4  ✓

User completes all steps
  → Taps "Cook again"
  → sessionStorage cleared
  → Cook Mode opens at Step 1  ✓

User opens recipe in new tab
  → sessionStorage is tab-scoped
  → New Cook Mode session starts at Step 1  ✓
```

### Voice Readout

- Speaker icon (`Volume2`) shown in the top-right corner of each step
- Tapping it calls `window.speechSynthesis.speak()` with the step's action text
- While speaking: icon pulses with a CSS ring animation; tapping again cancels
- Navigating to a new step cancels any active readout
- `rate: 0.9`, `lang: 'en-US'` (adjust per future localisation)
- If `SpeechSynthesis` is not supported: icon hidden entirely (not shown greyed out)

### Screen Wake Lock

- Acquired when Cook Mode opens (`navigator.wakeLock.request('screen')`)
- Released when Cook Mode closes or unmounts
- Re-acquired on `visibilitychange` (user switches app and returns)
- Silent fail if API not supported (older browsers, non-HTTPS)
- No user-visible indicator needed — the behaviour speaks for itself

### Completion Screen

```
┌────────────────────────────────────────┐
│                                        │
│              ✅  (animated)            │
│                                        │
│      You finished                      │
│      Soy Glazed Salmon! 🎉             │
│                                        │
│      Total cook time: 34 min           │
│      Steps completed: 8                │
│                                        │
│   [Cook again]    [Back to recipe]     │
│                                        │
└────────────────────────────────────────┘
```

- Checkmark drawn with CSS stroke animation (600ms, `stroke-dashoffset`)
- Confetti: 20 coloured `div` elements, CSS `@keyframes` fall animation, 1.5s
- Confetti disabled when `prefers-reduced-motion: reduce` is set
- "Cook again" clears `sessionStorage` progress and resets to step 1
- "Back to recipe" closes Cook Mode overlay
- Total cook time calculated from sum of step `durationSeconds` values actually visited

### Keyboard Shortcuts

- `→` or `ArrowRight` → next step
- `←` or `ArrowLeft` → prev step
- `Esc` → close Cook Mode
- Hint overlay shown for 4 seconds on open, then fades
- Re-shown when user presses `?`
- Visible only when `@media (hover: hover)` (desktop)

---

## Implementation: Hooks

### `useCookProgress.ts`

```ts
export function useCookProgress(recipeId: string, totalSteps: number) {
  const key = `stepdish_cook_${recipeId}`;

  const [stepIndex, setStepIndex] = useState(() => {
    try {
      const saved = sessionStorage.getItem(key);
      const n = saved !== null ? parseInt(saved, 10) : 0;
      return Number.isFinite(n) && n < totalSteps ? n : 0;
    } catch { return 0; }
  });

  const goTo = (index: number) => {
    const clamped = Math.max(0, Math.min(index, totalSteps - 1));
    setStepIndex(clamped);
    try { sessionStorage.setItem(key, String(clamped)); } catch {}
  };

  const clear = () => {
    try { sessionStorage.removeItem(key); } catch {}
    setStepIndex(0);
  };

  return { stepIndex, goTo, clear, isLastStep: stepIndex === totalSteps - 1 };
}
```

### `useWakeLock.ts`

```ts
export function useWakeLock() {
  const lockRef = useRef<WakeLockSentinel | null>(null);

  const acquire = useCallback(async () => {
    if (typeof navigator === 'undefined' || !('wakeLock' in navigator)) return;
    try {
      lockRef.current = await (navigator as any).wakeLock.request('screen');
    } catch { /* user denied or API unavailable */ }
  }, []);

  const release = useCallback(async () => {
    if (lockRef.current) {
      await lockRef.current.release();
      lockRef.current = null;
    }
  }, []);

  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === 'visible') acquire();
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, [acquire]);

  return { acquire, release };
}
```

### `useSpeechReadout.ts`

```ts
export function useSpeechReadout() {
  const supported = typeof window !== 'undefined' && 'speechSynthesis' in window;
  const [isSpeaking, setIsSpeaking] = useState(false);

  const speak = useCallback((text: string) => {
    if (!supported) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.rate = 0.9;
    u.lang = 'en-US';
    u.onstart = () => setIsSpeaking(true);
    u.onend = () => setIsSpeaking(false);
    u.onerror = () => setIsSpeaking(false);
    window.speechSynthesis.speak(u);
  }, [supported]);

  const stop = useCallback(() => {
    if (supported) { window.speechSynthesis.cancel(); setIsSpeaking(false); }
  }, [supported]);

  return { speak, stop, supported, isSpeaking };
}
```

---

## Error Handling

| Scenario | Behaviour |
|---|---|
| `sessionStorage` blocked (iframe/privacy mode) | `try/catch` — fall back to in-memory state only |
| Wake Lock API not supported | Silent fail — no error, no indicator |
| Wake Lock revoked by OS | `visibilitychange` handler re-acquires on focus |
| `SpeechSynthesis` not supported | Speaker icon hidden; no error |
| Speech interrupted mid-step | `onerror` callback resets `isSpeaking` state |
| User closes tab mid-cook | `sessionStorage` cleared by browser — fresh start next time |

---

## Dependencies

- T-08 · Cook Mode (base overlay must exist)
- T-06 · Timers & Reminders (step `durationSeconds` used in time summary)
- No new npm packages — all features use browser-native APIs

---

## Definition of Done

- [ ] Closing and reopening Cook Mode resumes at the correct step
- [ ] "Cook again" correctly resets to step 1
- [ ] Speaker icon reads step text; hides if `SpeechSynthesis` unavailable
- [ ] Navigating steps cancels any active voice readout
- [ ] Screen stays on during Cook Mode (where API is supported)
- [ ] Wake lock released on Cook Mode close
- [ ] Completion screen shows after last step
- [ ] Checkmark animates; confetti plays (unless `prefers-reduced-motion`)
- [ ] Keyboard shortcuts work on desktop
- [ ] Hint overlay fades after 4 seconds

---

## Test Cases

| # | Scenario | Expected |
|---|---|---|
| TC-14-01 | Navigate to step 4, close Cook Mode, reopen | Opens at step 4 |
| TC-14-02 | Open recipe in new tab | Starts at step 1 (new sessionStorage scope) |
| TC-14-03 | Complete all steps | Completion screen shown |
| TC-14-04 | Tap "Cook again" | Returns to step 1, progress cleared |
| TC-14-05 | Tap "Back to recipe" on complete screen | Cook Mode closed |
| TC-14-06 | Tap speaker icon | Step text read aloud |
| TC-14-07 | Tap speaker while speaking | Readout cancelled |
| TC-14-08 | Navigate to next step during readout | Previous readout stops |
| TC-14-09 | Device doesn't support SpeechSynthesis | Speaker icon not shown |
| TC-14-10 | Wake lock acquired on open | Screen stays on (tested in Chrome) |
| TC-14-11 | Wake lock released on close | Confirmed via DevTools |
| TC-14-12 | Lock revoked (app minimised and restored) | Re-acquired on restore |
| TC-14-13 | `→` key on desktop | Advances to next step |
| TC-14-14 | `Esc` key on desktop | Cook Mode closes |
| TC-14-15 | Hint overlay shown, waits 4s | Hint fades after 4 seconds |
| TC-14-16 | `prefers-reduced-motion` set | Confetti not shown; checkmark static |
| TC-14-17 | Total cook time shown on completion | Sum of completed step durations |
