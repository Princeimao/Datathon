import type { Request, Response } from "express";
import { processQueue } from "../queues/raw.queue";

export const singleUpload = async (req: Request, res: Response) => {
    try {
        const { data } = req.body as { data: string };
        await processQueue.add("process", { data });

        console.log("Added to process queue")

        res.status(200).json({
            success: true,
            message: "Data uploaded successfully"
        });

    } catch (error) {
        console.log(error);
        throw error;
    }
};


