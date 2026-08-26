import { Router } from "express";
import {
  enrollFace,
  searchFace,
  listSubjects,
  listPersonFaces,
} from "../controllers/face.controller.js";

const router = Router();

router.post("/enroll", enrollFace);
router.post("/search", searchFace);
router.get("/subjects", listSubjects);
router.get("/person/:personId", listPersonFaces);

export default router;
