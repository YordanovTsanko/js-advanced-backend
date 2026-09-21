import cors from "cors";
import express from "express";
import routes from "./routes/index.js";
import notFound from "./middleware/notFound.js";
import errorHandler from "./middleware/errorHandler.js";
import { apiLimiter } from "./middleware/rateLimiter.js";

const app = express();

app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
  }),
);

app.use(express.json());
app.use(apiLimiter);

// Needed for correct req.ip when behind a proxy/load balancer
app.set("trust proxy", 1);

app.use("/api/v1", routes);

app.get("/health", (req, res) => res.status(200).json({ status: "ok" }));

app.use(notFound);
app.use(errorHandler);

export default app;
