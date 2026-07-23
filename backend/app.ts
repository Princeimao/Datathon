import express from 'express';
import cors from 'cors';
export const app = express();

app.use(express.json({ limit: "25mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cors());


// ROUTES IMPORT
import dataRoutes from "./src/routes/data.routes";
import visualizationRoutes from "./src/routes/visualization.routes";
import policeRoutes from "./src/routes/police.routes";

app.use("/api/v1/data", dataRoutes);
app.use("/api/v1/visualization", visualizationRoutes);
app.use("/api/v1/police", policeRoutes);

app.use((_req, res) => {
  res.status(404).json({ message: "Route not found" });
});
