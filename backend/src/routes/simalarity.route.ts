import { Router } from "express";
import {
  searchSimilarity,
  getInvestigation,
} from "../controllers/similarity.controller.js";

const router = Router();

router.route("/search").post(searchSimilarity);
router.route("/investigation/:caseId").get(getInvestigation);

export default router;
