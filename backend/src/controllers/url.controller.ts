import { Request, Response } from "express";
import {
  createUploadUrl,
  createDownloadUrl,
} from "../services/catalyst.service.js";

export async function generateSignedUrl(req: Request, res: Response) {
  try {
    const { fileName, contentType, keyPrefix = "similarity-search" } =
      req.body;

    if (!fileName) {
      return res.status(400).json({
        message: "fileName is required",
      });
    }

    const result = await createUploadUrl({
      keyPrefix,
      fileName,
      contentType,
      req,
    });

    return res.json(result);
  } catch (err) {
    console.error(err);

    return res.status(500).json({
      message: "Unable to generate upload URL",
    });
  }
}

export async function generateSignedGetUrl(req: Request, res: Response) {
  try {
    const { objectKey, key } = req.query;

    const objectKeyValue = String(objectKey || key || "");

    if (!objectKeyValue) {
      return res.status(400).json({
        message: "objectKey is required",
      });
    }

    const result = await createDownloadUrl({
      key: objectKeyValue,
      req,
    });

    return res.json(result);
  } catch (err) {
    console.error(err);

    return res.status(500).json({
      message: "Unable to generate download URL",
    });
  }
}
