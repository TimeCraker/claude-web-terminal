import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import { SessionManager } from './session-manager';
import { WebSocketHandler } from './ws-handler';

const PORT = parseInt(process.env.PORT || '3100', 10);

// 创建 HTTP 服务器
const server = createServer((req, res) => {
  // 健康检查端点
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', timestamp: Date.now() }));
    return;
  }

  // API 端点：获取 workspace 列表
  if (req.url === '/api/workspaces' && req.method === 'GET') {
    const workspaces = sessionManager.getAllWorkspaces();
    res.writeHead(200, {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    });
    res.end(JSON.stringify(workspaces));
    return;
  }

  // 404
  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Not found' }));
});

// 创建 WebSocket 服务器
const wss = new WebSocketServer({ server });

// 初始化会话管理器
const sessionManager = new SessionManager();

// 初始化 WebSocket 处理器
const wsHandler = new WebSocketHandler(wss, sessionManager);

// 启动服务器
server.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════════════════════╗
║                                                            ║
║   🚀 AI Workspace OS - Backend Server                     ║
║                                                            ║
║   HTTP:      http://localhost:${PORT}                        ║
║   WebSocket: ws://localhost:${PORT}                          ║
║   Health:    http://localhost:${PORT}/health                 ║
║                                                            ║
║   Ready to accept connections...                           ║
║                                                            ║
╚════════════════════════════════════════════════════════════╝
  `);
});

// 优雅退出
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down server...');
  wss.close(() => {
    server.close(() => {
      console.log('👋 Server stopped');
      process.exit(0);
    });
  });
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Received SIGTERM, shutting down...');
  wss.close(() => {
    server.close(() => {
      process.exit(0);
    });
  });
});
