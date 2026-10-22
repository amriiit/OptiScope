import express from "express";
import path from "node:path";
import { api } from "./routes/api.js";
import { rootDir } from "./config/limits.js";
import { localHost } from "./middleware/localOnly.js";
import { errorHandler } from "./middleware/errorHandler.js";
export const app = express();
app.disable("x-powered-by");
app.use(localHost);
app.use("/api", api);
app.use(express.static(path.join(rootDir, "frontend/dist")));
app.get("*", (req, res, next) => {
  if (req.path.startsWith("/api/"))
    return res.status(404).json({ error: "API route not found" });
  res.sendFile(path.join(rootDir, "frontend/dist/index.html"), (error) => {
    if (error) next(error);
  });
});
app.use(errorHandler);
