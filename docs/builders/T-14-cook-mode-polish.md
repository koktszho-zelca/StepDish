# T-14 · Cook Mode Polish

## Context
T-08 introduced the basic Cook Mode overlay. T-14 adds the finishing layer: progress persistence (resume where you left off), voice readout of step text, screen wake lock (prevent phone sleeping while cooking), and a completion celebration screen.

---

## Scope

| Item | Detail |
|---|---|
| Progress persistence | `sessionStorage` — resume step on re-open within same session |
| Voice readout | Web Speech API `SpeechSynthesis` — reads step action aloud on demand |
| Wake lock | Screen Wake Lock API — prevents device sleep during Cook Mode |
| Completion screen | Animated "Done!" screen after last step |
| Keyboard shortcuts | Show shortcut hints on desktop |

---

## Files to Create / Modify

```
/src/hooks/useCookProgress.ts          ← NEW — session progress tracking
/src/hooks/useWakeLock.ts              ← NEW — Screen Wake Lock API
/src/hooks/useSpeechReadout.ts         ← NEW — SpeechSynthesis wrapper
/src/components/cook/CookMode.tsx      ← MODIFY — integrate all hooks
/src/components/cook/CookComplete.tsx  ← NEW — completion screen
/src/components/cook/ShortcutHints.tsx ← NEW — keyboard shortcut overlay
```

---

## Hook: `useCookProgress.ts`

```ts
export function useCookProgress(recipeId: string, totalSteps: number) {
  const key = `cook_progress_${recipeId}`;

  const [stepIndex, setStepIndex] = useState(() => {
    try {
      const saved = sessionStorage.getItem(key);
      const n = saved ? parseInt(saved, 10) : 0;
      return n < totalSteps ? n : 0;
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

  return { stepIndex, goTo, clear };
}
```

---

## Hook: `useWakeLock.ts`

```ts
export function useWakeLock() {
  const lockRef = useRef<WakeLockSentinel | null>(null);

  const acquire = async () => {
    if (!("wakeLock" in navigator)) return;
    try { lockRef.current = await navigator.wakeLock.request('screen'); }
    catch { /* silently ignore */ }
  };

  const release = async () => {
    await lockRef.current?.release();
    lockRef.current = null;
  };

  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') acquire();
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, []);

  return { acquire, release };
}
```

---

## Hook: `useSpeechReadout.ts`

```ts
export function useSpeechReadout() {
  const supported = 'speechSynthesis' in window;

  const speak = (text: string) => {
    if (!supported) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.9;
    utterance.lang = 'en-US';
    window.speechSynthesis.speak(utterance);
  };

  const stop = () => { if (supported) window.speechSynthesis.cancel(); };

  return { speak, stop, supported };
}
```

In `CookStep`, show a speaker icon button (`Volume2` from Lucide). On click, call `speak(step.action)`. Active readout shows a pulsing ring around the button.

---

## Component: `CookComplete.tsx`

- Full-screen overlay with teal background
- Large animated checkmark (CSS stroke animation, 600ms)
- "You've finished [Recipe Title]! 🎉" heading
- Subtext: total time taken (calculated from step timers used)
- CTAs: **Cook again** (resets progress) and **Back to recipe** (closes overlay)
- Subtle confetti burst (CSS keyframes, 20 coloured dots, 1.5s, respects `prefers-reduced-motion`)

---

## Component: `ShortcutHints.tsx`

Desktop-only (`@media (hover: hover)`). Small pill overlay bottom-right:

```
← Prev step    → Next step    Esc Exit
```

Shown for 4 seconds on Cook Mode open, then fades. Re-shown on `?` key press.

---

## CookMode Integration

```tsx
const { stepIndex, goTo, clear } = useCookProgress(recipe.id, steps.length);
const { acquire, release } = useWakeLock();
const { speak, stop } = useSpeechReadout();

useEffect(() => { acquire(); return () => { release(); stop(); }; }, []);

const isDone = stepIndex >= steps.length;
if (isDone) return <CookComplete recipe={recipe} onCookAgain={() => { clear(); goTo(0); }} />;
```

---

## Test Cases

| # | Scenario | Expected |
|---|---|---|
| TC-14-01 | Close and reopen Cook Mode | Resumes at last step |
| TC-14-02 | Complete all steps | CookComplete screen shown |
| TC-14-03 | "Cook again" on complete screen | Returns to step 1 |
| TC-14-04 | Click speaker icon | Step text read aloud |
| TC-14-05 | Navigate to next step during readout | Previous readout stops |
| TC-14-06 | Wake lock acquired on Cook Mode open | Screen stays on (if supported) |
| TC-14-07 | Wake lock released on Cook Mode close | Lock released |
| TC-14-08 | Page hidden + re-shown during cook | Wake lock re-acquired |
| TC-14-09 | Device doesn't support Wake Lock | No error, silently skipped |
| TC-14-10 | Keyboard → on desktop | Advances to next step |
| TC-14-11 | Confetti on complete (motion OK) | 20 particles animate |
| TC-14-12 | Confetti on complete (reduced motion) | Static screen only |
