export function connectWebSocket(opts?: { token?: string }) {
  try {
    const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
    const isDevelopment = import.meta.env.DEV;
    
    const host = window.location.hostname || 'localhost';
    const path = '/ws';
    const token = opts?.token || localStorage.getItem('ws_token') || 'guest';
    
    // In development, use Vite's dev server port so the proxy handles routing to WebSocket server
    // In production, use the WebSocket server port directly
    let wsUrl: string;
    if (isDevelopment) {
      // Connect to same origin (Vite dev server), Vite proxy will forward to ws://localhost:3002
      const port = window.location.port || '3000';
      wsUrl = `${protocol}://${host}:${port}${path}?token=${encodeURIComponent(token)}`;
    } else {
      // In production, connect directly to WebSocket server port
      const wsPort = (window as any).__WS_PORT__ || '3002';
      wsUrl = `${protocol}://${host}:${wsPort}${path}?token=${encodeURIComponent(token)}`;
    }

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
