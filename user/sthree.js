import { S3 } from "@aws-sdk/client-s3";
import { fromIni } from "@aws-sdk/credential-provider-ini";
import dotenv from 'dotenv';
import multer from "multer";
import multerS3 from "multer-s3";
import path from "path";
import crypto from "crypto";
dotenv.config();

const s3 = new S3({
  region: "us-east-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

const uploadwithaws = (folderName) =>
  multer({
    storage: multerS3({
      s3: s3,
      bucket: process.env.BUCKET_NAME,
      metadata: function (req, file, cb) {
        cb(null, { fieldName: file.fieldname });
      },
      key: function (req, file, cb) {
        const folderPath = folderName ? `${folderName}/` : "";
        const fileName = crypto.randomBytes(16).toString("hex");
        const fileExtension = path.extname(file.originalname).toLowerCase();
        const encryptedFileName = `${fileName}${fileExtension}`;
        cb(null, `${folderPath}${encryptedFileName}`);
      },
    }),
    fileFilter: (req, file, callback) => {
      const ext = path.extname(file.originalname).toLowerCase();
      if (ext !== ".jpg" && ext !== ".jpeg" && ext !== ".png" && ext !==".pdf") {
        return callback(new Error("Only images are allowed"));
      }
      callback(null, true);
    },
  });

export default uploadwithaws;
