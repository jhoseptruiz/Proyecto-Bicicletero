import "dotenv/config";
import express from "express";
import morgan from "morgan";
import cors from "cors";
import path from "path";
import fs from "fs";
import https from "https";
import { fileURLToPath } from 'url';
import { connectDB } from "./config/configDb.js";
import { routerApi } from "./routes/index.routes.js";
import { PORT } from "./config/configEnv.js";

const app = express();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(cors());
app.use(express.json());
app.use(morgan("dev"));

app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

app.get("/", (req, res) => {
  res.send("API de Bicicleteros");
});

connectDB()
  .then(() => {
    routerApi(app);

    // Intentar cargar certificados SSL para HTTPS
    try {
      const httpsOptions = {
        key: fs.readFileSync(path.join(__dirname, '../../frontend/key.pem')),
        cert: fs.readFileSync(path.join(__dirname, '../../frontend/cert.pem'))
      };

      // Iniciar servidor HTTPS
      https.createServer(httpsOptions, app).listen(PORT, '0.0.0.0', () => {
        console.log(`🔐 Servidor HTTPS iniciado en https://localhost:${PORT}`);
      });

    } catch (error) {
      console.log('⚠️ No se encontraron certificados SSL, iniciando en modo HTTP.');
      console.log('Error:', error.message);

      // Fallback a HTTP si fallan los certificados
      app.listen(PORT, '0.0.0.0', () => {
        console.log(`Servidor HTTP iniciado en http://localhost:${PORT}`);
      });
    }

  })
  .catch((error) => {
    console.log("Error al iniciar el servidor:", error);
    process.exit(1);
  });