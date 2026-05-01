import express from "express";
import cors from "cors";
import chatRoutes from "./modules/chat/chat.routes";

const app = express();
app.use(cors({
  origin: function (origin, callback) {
    // Allow all origins
    callback(null, true);
  },
  credentials: true,
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
