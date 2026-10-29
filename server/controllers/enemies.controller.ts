import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { runQuery, allQuery } from '../db.js';

const JWT_SECRET = process.env.JWT_SECRET || 'metal_slug_super_secret_production_key_2026_snk';

function extractUserId(req: Request): number | null {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  try {
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: number };
    return decoded.userId;
  } catch {
    return null;
  }
}

export async function getEnemies(req: Request, res: Response): Promise<void> {
  try {
    const enemies = await allQuery('SELECT * FROM enemies_catalog ORDER BY max_health ASC');
    res.status(200).json({ success: true, data: enemies });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || 'Error al consultar catálogo de enemigos.' });
  }
}

export async function postEnemyKill(req: Request, res: Response): Promise<void> {
  try {
    const userId = extractUserId(req);
    const { enemyType, killedBy } = req.body;

    const cleanEnemy = (enemyType || 'REBEL_INFANTRY').toString().substring(0, 32);
    const cleanWeapon = (killedBy || 'BULLET').toString().substring(0, 32);

    const result = await runQuery(
      'INSERT INTO battle_telemetry (user_id, enemy_type, killed_by) VALUES (?, ?, ?)',
      [userId || null, cleanEnemy, cleanWeapon]
    );

    res.status(201).json({
      success: true,
      data: {
        id: result.lastID,
        enemyType: cleanEnemy,
        killedBy: cleanWeapon
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || 'Error al registrar baja enemiga.' });
  }
}
