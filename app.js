import path from "path";
import dotenv from 'dotenv';
dotenv.config();
import { fileURLToPath } from "url";
import { dirname } from "path";
import cors from "cors";
import cookieParser from "cookie-parser";
import express from 'express';
import mongoose from 'mongoose';


const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

app.use("/images", express.static(path.join(__dirname, "images")));
app.use("/books", express.static(path.join(__dirname, "books")));

app.use(express.json());
app.use(cors({ origin: process.env.FRONT_END_URL, credentials: true }));
app.use(cookieParser());

mongoose
  .connect(process.env.MONGO_URL)
  .then(() => {
    app.listen(4000);
  })
  .catch((err) => {
    console.log(err);
  });



import { router as userRouter } from "./user/userRouter.js";
import { router as booksRouter } from "./book/bookRouter.js";

app.use("/user", userRouter);
app.use("/book", booksRouter);
