import express, { Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface RoomData {
  notes: any[];
  connections?: any[];
  lastUpdated: number;
  clients: Set<Response>;
}

const rooms = new Map<string, RoomData>();

function getOrCreateRoom(roomId: string): RoomData {
  let room = rooms.get(roomId);
  if (!room) {
    room = {
      notes: [],
      connections: [],
      lastUpdated: Date.now(),
      clients: new Set(),
    };
    rooms.set(roomId, room);
  }
  return room;
}

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));

  // Health check
  app.get('/api/health', (req: Request, res: Response) => {
    res.json({
      status: 'ok',
      service: 'magnific-space-notes',
      timestamp: Date.now(),
      activeRooms: rooms.size,
    });
  });

  // Get current room snapshot
  app.get('/api/sync/:roomId', (req: Request, res: Response) => {
    const { roomId } = req.params;
    const room = getOrCreateRoom(roomId);
    res.json({
      roomId,
      notes: room.notes,
      connections: room.connections || [],
      lastUpdated: room.lastUpdated,
      peers: room.clients.size,
    });
  });

  // Post changes to room & broadcast to peers
  app.post('/api/sync/:roomId', (req: Request, res: Response) => {
    const { roomId } = req.params;
    const { notes, connections, deviceId, timestamp } = req.body;
    const room = getOrCreateRoom(roomId);

    if (Array.isArray(notes)) {
      room.notes = notes;
    }
    if (Array.isArray(connections)) {
      room.connections = connections;
    }
    room.lastUpdated = timestamp || Date.now();

    const payload = JSON.stringify({
      type: 'sync',
      roomId,
      notes: room.notes,
      connections: room.connections,
      deviceId,
      timestamp: room.lastUpdated,
      peers: room.clients.size,
    });

    // Broadcast to all connected clients in the room
    for (const client of room.clients) {
      try {
        client.write(`event: sync\ndata: ${payload}\n\n`);
      } catch (err) {
        room.clients.delete(client);
      }
    }

    res.json({
      success: true,
      timestamp: room.lastUpdated,
      peers: room.clients.size,
    });
  });

  // Server-Sent Events (SSE) for Real-Time Synchronization across PC, Web & Mobile
  app.get('/api/sync/:roomId/events', (req: Request, res: Response) => {
    const { roomId } = req.params;
    const room = getOrCreateRoom(roomId);

    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    });

    room.clients.add(res);

    // Send initial handshake
    const initialPayload = JSON.stringify({
      type: 'init',
      roomId,
      notes: room.notes,
      connections: room.connections,
      timestamp: room.lastUpdated,
      peers: room.clients.size,
    });
    res.write(`event: init\ndata: ${initialPayload}\n\n`);

    // Notify other peers of new device joined
    const peerPayload = JSON.stringify({
      type: 'peer_joined',
      peers: room.clients.size,
    });
    for (const client of room.clients) {
      if (client !== res) {
        try {
          client.write(`event: peer\ndata: ${peerPayload}\n\n`);
        } catch {}
      }
    }

    // Heartbeat every 20 seconds to keep connection alive
    const heartbeat = setInterval(() => {
      try {
        res.write(`event: ping\ndata: ${Date.now()}\n\n`);
      } catch {
        clearInterval(heartbeat);
        room.clients.delete(res);
      }
    }, 20000);

    req.on('close', () => {
      clearInterval(heartbeat);
      room.clients.delete(res);
      // Notify remaining peers
      const leftPayload = JSON.stringify({
        type: 'peer_left',
        peers: room.clients.size,
      });
      for (const client of room.clients) {
        try {
          client.write(`event: peer\ndata: ${leftPayload}\n\n`);
        } catch {}
      }
    });
  });

  // Frontend Serving (Dev via Vite Middleware, Prod via Static Files)
  const isProduction = process.env.NODE_ENV === 'production' && fs.existsSync(path.resolve(__dirname, 'dist'));

  if (!isProduction) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Magnific Space Server] Listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('[Magnific Space Server Error]:', err);
});
