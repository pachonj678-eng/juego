import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { runQuery, getQuery } from '../db.js';

const JWT_SECRET = process.env.JWT_SECRET || 'metal_slug_super_secret_production_key_2026_snk';

export interface UserRow {
  id: number;
  username: string;
  password_hash: string;
  created_at: string;
}

export async function register(req: Request, res: Response): Promise<void> {
  try {
    const { username, password } = req.body;

    if (!username || typeof username !== 'string' || username.trim().length < 3) {
      res.status(400).json({ success: false, error: 'El nombre de usuario debe tener al menos 3 caracteres.' });
      return;
    }

    if (!password || typeof password !== 'string' || password.length < 6) {
      res.status(400).json({ success: false, error: 'La contraseña debe tener al menos 6 caracteres.' });
      return;
    }

    const cleanUsername = username.trim().toUpperCase();

    // Validar si el usuario ya existe
    const existing = await getQuery<UserRow>('SELECT id FROM users WHERE username = ?', [cleanUsername]);
    if (existing) {
      res.status(409).json({ success: false, error: 'El usuario ya se encuentra registrado.' });
      return;
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const result = await runQuery(
      'INSERT INTO users (username, password_hash) VALUES (?, ?)',
      [cleanUsername, passwordHash]
    );

    const token = jwt.sign(
      { userId: result.lastID, username: cleanUsername },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      success: true,
      data: {
        token,
        user: { id: result.lastID, username: cleanUsername }
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || 'Error interno del servidor al registrar.' });
  }
}

export async function login(req: Request, res: Response): Promise<void> {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      res.status(400).json({ success: false, error: 'Usuario y contraseña requeridos.' });
      return;
    }

    const cleanUsername = username.trim().toUpperCase();

    const user = await getQuery<UserRow>('SELECT * FROM users WHERE username = ?', [cleanUsername]);
    if (!user) {
      res.status(401).json({ success: false, error: 'Credenciales inválidas.' });
      return;
    }

    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
      res.status(401).json({ success: false, error: 'Credenciales inválidas.' });
      return;
    }

    const token = jwt.sign(
      { userId: user.id, username: user.username },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(200).json({
      success: true,
      data: {
        token,
        user: { id: user.id, username: user.username }
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || 'Error interno del servidor al autenticar.' });
  }
}

export async function me(req: Request, res: Response): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ success: false, error: 'Token no proporcionado.' });
      return;
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: number; username: string };

    const user = await getQuery<UserRow>('SELECT id, username, created_at FROM users WHERE id = ?', [decoded.userId]);
    if (!user) {
      res.status(404).json({ success: false, error: 'Usuario no encontrado.' });
      return;
    }

    res.status(200).json({
      success: true,
      data: { user: { id: user.id, username: user.username, createdAt: user.created_at } }
    });
  } catch (error) {
    res.status(401).json({ success: false, error: 'Token inválido o expirado.' });
  }
}
