import dotenv from "dotenv";
import path from "path";
dotenv.config({ path: path.resolve(process.cwd(), ".env") });
import app from "./src/app.js";
import connectDB from "./src/config/db.js";

connectDB().then(() =>
  app.listen(process.env.PORT || 5000, () =>
    console.log("Server on " + process.env.PORT),
  ),
);
