import { useState, useEffect } from 'react';

const API = import.meta.env.VITE_API_URL ?? '';

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

export function usePushNotifications() {
  const [supported, setSupported] = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);

  useEffect(() => {
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      setSupported(true);
      navigator.serviceWorker
        .register('/sw.js')
        .then((reg) => {
          setRegistration(reg);
          return reg.pushManager.getSubscription();
        })
        .then((sub) => {
          setSubscribed(!!sub);
        })
        .catch((err) => {
          console.error('[usePushNotifications] SW registration failed:', err);
        });
    }
  }, []);

  const subscribe = async (): Promise<void> => {
    if (!registration) return;

    try {
      // Fetch VAPID public key from server
      const res = await fetch(`${API}/api/notifications/vapid-public-key`);
      const { key } = await res.json();

      const applicationServerKey = urlBase64ToUint8Array(key);
      const sub = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey,
      });

      // Register subscription with server
      await fetch(`${API}/api/notifications/subscribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ subscription: sub.toJSON() }),
      });

      setSubscribed(true);
    } catch (err) {
      console.error('[usePushNotifications] Subscribe failed:', err);
    }
  };

  const unsubscribe = async (): Promise<void> => {
    if (!registration) return;

    try {
      const sub = await registration.pushManager.getSubscription();
      if (!sub) return;

      const endpoint = sub.endpoint;
      await sub.unsubscribe();

      await fetch(`${API}/api/notifications/subscribe`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ endpoint }),
      });

      setSubscribed(false);
    } catch (err) {
      console.error('[usePushNotifications] Unsubscribe failed:', err);
    }
  };

  return { supported, subscribed, subscribe, unsubscribe };
}