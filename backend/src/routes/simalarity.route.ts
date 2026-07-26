import { Router } from "express";
import { searchSimilarity } from "../controllers/similarity.controller";

const router = Router();

router.route("/search").post(searchSimilarity);

export default router;
