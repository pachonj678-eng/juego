import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { initDatabase } from './db.js';
import * as authController from './controllers/auth.controller.js';
import * as scoresController from './controllers/scores.controller.js';
import * as weaponsController from './controllers/weapons.controller.js';
import * as vehiclesController from './controllers/vehicles.controller.js';
import * as enemiesController from './controllers/enemies.controller.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

// Logging middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ success: true, status: 'operational', timestamp: new Date().toISOString() });
});

// Rutas de Autenticación Real (Cero Mocks)
app.post('/api/auth/register', authController.register);
app.post('/api/auth/login', authController.login);
app.get('/api/auth/me', authController.me);

// Rutas de Scores y Persistencia Real
app.get('/api/scores', scoresController.getHighScores);
app.post('/api/scores', scoresController.postScore);

// Rutas de Armas y Combate (Fase 2 - Cero Mocks)
app.get('/api/weapons', weaponsController.getWeapons);
app.get('/api/inventory', weaponsController.getInventory);
app.post('/api/inventory/pickup', weaponsController.pickupWeapon);
app.put('/api/inventory/state', weaponsController.syncState);

// Rutas de Vehículos y POWs (Fase 3 - Cero Mocks)
app.get('/api/vehicles', vehiclesController.getVehicles);
app.post('/api/vehicles/slug-attack', vehiclesController.postSlugAttack);
app.post('/api/pows/rescue', vehiclesController.postRescuePow);

// Rutas de IA y Enemigos (Fase 4 - Cero Mocks)
app.get('/api/enemies', enemiesController.getEnemies);
app.post('/api/enemies/kill', enemiesController.postEnemyKill);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ success: false, error: `Ruta no encontrada: ${req.method} ${req.originalUrl}` });
});

// Iniciar base de datos y servidor
async function startServer() {
  try {
    await initDatabase();
    app.listen(PORT, () => {
      console.log(`🚀 [BACKEND] Servidor Metal Slug API escuchando en http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('❌ Error fatal al inicializar la base de datos o servidor:', error);
    process.exit(1);
  }
}

startServer();
