const express = require("express");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const swaggerUi = require("swagger-ui-express");
const swaggerSpec = require("./swagger");
const path = require("path");

const app = express();

const corsOptions = {
  origin: [
    "*"
  ],
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "X-Requested-With",
    "ngrok-skip-browser-warning",
  ],
};

app.use(cors(corsOptions));
app.use(cookieParser());
app.use(express.json());

app.use(
  "/assets",
  express.static(path.join(__dirname, "assets"), {
    setHeaders: (res, filePath) => {
      if (
        path.extname(filePath).toLowerCase() === ".jpg" ||
        path.extname(filePath).toLowerCase() === ".png"
      ) {
        res.set("Cache-Control", "public, max-age=86400");
      }
    },
  })
);

const dotenv = require("dotenv");
dotenv.config({ path: "./config.env" });

require("./db/conn");

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send("Something broke!");
});

app.use(require("./routers/auth"));
app.use(require("./routers/courses-sync"));
app.use(require("./routers/email"));
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

const PORT = process.env.PORT || 3000;

app.get("/", (req, res) => {
  res.send("IbexEdu API is running... testing");
});

process.on("SIGINT", () => {
  console.log("Server is shutting down...");
  process.exit(0);
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
