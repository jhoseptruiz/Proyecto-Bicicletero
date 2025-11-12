import * as bicicletaService from "../services/bicicleta.service.js";
import { handleSuccess, handleErrorClient, handleErrorServer } from "../Handlers/responseHandlers.js";
import path from 'path';
import sharp from 'sharp';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function postBicicleta(req, res) {
  try {
    const usuarioRut = req.user.sub;

    if (!req.file) {
      return handleErrorClient(res, 400, "La foto de la bicicleta es requerida.");
    }
    
    const tempPath = req.file.path;
    const outputFilename = `${Date.now()}-${req.file.originalname.split('.')[0]}.webp`;
    const outputPath = path.join(__dirname, `../../uploads/bicicletas/${outputFilename}`);
    
    await sharp(tempPath)
      .resize({ width: 800 })
      .webp({ quality: 80 })
      .toFile(outputPath);
      
    await fs.unlink(tempPath);

    const fotoUrlRelativa = path.join('uploads', 'bicicletas', outputFilename).replace(/\\/g, "/");

    const bicicletaData = {
      marca: req.body.marca,
      fotoUrl: fotoUrlRelativa
    };

    const nuevaBicicleta = await bicicletaService.crearBicicleta(bicicletaData, usuarioRut);
    handleSuccess(res, 201, "Bicicleta registrada", nuevaBicicleta);

  } catch (error) {
    if (req.file) {
      await fs.unlink(req.file.path).catch(err => console.error("Error al limpiar archivo temporal:", err));
    }
    handleErrorServer(res, 500, "Error al registrar bicicleta", error.message);
  }
}

export async function getMisBicicletas(req, res) {
  try {
    const usuarioRut = req.user.sub;
    const bicicletas = await bicicletaService.findMisBicicletas(usuarioRut);
    handleSuccess(res, 200, "Bicicletas del usuario obtenidas", bicicletas);
  } catch (error) {
    handleErrorServer(res, 500, "Error al obtener bicicletas", error.message);
  }
}

export async function updateBicicleta(req, res) {
  let tempPath = req.file ? req.file.path : null;
  try {
    const { id } = req.params;
    const usuarioRut = req.user.sub;
    
    const updateData = {
      marca: req.body.marca,
    };

    if (req.file) {
      const outputFilename = `${Date.now()}-${req.file.originalname.split('.')[0]}.webp`;
      const outputPath = path.join(__dirname, `../../uploads/bicicletas/${outputFilename}`);

      await sharp(tempPath)
        .resize({ width: 800 })
        .webp({ quality: 80 })
        .toFile(outputPath);
      
      await fs.unlink(tempPath);
      tempPath = null;
      
      updateData.fotoUrl = path.join('uploads', 'bicicletas', outputFilename).replace(/\\/g, "/");
    }

    const bicicletaActualizada = await bicicletaService.actualizarBicicleta(id, usuarioRut, updateData);
    handleSuccess(res, 200, "Bicicleta actualizada exitosamente", bicicletaActualizada);
  } catch (error) {
    if (tempPath) {
      await fs.unlink(tempPath).catch(err => console.error("Error al limpiar archivo temporal en update:", err));
    }
    if (error.message.includes("no encontrada") || error.message.includes("no autorizado")) {
      handleErrorClient(res, 404, error.message);
    } else {
      handleErrorServer(res, 500, "Error al actualizar la bicicleta", error.message);
    }
  }
}

export async function deleteBicicleta(req, res) {
  try {
    const { id } = req.params;
    const usuarioRut = req.user.sub;
    
    await bicicletaService.eliminarBicicleta(id, usuarioRut);
    handleSuccess(res, 200, "Bicicleta eliminada exitosamente");
  } catch (error) {
    if (error.message.includes("no encontrada") || error.message.includes("no autorizado")) {
      handleErrorClient(res, 404, error.message);
    } else {
      handleErrorServer(res, 500, "Error al eliminar la bicicleta", error.message);
    }
  }
}