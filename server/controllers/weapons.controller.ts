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

export async function getWeapons(req: Request, res: Response): Promise<void> {
  try {
    const weapons = await allQuery('SELECT * FROM weapons ORDER BY base_damage ASC');
    res.status(200).json({ success: true, data: weapons });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || 'Error al obtener el catálogo de armas.' });
  }
}

export async function getInventory(req: Request, res: Response): Promise<void> {
  try {
    const userId = extractUserId(req);
    if (!userId) {
      res.status(401).json({ success: false, error: 'Autenticación requerida para acceder al inventario.' });
      return;
    }

    let inv = await getQuery(
      `SELECT gi.*, w.name as weapon_name, w.pickup_symbol, w.base_damage
       FROM game_inventory gi
       JOIN weapons w ON gi.active_weapon_id = w.id
       WHERE gi.user_id = ?`,
      [userId]
    );

    if (!inv) {
      // Crear inventario por defecto para el usuario si no existe
      await runQuery(
        'INSERT INTO game_inventory (user_id, active_weapon_id, ammo_remaining, grenades_remaining, score) VALUES (?, ?, ?, ?, ?)',
        [userId, 'PISTOL', -1, 10, 0]
      );
      inv = await getQuery(
        `SELECT gi.*, w.name as weapon_name, w.pickup_symbol, w.base_damage
         FROM game_inventory gi
         JOIN weapons w ON gi.active_weapon_id = w.id
         WHERE gi.user_id = ?`,
        [userId]
      );
    }

    res.status(200).json({ success: true, data: inv });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || 'Error al obtener el inventario.' });
  }
}

export async function pickupWeapon(req: Request, res: Response): Promise<void> {
  try {
    const userId = extractUserId(req);
    const { weaponId } = req.body;

    if (!weaponId || typeof weaponId !== 'string') {
      res.status(400).json({ success: false, error: 'ID de arma requerido.' });
      return;
    }

    const weapon = await getQuery('SELECT * FROM weapons WHERE id = ?', [weaponId.toUpperCase()]);
    if (!weapon) {
      res.status(404).json({ success: false, error: 'Arma no encontrada en el catálogo.' });
      return;
    }

    if (userId) {
      // Actualizar inventario en la base de datos real
      await runQuery(
        `INSERT INTO game_inventory (user_id, active_weapon_id, ammo_remaining, updated_at)
         VALUES (?, ?, ?, CURRENT_TIMESTAMP)
         ON CONFLICT(user_id) DO UPDATE SET
           active_weapon_id = excluded.active_weapon_id,
           ammo_remaining = excluded.ammo_remaining,
           updated_at = CURRENT_TIMESTAMP`,
        [userId, weapon.id, weapon.default_ammo]
      );
    }

    res.status(200).json({
      success: true,
      data: {
        weapon,
        ammo: weapon.default_ammo,
        message: `¡${weapon.name.toUpperCase()} RECOGIDA!`
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || 'Error al procesar el pickup.' });
  }
}

export async function syncState(req: Request, res: Response): Promise<void> {
  try {
    const userId = extractUserId(req);
    const { activeWeaponId, ammoRemaining, grenadesRemaining, score } = req.body;

    if (userId) {
      await runQuery(
        `INSERT INTO game_inventory (user_id, active_weapon_id, ammo_remaining, grenades_remaining, score, updated_at)
         VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
         ON CONFLICT(user_id) DO UPDATE SET
           active_weapon_id = COALESCE(?, active_weapon_id),
           ammo_remaining = COALESCE(?, ammo_remaining),
           grenades_remaining = COALESCE(?, grenades_remaining),
           score = COALESCE(?, score),
           updated_at = CURRENT_TIMESTAMP`,
        [
          userId,
          activeWeaponId || 'PISTOL',
          ammoRemaining ?? -1,
          grenadesRemaining ?? 10,
          score ?? 0,
          activeWeaponId,
          ammoRemaining,
          grenadesRemaining,
          score
        ]
      );
    }

    res.status(200).json({ success: true, message: 'Estado sincronizado en base de datos.' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || 'Error al sincronizar estado.' });
  }
}
