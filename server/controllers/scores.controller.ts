import { Request, Response } from 'express';
import { runQuery, allQuery } from '../db.js';

export async function getHighScores(req: Request, res: Response): Promise<void> {
  try {
    const scores = await allQuery(
      'SELECT id, username, score, mission, created_at as createdAt FROM high_scores ORDER BY score DESC LIMIT 10'
    );
    res.status(200).json({ success: true, data: scores });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || 'Error al obtener los high scores.' });
  }
}

export async function postScore(req: Request, res: Response): Promise<void> {
  try {
    const { username, score, mission } = req.body;

    if (!username || typeof score !== 'number' || score < 0) {
      res.status(400).json({ success: false, error: 'Datos de puntuación inválidos.' });
      return;
    }

    const cleanUsername = String(username).trim().toUpperCase().substring(0, 16);
    const cleanMission = (mission || 'MISSION 1').toString().substring(0, 32);

    const result = await runQuery(
      'INSERT INTO high_scores (username, score, mission) VALUES (?, ?, ?)',
      [cleanUsername, Math.floor(score), cleanMission]
    );

    res.status(201).json({
      success: true,
      data: {
        id: result.lastID,
        username: cleanUsername,
        score,
        mission: cleanMission
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || 'Error al guardar la puntuación.' });
  }
}
