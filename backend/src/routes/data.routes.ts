import { Router } from "express";
import { singleUpload } from "../controllers/data.controller";

const router = Router();

router.route("/").post(singleUpload)


export default router;