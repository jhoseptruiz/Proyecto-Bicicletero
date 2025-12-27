
import { AppDataSource } from "../src/config/configDb.js";
import { Bicicletero } from "../src/entities/bicicletero.entity.js";

async function updateBicicleteros() {
    try {
        await AppDataSource.initialize();
        console.log("Database connected for seeding.");

        const repo = AppDataSource.getRepository(Bicicletero);

        // 1. Clear existing data
        console.log("Clearing existing Bicicleteros...");
        // Use query to avoid TypeORM protection on empty delete and handle cascades if simple
        await repo.query('TRUNCATE TABLE bicicleteros RESTART IDENTITY CASCADE');

        // 2. Define new UBB Bicicleteros
        const newBicicleteros = [
            {
                ubicacion: "Biblioteca Central",
                latitud: -36.8222,
                longitud: -73.0134,
                capacidad: 20,
                codigoQr: "BIB-001",
                estado: "operativo",
                bicicletasGuardadas: 5
            },
            {
                ubicacion: "Gimnasio Multitaller",
                latitud: -36.8215,
                longitud: -73.0142,
                capacidad: 15,
                codigoQr: "GIM-002",
                estado: "operativo",
                bicicletasGuardadas: 2
            },
            {
                ubicacion: "Aulas AC-AD",
                latitud: -36.8230,
                longitud: -73.0130,
                capacidad: 30,
                codigoQr: "AUL-003",
                estado: "operativo",
                bicicletasGuardadas: 28 // LLENO example
            }
        ];

        // 3. Insert
        console.log("Inserting new UBB locations...");
        await repo.save(newBicicleteros);

        console.log("✅ Bicicleteros updated successfully!");
        process.exit(0);
    } catch (error) {
        console.error("❌ Error updating bicicleteros:", error);
        process.exit(1);
    }
}

updateBicicleteros();
