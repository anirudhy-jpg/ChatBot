import express from "express";
import cors from "cors";
import chatRoutes from "./modules/chat/chat.routes";

const app = express();
app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    callback(null, true);
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "x-user-id", "Accept", "Origin", "X-Requested-With"],
}));
app.use(express.json());

app.use("/api/chat", chatRoutes);
app.get("/api/health", (req, res) => {
  res.json({ ok: true });
});

app.get("/", (req, res) => {
  res.send("API running...");
});

export default app;
