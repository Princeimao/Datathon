import { Request, Response } from "express";
import { prisma } from "../config/prisma.config";

export const getPoliceStationsByCity = async (req: Request, res: Response) => {
    try {
        const { city } = req.params as { city: string };
        const policeStations = await prisma.policeStation.findMany({
            where: {
                name: {
                    equals: city,
                    mode: "insensitive",
                },
            },
            select: {
                name: true
            }
        });

        const stations = policeStations.map(stations => stations.name);
        res.status(200).json({ stations: stations });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Internal Server Error" });
    }
};

export const getPoliceStationsByState = async (req: Request, res: Response) => {
    try {
        const { state } = req.params as { state: string };
        const policeStations = await prisma.policeStation.findMany({
            where: {
                state: {
                    equals: state,
                    mode: "insensitive",
                },
            },
            select: {
                name: true,
            },
        });

        const stations = policeStations.map(stations => stations.name);
        res.status(200).json({ stations: stations });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Internal Server Error" });
    }
};