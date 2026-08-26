import { Request, Response } from "express";
import { prisma } from "../config/prisma.config.js";
import {
  enrollFaceForPerson,
  luxandListSubjects,
  searchFaces,
} from "../services/luxand.service.js";

/**
 * Enroll a face for a person (optionally linked to a case / evidence).
 */
export async function enrollFace(req: Request, res: Response) {
  try {
    const { personId, caseId, evidenceId, imageUrl, imageKey, base64, subject } =
      req.body;

    if (!personId) {
      return res.status(400).json({
        success: false,
        message: "personId is required",
      });
    }

    if (!imageUrl && !imageKey && !base64) {
      return res.status(400).json({
        success: false,
        message: "One of imageUrl, imageKey or base64 is required",
      });
    }

    const person = await prisma.person.findUnique({
      where: { id: personId },
      select: { id: true },
    });

    if (!person) {
      return res.status(404).json({
        success: false,
        message: "Person not found",
      });
    }

    const faceRecord = await enrollFaceForPerson({
      personId,
      caseId,
      evidenceId,
      imageUrl,
      imageKey,
      base64,
      subject,
    });

    return res.status(201).json({
      success: true,
      faceRecord,
    });
  } catch (error: any) {
    console.error("Face enroll error:", error);

    return res.status(500).json({
      success: false,
      message: error.message || "Unable to enroll face",
    });
  }
}

/**
 * Search faces and resolve matches to persons / cases / evidence.
 */
export async function searchFace(req: Request, res: Response) {
  try {
    const { imageUrl, imageKey, base64, minProbability } = req.body;

    if (!imageUrl && !imageKey && !base64) {
      return res.status(400).json({
        success: false,
        message: "One of imageUrl, imageKey or base64 is required",
      });
    }

    const matches = await searchFaces({
      imageUrl,
      imageKey,
      base64,
      minProbability,
    });

    return res.json({
      success: true,
      count: matches.length,
      matches,
    });
  } catch (error: any) {
    console.error("Face search error:", error);

    return res.status(500).json({
      success: false,
      message: error.message || "Unable to search faces",
    });
  }
}

/**
 * List Luxand subjects currently stored.
 */
export async function listSubjects(_req: Request, res: Response) {
  try {
    const subjects = await luxandListSubjects();

    return res.json({
      success: true,
      count: subjects.length,
      subjects,
    });
  } catch (error: any) {
    console.error("Face subjects error:", error);

    return res.status(500).json({
      success: false,
      message: error.message || "Unable to list subjects",
    });
  }
}

/**
 * List face records for a person.
 */
export async function listPersonFaces(req: Request, res: Response) {
  try {
    const personId = req.params.personId as string;

    const faces = await prisma.faceRecord.findMany({
      where: { personId },
      orderBy: { createdAt: "desc" },
    });

    return res.json({
      success: true,
      count: faces.length,
      faces,
    });
  } catch (error: any) {
    console.error("Person faces error:", error);

    return res.status(500).json({
      success: false,
      message: error.message || "Unable to list person faces",
    });
  }
}
