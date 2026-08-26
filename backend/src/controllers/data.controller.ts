import { Request, Response } from "express";
import { ingestBulkPayload } from "../services/intelligence-ingestion.service.js";

export async function processBulkImport(req: Request, res: Response) {
  try {
    const payload = req.body;

    if (!payload) {
      return res.status(400).json({
        message: "Payload is required",
      });
    }

    const result = await ingestBulkPayload(payload, req);

    return res.status(202).json({
      success: true,
      ...result,
    });
  } catch (error: any) {
    console.error("Bulk import error:", error);

    return res.status(500).json({
      success: false,
      message: error.message || "Unable to process bulk import",
    });
  }
}
