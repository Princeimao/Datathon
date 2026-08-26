import { Router } from "express";
import { processBulkImport } from "../controllers/data.controller.js";

const router = Router();

router.post("/process", processBulkImport);

export default router;
