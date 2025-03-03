import { Server as HttpServer } from "http";
import { NextApiRequest } from "next";
import { Server as SocketIOServer } from "socket.io";
import { createPagesServerClient } from "@supabase/auth-helpers-nextjs";
import { setSocketServer } from "@/lib/queue";

// Store the socket.io server instance
let io: SocketIOServer | null = null;

export default function SocketHandler(req: NextApiRequest, res: any) {
  // If the socket.io server is already running, skip initialization
  if (res.socket.server.io) {
    res.end();
    return;
  }

  // Create a new socket.io server
  const httpServer: HttpServer = res.socket.server;
  io = new SocketIOServer(httpServer, {
    path: "/api/socket",
    addTrailingSlash: false,
  });

  // Set the socket server in the queue module
  setSocketServer(io);

  // Handle socket connections
  io.on("connection", async (socket) => {
    console.log("Socket connected:", socket.id);

    // Authenticate the socket connection
    try {
      const supabase = createPagesServerClient({ req, res });

      // Get the session from the cookie
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        console.log("No active session");
        socket.disconnect();
        return;
      }

      const userId = session.user.id;
      console.log(`Authenticated socket for user: ${userId}`);

      // Handle joining user-specific room
      socket.on("join", (data) => {
        if (data.userId === userId) {
          socket.join(userId);
          console.log(`User ${userId} joined their room`);
        }
      });

      // Handle leaving user-specific room
      socket.on("leave", (data) => {
        if (data.userId === userId) {
          socket.leave(userId);
          console.log(`User ${userId} left their room`);
        }
      });

      // Handle disconnection
      socket.on("disconnect", () => {
        console.log("Socket disconnected:", socket.id);
      });
    } catch (error) {
      console.error("Socket authentication error:", error);
      socket.disconnect();
    }
  });

  // Store the socket.io server instance
  res.socket.server.io = io;

  res.end();
}
