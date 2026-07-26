import express from "express";
import cors from "cors";
export const app = express();

app.use(express.json({ limit: "25mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cors());

// ROUTES IMPORT
import visualizationRoutes from "./src/routes/visualization.routes.js";
import policeRoutes from "./src/routes/police.routes.js";
import urlRoutes from "./src/routes/url.routes.js";
import similarityRoutes from "./src/routes/simalarity.route.js";

app.use("/api/v1/visualization", visualizationRoutes);
app.use("/api/v1/police", policeRoutes);
app.use("/api/v1/storage", urlRoutes);
app.use("/api/v1/similarity", similarityRoutes);

app.use((_req, res) => {
  res.status(404).json({ message: "Route not found" });
});
