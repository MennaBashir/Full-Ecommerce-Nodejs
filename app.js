import express from "express";
import dotenv from "dotenv";
import { mountRoutes } from "./routes/index.js";
import { connectDB } from "./config/connectDB.js";
dotenv.config({path:"./config/.env"});

const app = express();
app.use(express.json()); //* to parse json data
const port = process.env.PORT || 8000;

mountRoutes(app);
//* Connect to the DB first, then call app.listen()
connectDB();
const server = app.listen(port, () => {
  console.log(`app listening on port ${port}`);
});
