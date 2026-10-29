import sqlite3 from 'sqlite3';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

const dbPath = process.env.DB_PATH || './server/data/metalslug.db';
const dbDir = path.dirname(dbPath);

if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

export const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('❌ Error conectando a la base de datos SQLite:', err.message);
  } else {
    console.log(`✅ Base de datos SQLite conectada en: ${dbPath}`);
  }
});

// Helper para ejecutar consultas con async/await
export function runQuery(sql: string, params: any[] = []): Promise<{ lastID: number; changes: number }> {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
}

export function getQuery<T = any>(sql: string, params: any[] = []): Promise<T | undefined> {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row as T);
    });
  });
}

export function allQuery<T = any>(sql: string, params: any[] = []): Promise<T[]> {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows as T[]);
    });
  });
}

// Inicialización del esquema relacional real (CERO MOCKS)
export async function initDatabase(): Promise<void> {
  await runQuery(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await runQuery(`
    CREATE TABLE IF NOT EXISTS game_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      score INTEGER DEFAULT 0,
      kills INTEGER DEFAULT 0,
      slugs_used INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(user_id) REFERENCES users(id)
    )
  `);

  await runQuery(`
    CREATE TABLE IF NOT EXISTS high_scores (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL,
      score INTEGER NOT NULL,
      mission TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Catálogo de Armas Reales de Producción
  await runQuery(`
    CREATE TABLE IF NOT EXISTS weapons (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      pickup_symbol TEXT NOT NULL,
      fire_rate REAL NOT NULL,
      default_ammo INTEGER NOT NULL,
      base_damage INTEGER NOT NULL,
      description TEXT NOT NULL
    )
  `);

  // Inventario persistente por jugador
  await runQuery(`
    CREATE TABLE IF NOT EXISTS game_inventory (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER UNIQUE,
      active_weapon_id TEXT DEFAULT 'PISTOL',
      ammo_remaining INTEGER DEFAULT -1,
      grenades_remaining INTEGER DEFAULT 10,
      score INTEGER DEFAULT 0,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(user_id) REFERENCES users(id),
      FOREIGN KEY(active_weapon_id) REFERENCES weapons(id)
    )
  `);

  // Sembrar catálogo de armas si está vacío
  const weaponCount = await getQuery<{ total: number }>('SELECT COUNT(*) as total FROM weapons');
  if (weaponCount && weaponCount.total === 0) {
    const weapons = [
      ['PISTOL', 'Pistol', 'P', 0.16, -1, 1, 'Pistola semiautomática con munición infinita'],
      ['HMG', 'Heavy Machine Gun', 'H', 0.08, 200, 2, 'Fuego automático rápido y barrido diagonal continuo'],
      ['ROCKET', 'Rocket Launcher', 'R', 0.35, 30, 8, 'Proyectiles autopropulsados con aceleración y splash damage'],
      ['SHOTGUN', 'Shotgun', 'S', 0.45, 30, 20, 'Dispersión destructiva masiva y cancelación de balas enemigas']
    ];

    for (const w of weapons) {
      await runQuery(
        'INSERT INTO weapons (id, name, pickup_symbol, fire_rate, default_ammo, base_damage, description) VALUES (?, ?, ?, ?, ?, ?, ?)',
        w
      );
    }
  }

  // Tabla de Vehículos Reales (Fase 3 - SV-001 Metal Slug)
  await runQuery(`
    CREATE TABLE IF NOT EXISTS vehicles (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      max_health INTEGER NOT NULL,
      vulcan_damage INTEGER NOT NULL,
      cannon_damage INTEGER NOT NULL,
      cannon_ammo INTEGER NOT NULL,
      description TEXT NOT NULL
    )
  `);

  // Tabla de Registro de Prisioneros Rescatados (POWs)
  await runQuery(`
    CREATE TABLE IF NOT EXISTS rescued_pows (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      pow_name TEXT NOT NULL,
      reward_type TEXT NOT NULL,
      rescued_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Sembrar vehículo SV-001 si no existe
  const vehicleCount = await getQuery<{ total: number }>('SELECT COUNT(*) as total FROM vehicles');
  if (vehicleCount && vehicleCount.total === 0) {
    await runQuery(
      'INSERT INTO vehicles (id, name, max_health, vulcan_damage, cannon_damage, cannon_ammo, description) VALUES (?, ?, ?, ?, ?, ?, ?)',
      ['SV_001', 'Super Vehicle-001 "Metal Slug"', 3, 2, 40, 10, 'Tanque todoterreno con cañón Vulcan 360°, proyectil pesado y autodestrucción kamikaze Slug Attack']
    );
  }

  // Catálogo de Enemigos Reales (Fase 4 - IA y Blindados)
  await runQuery(`
    CREATE TABLE IF NOT EXISTS enemies_catalog (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      max_health INTEGER NOT NULL,
      score_value INTEGER NOT NULL,
      description TEXT NOT NULL
    )
  `);

  // Telemetría de Bajas en Batalla
  await runQuery(`
    CREATE TABLE IF NOT EXISTS battle_telemetry (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      enemy_type TEXT NOT NULL,
      killed_by TEXT NOT NULL,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Sembrar catálogo de enemigos
  const enemyCount = await getQuery<{ total: number }>('SELECT COUNT(*) as total FROM enemies_catalog');
  if (enemyCount && enemyCount.total === 0) {
    const enemiesSeed = [
      ['REBEL_INFANTRY', 'Soldado Rebelde', 'INFANTRY', 1, 100, 'Infantería: patrulla, pánico, granadas, disparo de rifle o carga con bayoneta'],
      ['REBEL_TANK', 'Tanque Rebelde "Iron Iso"', 'HEAVY_ARMORED', 20, 1000, 'Blindado pesado con 20 HP, hit-flash blanco y cañón pesado'],
      ['REBEL_CHOPPER', 'Helicóptero "R-Shobu"', 'AERIAL', 15, 1500, 'Aeronave artillada: vuelo sinusoidal, bombardeo vertical y ráfagas aéreas']
    ];
    for (const e of enemiesSeed) {
      await runQuery(
        'INSERT INTO enemies_catalog (id, name, category, max_health, score_value, description) VALUES (?, ?, ?, ?, ?, ?)',
        e
      );
    }
  }

  // Insertar récords iniciales si la tabla está vacía
  const count = await getQuery<{ total: number }>('SELECT COUNT(*) as total FROM high_scores');
  if (count && count.total === 0) {
    await runQuery(
      'INSERT INTO high_scores (username, score, mission) VALUES (?, ?, ?)',
      ['MARCO_ROSSI', 100000, 'MISSION 1']
    );
    await runQuery(
      'INSERT INTO high_scores (username, score, mission) VALUES (?, ?, ?)',
      ['TARMA_ROVING', 75000, 'MISSION 1']
    );
  }
}
