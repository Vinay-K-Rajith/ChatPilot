export function connectWebSocket(opts?: { token?: string }) {
  try {
    const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';

  // Prefer Vite-provided env variable for WS port, else fallback to window.location.port or 3002
  // Vite exposes env vars as import.meta.env.VITE_*
  // @ts-ignore
  const vitePort = (import.meta as any)?.env?.VITE_WS_PORT;
  const envPort = (vitePort as any) || (window as any).__WS_PORT__;

    const defaultPort = 3002;
    const port = envPort || window.location.port || defaultPort;

    const host = window.location.hostname || 'localhost';
    const path = '/ws';
    const token = opts?.token || localStorage.getItem('ws_token') || 'guest';

    const wsUrl = `${protocol}://${host}:${port}${path}?token=${encodeURIComponent(token)}`;

    console.log('Connecting WebSocket to', wsUrl);

    const ws = new WebSocket(wsUrl);

    ws.addEventListener('open', () => {
      console.log('WebSocket connected');
      // Optionally send a subscribe or auth message
      ws.send(JSON.stringify({ type: 'subscribe', channel: 'dashboard' }));
    });

    ws.addEventListener('message', (ev) => {
      try {
        const data = JSON.parse(ev.data);
        // Simple routing: log for now
        console.debug('WS message', data);
        // you can integrate with app state / event bus here
      } catch (e) {
        console.warn('Failed to parse WS message', e);
      }
    });

    ws.addEventListener('close', (ev) => {
      console.warn('WebSocket closed', ev);
    });

    ws.addEventListener('error', (err) => {
      console.error('WebSocket error', err);
    });

    return ws;
  } catch (error) {
    console.error('Failed to connect WebSocket', error);
    return null;
  }
}
