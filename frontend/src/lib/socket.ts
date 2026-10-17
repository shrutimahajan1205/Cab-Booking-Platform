export function createWebSocket(type: "rider" | "driver", id: number, onMessage: (event: string, data: any) => void) {
  const wsUrl = `ws://127.0.0.1:8000/ws/${type}/${id}`;
  let ws: WebSocket | null = null;
  let reconnectTimer: any = null;

  function connect() {
    try {
      ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        console.log(`[WS] Connected as ${type} #${id}`);
      };

      ws.onmessage = (event) => {
        try {
          const parsed = JSON.parse(event.data);
          if (parsed.event && parsed.data) {
            onMessage(parsed.event, parsed.data);
          }
        } catch (e) {
          // Plain message like pong
        }
      };

      ws.onclose = () => {
        console.log(`[WS] Disconnected. Reconnecting in 2s...`);
        reconnectTimer = setTimeout(connect, 2000);
      };

      ws.onerror = (err) => {
        console.error(`[WS] Error:`, err);
        ws?.close();
      };
    } catch (e) {
      console.error("[WS] Initialization error", e);
    }
  }

  connect();

  return {
    send: (msg: string) => {
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(msg);
      }
    },
    close: () => {
      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (ws) ws.close();
    },
  };
}
