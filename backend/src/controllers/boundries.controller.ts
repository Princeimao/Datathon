import { Router, Request, Response } from "express";
import { prisma } from "../config/prisma.config";
import fs from "fs";
import path from "path";

interface GeoJSONFeature {
  type: "Feature";
  geometry: {
    type: string;
    coordinates: unknown;
  };
  properties: {
    ST_NM?: string;
    DISTRICT?: string;
    censuscode?: number | string;
    [key: string]: unknown;
  };
}

interface GeoJSON {
  type: "FeatureCollection";
  features: GeoJSONFeature[];
}

const geoJsonCache = new Map<string, GeoJSON>();

function loadGeoJSON(filename: string): GeoJSON {
  if (geoJsonCache.has(filename)) {
    return geoJsonCache.get(filename) as GeoJSON;
  }

  const filePath = path.join(process.cwd(), "prisma", filename);

  if (!fs.existsSync(filePath)) {
    throw new Error(`GeoJSON file not found: ${filePath}`);
  }

  const parsed = JSON.parse(fs.readFileSync(filePath, "utf-8")) as GeoJSON;

  geoJsonCache.set(filename, parsed);

  return parsed;
}

function findByProperty(
  geojson: GeoJSON,
  property: "ST_NM" | "DISTRICT",
  value: string,
) {
  const normalized = value.trim().toLowerCase();

  return geojson.features.find(
    (feature) =>
      String(feature.properties?.[property] || "")
        .trim()
        .toLowerCase() === normalized,
  );
}

export const stateBoundries = async (req: Request, res: Response) => {
  try {
    const stateId = Number(req.params.stateId);

    if (!Number.isInteger(stateId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid state ID",
      });
    }

    // Find state in DB
    const state = await prisma.state.findUnique({
      where: {
        id: stateId,
      },
      select: {
        id: true,
        stateName: true,
        active: true,
      },
    });

    if (!state || !state.active) {
      return res.status(404).json({
        success: false,
        message: "State not found",
      });
    }

    // Load the state GeoJSON
    const geojson = loadGeoJSON("state.json");

    // Find matching feature
    const feature = findByProperty(geojson, "ST_NM", state.stateName);

    if (!feature) {
      return res.status(404).json({
        success: false,
        message: "Boundary not found for this state",
      });
    }

    return res.json({
      type: "Feature",
      properties: {
        id: state.id,
        stateName: state.stateName,
      },
      geometry: feature.geometry,
    });
  } catch (error) {
    console.error("Failed to fetch state boundary:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch state boundary",
    });
  }
};

export const districtBoundries = async (req: Request, res: Response) => {
  try {
    const districtId = Number(req.params.districtId);

    if (!Number.isInteger(districtId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid district ID",
      });
    }

    // Find district and state in DB
    const district = await prisma.district.findUnique({
      where: {
        id: districtId,
      },
      select: {
        id: true,
        districtName: true,
        stateId: true,
        active: true,
        state: {
          select: {
            stateName: true,
          },
        },
      },
    });

    if (!district || !district.active) {
      return res.status(404).json({
        success: false,
        message: "District not found",
      });
    }

    // Load district GeoJSON
    const geojson = loadGeoJSON("district.json");

    // Find matching district + state
    const feature = geojson.features.find((feature) => {
      const geoDistrict = String(feature.properties?.DISTRICT || "")
        .trim()
        .toLowerCase();

      const geoState = String(feature.properties?.ST_NM || "")
        .trim()
        .toLowerCase();

      return (
        geoDistrict === district.districtName.trim().toLowerCase() &&
        geoState === district.state.stateName.trim().toLowerCase()
      );
    });

    if (!feature) {
      return res.status(404).json({
        success: false,
        message: "Boundary not found for this district",
      });
    }

    return res.json({
      type: "Feature",
      properties: {
        id: district.id,
        districtName: district.districtName,
        stateId: district.stateId,
        stateName: district.state.stateName,
      },
      geometry: feature.geometry,
    });
  } catch (error) {
    console.error("Failed to fetch district boundary:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch district boundary",
    });
  }
};

export const getAllStates = async (req: Request, res: Response) => {
  try {
    const states = await prisma.state.findMany({
      where: {
        active: true,
      },
      select: {
        id: true,
        stateName: true,
      },
    });

    return res.json(states);
  } catch (error) {
    console.error("Failed to fetch states:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch states",
    });
  }
};

export const getALlDistricts = async (req: Request, res: Response) => {
  try {
    const districts = await prisma.district.findMany({
      where: {
        active: true,
      },
      select: {
        id: true,
        districtName: true,
        stateId: true,
      },
    });

    return res.json(districts);
  } catch (error) {
    console.error("Failed to fetch districts:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch districts",
    });
  }
};
