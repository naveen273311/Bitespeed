import express from "express";
import cors from "cors";
import identifyRouter from "./routes/identify.route.js";
import { errorHandler } from "./middlewares/error.middleware.js";

const app = express();

app.use(cors());
app.use(express.json());
app.use("/api", identifyRouter);
app.use(errorHandler);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Identity service running on port ${PORT}`);
});

export { app };
