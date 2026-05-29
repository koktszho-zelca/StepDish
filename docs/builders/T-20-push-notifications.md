# T-20 · Push Notifications & Step Reminders

## Context
StepDish sends browser push notifications for step reminders during Cook Mode — for example, alerting the user to check on a simmering pot even if they've switched to another browser tab. Notifications are opt-in, permission-gated, and only sent during an active cook session. This uses the Web Notifications API (foreground) and optionally the Push API + Service Worker (background).

---

## Scope

| Item | Detail |
|---|---|
| Foreground notifications | Web Notifications API — sent when timer expires during Cook Mode |
| Background notifications | Service Worker Push API (Phase 3B — deferred) |
| Permission gate | Request permission on first Cook Mode open; never auto-request |
| Reminder trigger | Step `reminder` field text sent as notification body |
| Timer expiry | Notification fires when `durationSeconds` countdown hits 0 |
| Settings | User can disable notifications from dashboard settings |

---

## Files to Create / Modify

```
/src/hooks/useStepNotification.ts          ← NEW — notification hook
/src/components/cook/NotificationPrompt.tsx ← NEW — opt-in prompt UI
/src/components/cook/CookMode.tsx           ← MODIFY — integrate notifications
/src/app/dashboard/settings/page.tsx        ← MODIFY — notification toggle
/public/sw.js                              ← NEW (Phase 3B) — service worker stub
```

---

## Hook: `useStepNotification.ts`

```ts
export function useStepNotification() {
  const supported = 'Notification' in window;
  const [permission, setPermission] = useState<NotificationPermission>(
    supported ? Notification.permission : 'denied'
  );

  const requestPermission = async () => {
    if (!supported) return;
    const result = await Notification.requestPermission();
    setPermission(result);
    return result;
  };

  const notify = (title: string, body?: string, icon = '/icon-192.png') => {
    if (!supported || permission !== 'granted') return;
    const n = new Notification(title, { body, icon, badge: '/icon-72.png' });
    // Auto-close after 8 seconds
    setTimeout(() => n.close(), 8000);
    return n;
  };

  return { supported, permission, requestPermission, notify };
}
```

---

## Component: `NotificationPrompt.tsx`

Shown on first Cook Mode entry if `Notification.permission === 'default'`:

```
┌─────────────────────────────────────────────────┐
│  🔔  Enable step reminders?                     │
│                                                 │
│  Get notified when each step timer ends —       │
│  even if you switch tabs.                       │
│                                                 │
│  [ Enable notifications ]   [ Not now ]         │
└─────────────────────────────────────────────────┘
```

- Shown as a non-blocking banner at the top of Cook Mode (not a modal)
- "Enable notifications" → calls `requestPermission()`
- "Not now" → dismisses for the session; shown again next Cook Mode open
- If permission is already `granted` or `denied`, prompt is not shown
- Denied state shows a small tooltip: "Enable notifications in browser settings to get step reminders"

---

## Cook Mode Integration

When a step timer expires:

```ts
const { notify } = useStepNotification();

onTimerExpire(step: Step) {
  const title = `⏱ Step ${step.order} complete`;
  const body = step.reminder ?? step.action.slice(0, 80);
  notify(title, body);
}
```

When advancing to next step manually (before timer expires): cancel the pending notification if one exists.

---

## Notification Content Format

| Trigger | Title | Body |
|---|---|---|
| Timer expires, has reminder | `⏱ Step N done` | Reminder text |
| Timer expires, no reminder | `⏱ Step N done` | First 80 chars of action |
| Last step timer expires | `✅ Recipe complete!` | "Well done! Tap to see your completion screen." |

---

## Dashboard Settings Toggle

In `/dashboard/settings`, under a "Notifications" section:

- Current permission status shown: `Allowed` / `Blocked` / `Not set`
- If `Allowed`: toggle to mute StepDish notifications (stored in `localStorage` as `stepdish_notifications_muted`)
- If `Blocked`: message with instructions to re-enable in browser settings + link to browser support docs
- If `Not set`: "Enable step reminders" button → triggers `requestPermission()`

> Note: `localStorage` is acceptable here (user preference, not auth state). This is distinct from the sandbox restriction in the web app build; the deployed app on a real domain has full `localStorage` access.

---

## Phase 3B — Background Push (Deferred)

Foreground notifications cover the main use case. Background push (when the user has closed the tab) requires:

1. A Service Worker registered at `/sw.js`
2. A push subscription stored server-side per user
3. A push server (e.g. Web Push via `web-push` npm package)
4. A trigger mechanism (schedule via the cook session server-side)

This is deferred post-MVP. The Service Worker stub (`/public/sw.js`) should be created now as a placeholder so it can be registered without a future deploy:

```js
// /public/sw.js — stub for future background push
self.addEventListener('push', (event) => {
  const data = event.data?.json() ?? {};
  event.waitUntil(
    self.registration.showNotification(data.title ?? 'StepDish', {
      body: data.body ?? '',
      icon: '/icon-192.png',
      badge: '/icon-72.png',
    })
  );
});
```

---

## Test Cases

| # | Scenario | Expected |
|---|---|---|
| TC-20-01 | First Cook Mode open | Notification prompt banner shown |
| TC-20-02 | Click "Enable notifications" | Browser permission dialog shown |
| TC-20-03 | Grant permission | Prompt dismissed; `permission === 'granted'` |
| TC-20-04 | Deny permission | Prompt shows denied tooltip |
| TC-20-05 | Step timer expires (permission granted) | Browser notification fires |
| TC-20-06 | Step timer expires (permission denied) | No notification; no error |
| TC-20-07 | Step has reminder text | Notification body = reminder text |
| TC-20-08 | Step has no reminder | Notification body = first 80 chars of action |
| TC-20-09 | Last step completes | "Recipe complete!" notification |
| TC-20-10 | Notifications muted in settings | No notifications fired even if permission granted |
| TC-20-11 | Browser doesn't support Notifications API | Prompt not shown; no crash |
| TC-20-12 | `/sw.js` registered | Service worker active in browser devtools |
