import express from "express";
import swaggerUi from "swagger-ui-express";
import YAML from "yamljs";
import path from "path";

const router = express.Router();
const specPath = path.join(__dirname, "..", "openapi.yml");
const spec = YAML.load(specPath);

router.use("/", swaggerUi.serve, swaggerUi.setup(spec, {
  explorer: true,
  customSiteTitle: "PropTech API Docs",
}));

export default router;
