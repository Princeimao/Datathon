import { Router } from "express";
import {
  districtBoundries,
  getALlDistricts,
  getAllStates,
  stateBoundries,
} from "../controllers/boundries.controller";

const router = Router();

router.get("/states/:stateId/boundary", stateBoundries);
router.get("/districts/:districtId/boundary", districtBoundries);

router.get("/states", getAllStates);
router.get("/districts", getALlDistricts);

export default router;
