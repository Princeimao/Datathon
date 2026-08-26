import express from "express";
import cors from "cors";
import morgan from "morgan";
export const app = express();

app.use(express.json({ limit: "25mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cors());
app.use(morgan("dev"));

// ROUTES IMPORT
import visualizationRoutes from "./src/routes/visualization.routes.js";
import policeRoutes from "./src/routes/police.routes.js";
import urlRoutes from "./src/routes/url.routes.js";
import similarityRoutes from "./src/routes/simalarity.route.js";
import boundariesRoutes from "./src/routes/boundries.routes.js";
import ingestRoutes from "./src/routes/ingest.routes.js";
import dataRoutes from "./src/routes/data.routes.js";
import faceRoutes from "./src/routes/face.routes.js";

app.use("/api/v1/visualization", visualizationRoutes);
app.use("/api/v1/police", policeRoutes);
app.use("/api/v1/storage", urlRoutes);
app.use("/api/v1/similarity", similarityRoutes);
app.use("/api/v1/location", boundariesRoutes);
app.use("/api/v1/ingest", ingestRoutes);
app.use("/api/v1/data", dataRoutes);
app.use("/api/v1/faces", faceRoutes);

app.use((_req, res) => {
  res.status(404).json({ message: "Route not found" });
});
