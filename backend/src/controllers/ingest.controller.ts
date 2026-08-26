import { Request, Response } from "express";
import { ingestStructuredPayload } from "../services/structured-ingestion.service.js";

export async function createStructured(req: Request, res: Response) {
  try {
    const payload = req.body;

    if (!payload || typeof payload !== "object") {
      return res.status(400).json({
        message: "A structured ingestion payload is required",
      });
    }

    const result = await ingestStructuredPayload(payload);

    return res.status(201).json({
      success: true,
      ...result,
    });
  } catch (error: any) {
    console.error("Structured ingestion error:", error);

    return res.status(500).json({
      success: false,
      message: error.message || "Unable to create structured case",
    });
  }
}
