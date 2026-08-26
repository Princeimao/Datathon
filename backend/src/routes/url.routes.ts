import { Router } from "express";
import {
  generateSignedUrl,
  generateSignedGetUrl,
} from "../controllers/url.controller.js";

const router = Router();

router.post("/signed-url", generateSignedUrl);
router.get("/signed-get", generateSignedGetUrl);

export default router;
