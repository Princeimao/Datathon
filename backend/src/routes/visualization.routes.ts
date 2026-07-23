import { Router } from "express";
import {
    getGeospatialPoints,
    getDistrictStats,
    getTrendAlerts,
    getNetworkGraph,
    getRepeatOffenders,
    getAssociationNetworks,
    getPredictiveStats,
    getAnomalies,
    getTimelineStats,
    getSimilarPersons,
    getCaseBoard,
    getDashboardSummary,
    getMapData
} from "../controllers/visualization.controller";

const router = Router();

router.get("/geospatial", getGeospatialPoints);
router.get("/district-stats", getDistrictStats);
router.get("/trends", getTrendAlerts);
router.get("/network", getNetworkGraph);
router.get("/repeat-offenders", getRepeatOffenders);
router.get("/associations", getAssociationNetworks);
router.get("/predictive", getPredictiveStats);
router.get("/anomalies", getAnomalies);

// Timeline, Similarity Matching & Investigation Board
router.get("/timeline", getTimelineStats);
router.get("/similar-persons/:personId", getSimilarPersons);
router.get("/case-board/:caseId", getCaseBoard);

// Dashboard & Map aggregation endpoints
router.get("/dashboard-summary", getDashboardSummary);
router.get("/map-data", getMapData);

export default router;
