const express = require("express");
const { Server } = require("socket.io");
const http = require("http");
const path = require("path"); // ADDED: serve the frontend

const app = express();
const httpserver = http.createServer(app);
const io = new Server(httpserver);

app.use(express.static(path.join(__dirname, "public"))); // ADDED

const users = new Map(); // ADDED: socket.id -> { name, avatar, color }
let msgId = 0; // ADDED

let count = 0;
io.on("connection", (socket) => {
  count++;
  console.log("Active user: ", count);

  // Send msg from server to client
  socket.emit("click", "Hello from socket.IO");

  // Send msg from server to client
  socket.broadcast.emit("join", "New User Joined");

  socket.on("fr", (cb) => {
    console.log(cb);
  });

  // ---------- ADDED: chat events ----------
  socket.on("setUser", (u = {}) => {
    const name = String(u.name || "Guest").trim().slice(0, 20) || "Guest";
    const user = { id: socket.id, name, avatar: String(u.avatar || "🙂").slice(0, 4), color: String(u.color || "#ffb86b").slice(0, 9) };
    const isNew = !users.has(socket.id);
    users.set(socket.id, user);
    io.emit("users", [...users.values()]);
    if (isNew) socket.broadcast.emit("user:joined", user);
  });

  socket.on("message", (text) => {
    const user = users.get(socket.id);
    text = String(text || "").trim().slice(0, 1000);
    if (!user || !text) return;
    io.emit("message", { id: ++msgId, user, text, ts: Date.now() });
  });

  socket.on("typing", () => {
    const user = users.get(socket.id);
    if (user) socket.broadcast.emit("typing", user.name);
  });

  socket.on("react", ({ id, emoji } = {}) => {
    const user = users.get(socket.id);
    if (user && id && emoji) io.emit("reaction", { id, emoji: String(emoji).slice(0, 4), by: user.name });
  });
  // ----------------------------------------

  socket.on("disconnect", () => {
    count--;
    console.log("Active user: ", count);
    const user = users.get(socket.id); // ADDED
    if (user) {
      users.delete(socket.id);
      io.emit("users", [...users.values()]);
      io.emit("user:left", user);
    }
  });

  io.emit("announcement", "Today is last class");
});

httpserver.listen(8080, () => {
  console.log("Server started");
});
