import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { WebSocket, WebSocketServer } from 'ws';

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Serve uploaded files statically
app.use('/uploads', express.static('public/uploads'));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  const server = await registerRoutes(app);
  
  // Use port from environment variable or default for HTTP server
  const port = process.env.PORT ? parseInt(process.env.PORT) : 3001;

  // Setup a dedicated WebSocket server on a separate port to avoid
  // interfering with Vite's HMR websocket layer. Use WS_PORT or default to port+1.
  const wsPort = process.env.WS_PORT ? parseInt(process.env.WS_PORT) : port + 1;

  // Create a standalone WebSocket server listening on wsPort and path '/ws'
  const wss = new WebSocketServer({ port: wsPort, path: '/ws' });
  
  // Store connected clients for broadcasting
  const connectedClients = new Set<WebSocket>();
  
  // `connection` callback receives the ws and the http request which we can use to inspect path/query
  wss.on('connection', (ws: WebSocket, req) => {
    const url = req?.url || '';
    console.log('🔗 New WebSocket connection established', { url });
    // Optionally validate token query param and reject if missing
    try {
      const qp = new URL('http://localhost' + url).searchParams;
      const token = qp.get('token');
      if (!token) {
        console.warn('WebSocket connection without token');
        // we will still accept but client should supply token
      }
    } catch (e) {
      // ignore URL parse errors
    }
    connectedClients.add(ws);
    
    // Send welcome message
    ws.send(JSON.stringify({
      type: 'connection',
      message: 'Connected to ChatPilot real-time updates',
      timestamp: new Date().toISOString()
    }));
    
    // Handle incoming messages from client
    ws.on('message', (data) => {
      try {
        const message = JSON.parse(data.toString());
        console.log('📨 WebSocket message received:', message);
        
        // Handle different message types
        switch (message.type) {
          case 'ping':
            ws.send(JSON.stringify({ type: 'pong', timestamp: new Date().toISOString() }));
            break;
          case 'subscribe':
            // Client subscribing to specific channels
            ws.send(JSON.stringify({ type: 'subscribed', channel: message.channel }));
            break;
        }
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    });
    
    // Handle client disconnect
    ws.on('close', () => {
      console.log('🔌 WebSocket connection closed');
      connectedClients.delete(ws);
    });
    
    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
      connectedClients.delete(ws);
    });
  });
  
  // Global function to broadcast to all connected clients
  (global as any).broadcastToClients = (message: any) => {
    const data = JSON.stringify({
      ...message,
      timestamp: new Date().toISOString()
    });
    
    connectedClients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(data);
      }
    });
  };
  
  console.log(`🌐 WebSocket server ready on ws://localhost:${wsPort}/ws`);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  server.listen({
    port,
    host: "localhost",
  }, () => {
    log(`serving on http://localhost:${port}`);
  });
})();
