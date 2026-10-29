import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { runQuery, getQuery, allQuery } from '../db.js';

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

export async function getVehicles(req: Request, res: Response): Promise<void> {
  try {
    const vehicles = await allQuery('SELECT * FROM vehicles');
    res.status(200).json({ success: true, data: vehicles });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || 'Error al consultar vehículos.' });
  }
}

export async function postSlugAttack(req: Request, res: Response): Promise<void> {
  try {
    const userId = extractUserId(req);
    const { vehicleId, damageDealt } = req.body;

    if (userId) {
      await runQuery(
        'INSERT INTO game_sessions (user_id, score, slugs_used) VALUES (?, ?, 1)',
        [userId, Number(damageDealt || 150) * 10]
      );
    }

    res.status(200).json({
      success: true,
      data: {
        vehicleId: vehicleId || 'SV_001',
        message: '¡SLUG ATTACK REGISTRADO CON ÉXITO!'
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || 'Error al registrar Slug Attack.' });
  }
}

export async function postRescuePow(req: Request, res: Response): Promise<void> {
  try {
    const userId = extractUserId(req);
    const { powName, rewardType } = req.body;

    const cleanName = (powName || 'HYAKUTARO').toString().substring(0, 32);
    const cleanReward = (rewardType || 'H').toString().substring(0, 16);

    const result = await runQuery(
      'INSERT INTO rescued_pows (user_id, pow_name, reward_type) VALUES (?, ?, ?)',
      [userId || null, cleanName, cleanReward]
    );

    res.status(201).json({
      success: true,
      data: {
        id: result.lastID,
        powName: cleanName,
        rewardType: cleanReward,
        bonusPoints: 10000,
        message: '¡THANK YOU! PRISIONERO RESCATADO'
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || 'Error al registrar rescate de POW.' });
  }
}
