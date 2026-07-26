import { Request, Response } from "express";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { env } from "../config/env";

const s3 = new S3Client({
  endpoint: env.awsEndpoint!,
  region: "auto",
  credentials: {
    accessKeyId: env.awsAccessKeyId!,
    secretAccessKey: env.awsSecretAccessKey!,
  },
});

export async function generateSignedUrl(req: Request, res: Response) {
  try {
    const { fileName, contentType } = req.body;

    const bucketName = env.awsS3Bucket;

    if (!bucketName) {
      throw new Error("Bucket name is not defined");
    }

    const objectKey = `similarity-search/${Date.now()}-${fileName}`;

    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: objectKey,
      ContentType: contentType,
    });

    const uploadUrl = await getSignedUrl(s3, command, {
      expiresIn: 600,
    });

    return res.json({
      uploadUrl,
      objectKey,
    });
  } catch (err) {
    console.error(err);

    return res.status(500).json({
      message: "Unable to generate upload URL",
    });
  }
}
