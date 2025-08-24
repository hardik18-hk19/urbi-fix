import app from "./app.js";
import connectDB from "./config/db.js";
import env from "./config/env.js";
import { createServer } from "http";
import { configureSocket } from "./config/socket.js";

const PORT = env.PORT || 1011;

connectDB()
  .then(() => {
    // Create HTTP server and configure Socket.IO
    const server = createServer(app);
    const io = configureSocket(server);

    // Make io available in app context
    app.set("io", io);

    server.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
      console.log(`Socket.IO server initialized`);
    });
  })
  .catch((err) => {
    console.error("Failed to connect to MongoDB", err);
  });
