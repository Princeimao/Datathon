import { Router } from "express";
import { getPoliceStationsByCity, getPoliceStationsByState } from "../controllers/police.controller.js";

const router = Router();

router.get("/city/:city", getPoliceStationsByCity);
router.get("/state/:state", getPoliceStationsByState);

export default router;
