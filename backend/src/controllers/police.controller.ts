import { Request, Response } from "express";
import { prisma } from "../config/prisma.config.js";

export const getPoliceStationsByCity = async (req: Request, res: Response) => {
  try {
    const { city } = req.params as { city: string };

    const policeStations = await prisma.policeUnit.findMany({
      where: {
        district: {
          districtName: {
            equals: city,
            mode: "insensitive",
          },
        },
        unitType: {
          unitTypeName: {
            equals: "Police Station",
            mode: "insensitive",
          },
        },
        active: true,
      },
      select: {
        id: true,
        unitName: true,
      },
      orderBy: {
        unitName: "asc",
      },
    });

    const stations = policeStations.map((station: any) => ({
      id: station.id,
      name: station.unitName,
    }));

    res.status(200).json({
      stations,
    });
  } catch (error) {
    console.error("Error fetching police stations by city:", error);

    res.status(500).json({
      error: "Internal Server Error",
    });
  }
};

export const getPoliceStationsByState = async (req: Request, res: Response) => {
  try {
    const { state } = req.params as { state: string };

    const policeStations = await prisma.policeUnit.findMany({
      where: {
        state: {
          stateName: {
            equals: state,
            mode: "insensitive",
          },
        },
        unitType: {
          unitTypeName: {
            equals: "Police Station",
            mode: "insensitive",
          },
        },
        active: true,
      },
      select: {
        id: true,
        unitName: true,
      },
      orderBy: {
        unitName: "asc",
      },
    });

    const stations = policeStations.map((station: any) => ({
      id: station.id,
      name: station.unitName,
    }));

    res.status(200).json({
      stations,
    });
  } catch (error) {
    console.error("Error fetching police stations by state:", error);

    res.status(500).json({
      error: "Internal Server Error",
    });
  }
};
