import app from './app.js';
import http from 'http';
import { setupSocket } from './socket.js';

const server = http.createServer(app);
setupSocket(server);

const PORT = process.env.PORT || 8000;

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
