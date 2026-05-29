# T-06 · Timers & Reminders

## Context
Every recipe step can have an optional `durationSeconds` and a `reminder` text. During Cook Mode, the user needs per-step countdown timers that run in the background even if the screen scrolls away, plus browser notifications when a timer completes.

---

## Scope

| Item | Detail |
|---|---|
| Timer engine | Web Worker (`/public/timerWorker.js`) — keeps ticking off main thread |
| Notification | Browser Notification API + in-app toast fallback |
| Parallel timers | Multiple steps can run simultaneously |
| Persistence | Timers survive tab re-focus (worker persists); reset on page reload |
| UI location | Cook Mode step cards (see T-08) |

---

## Files to Create / Modify

```
/public/timerWorker.js          ← NEW — background timer engine
/src/hooks/useStepTimer.ts      ← NEW — React hook wrapping the worker
/src/hooks/useNotification.ts   ← NEW — Notification API permission + send helper
/src/components/cook/TimerDisplay.tsx   ← NEW — countdown ring UI
/src/components/cook/TimerControls.tsx  ← NEW — start / pause / reset buttons
```

---

## Web Worker: `/public/timerWorker.js`

```js
// timerWorker.js — runs entirely off main thread
const timers = new Map(); // id → { remaining, interval }

self.onmessage = ({ data }) => {
  const { type, id, seconds } = data;

  if (type === 'START') {
    if (timers.has(id)) return; // already running
    let remaining = seconds;
    const interval = setInterval(() => {
      remaining -= 1;
      self.postMessage({ type: 'TICK', id, remaining });
      if (remaining <= 0) {
        clearInterval(interval);
        timers.delete(id);
        self.postMessage({ type: 'DONE', id });
      }
    }, 1000);
    timers.set(id, { remaining, interval });
  }

  if (type === 'PAUSE') {
    const t = timers.get(id);
    if (t) { clearInterval(t.interval); timers.set(id, { ...t, interval: null }); }
  }

  if (type === 'RESET') {
    const t = timers.get(id);
    if (t?.interval) clearInterval(t.interval);
    timers.delete(id);
    self.postMessage({ type: 'RESET_ACK', id });
  }
};
```

---

## Hook: `useStepTimer.ts`

```ts
import { useEffect, useRef, useState } from 'react';

type TimerState = 'idle' | 'running' | 'paused' | 'done';

export function useStepTimer(stepId: string, durationSeconds: number) {
  const workerRef = useRef<Worker | null>(null);
  const [remaining, setRemaining] = useState(durationSeconds);
  const [state, setState] = useState<TimerState>('idle');

  useEffect(() => {
    workerRef.current = new Worker('/timerWorker.js');
    workerRef.current.onmessage = ({ data }) => {
      if (data.id !== stepId) return;
      if (data.type === 'TICK') setRemaining(data.remaining);
      if (data.type === 'DONE') setState('done');
      if (data.type === 'RESET_ACK') { setState('idle'); setRemaining(durationSeconds); }
    };
    return () => workerRef.current?.terminate();
  }, [stepId, durationSeconds]);

  const start = () => {
    workerRef.current?.postMessage({ type: 'START', id: stepId, seconds: remaining });
    setState('running');
  };
  const pause = () => {
    workerRef.current?.postMessage({ type: 'PAUSE', id: stepId });
    setState('paused');
  };
  const reset = () => {
    workerRef.current?.postMessage({ type: 'RESET', id: stepId });
  };

  return { remaining, state, start, pause, reset };
}
```

---

## Hook: `useNotification.ts`

```ts
export function useNotification() {
  const request = async () => {
    if (!('Notification' in window)) return false;
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  };

  const send = (title: string, body: string) => {
    if (Notification.permission === 'granted') {
      new Notification(title, { body, icon: '/icons/stepdish-192.png' });
    }
    // fallback: in-app toast handled by TimerDisplay via state
  };

  return { request, send };
}
```

---

## UI: `TimerDisplay.tsx`

- Shows circular SVG countdown ring (stroke-dashoffset animation)
- Colour changes: teal (running) → amber (< 30s) → red (< 10s)
- When `state === 'done'`: ring fills green, triggers `send()` from `useNotification`
- If Notification permission denied: show in-app banner toast instead
- Always show MM:SS formatted remaining time in centre of ring

---

## UI: `TimerControls.tsx`

Buttons rendered below the ring:
- **Start** — visible when `state === 'idle' | 'paused'`
- **Pause** — visible when `state === 'running'`
- **Reset** — always visible unless `state === 'idle'`

Use `<button aria-label="...">` with Lucide icons (`Play`, `Pause`, `RotateCcw`).

---

## Notification Permission Flow

1. On first entry to Cook Mode, call `request()`.
2. If denied, set `notificationsBlocked = true` in React context.
3. When `state === 'done'`: if blocked → show full-width in-app toast banner; if granted → fire `Notification`.
4. Never re-request permission after a denial.

---

## API Routes

No new API routes needed for timers — timers are entirely client-side.

---

## Test Cases

| # | Scenario | Expected |
|---|---|---|
| TC-06-01 | Start timer for step with 10s duration | Counts down 10 → 0, fires done |
| TC-06-02 | Pause at 7s, resume | Resumes from 7s not from start |
| TC-06-03 | Reset while running | Stops, resets to original duration |
| TC-06-04 | Two timers running simultaneously | Both count independently |
| TC-06-05 | Timer done, notifications granted | Browser notification fires |
| TC-06-06 | Timer done, notifications denied | In-app toast banner appears |
| TC-06-07 | Scroll away from step while running | Timer continues (worker persists) |
| TC-06-08 | Tab re-focused after timer done | Done state is shown |
| TC-06-09 | Step has no durationSeconds | TimerDisplay not rendered |
| TC-06-10 | Permission request on Cook Mode entry | Prompt shown once only |
