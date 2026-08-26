import { Router } from "express";
import { createStructured } from "../controllers/ingest.controller.js";

const router = Router();

router.post("/structured", createStructured);

export default router;
