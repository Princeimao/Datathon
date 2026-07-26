import { Router } from "express";
import { generateSignedUrl } from "../controllers/url.controller.js";

const router = Router();

router.post("/signed-url", generateSignedUrl);

export default router;
