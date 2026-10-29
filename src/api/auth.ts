export interface User {
  id: number;
  username: string;
  createdAt?: string;
}

export interface AuthResponse {
  success: boolean;
  data?: {
    token: string;
    user: User;
  };
  error?: string;
}

export interface HighScore {
  id: number;
  username: string;
  score: number;
  mission: string;
  createdAt: string;
}

export class ApiClient {
  private static tokenKey = 'metalslug_jwt_token';

  public static getToken(): string | null {
    return sessionStorage.getItem(ApiClient.tokenKey);
  }

  public static setToken(token: string): void {
    sessionStorage.setItem(ApiClient.tokenKey, token);
  }

  public static clearToken(): void {
    sessionStorage.removeItem(ApiClient.tokenKey);
  }

  public static async register(username: string, password: string): Promise<AuthResponse> {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    const data = await res.json();
    if (data.success && data.data?.token) {
      ApiClient.setToken(data.data.token);
    }
    return data;
  }

  public static async login(username: string, password: string): Promise<AuthResponse> {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    const data = await res.json();
    if (data.success && data.data?.token) {
      ApiClient.setToken(data.data.token);
    }
    return data;
  }

  public static async getProfile(): Promise<User | null> {
    const token = ApiClient.getToken();
    if (!token) return null;

    try {
      const res = await fetch('/api/auth/me', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      return data.success ? data.data.user : null;
    } catch {
      return null;
    }
  }

  public static async getHighScores(): Promise<HighScore[]> {
    try {
      const res = await fetch('/api/scores');
      const data = await res.json();
      return data.success ? data.data : [];
    } catch {
      return [];
    }
  }

  public static async submitScore(username: string, score: number, mission = 'MISSION 1'): Promise<boolean> {
    try {
      const res = await fetch('/api/scores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, score, mission }),
      });
      const data = await res.json();
      return data.success;
    } catch {
      return false;
    }
  }

  public static async getWeapons(): Promise<any[]> {
    try {
      const res = await fetch('/api/weapons');
      const data = await res.json();
      return data.success ? data.data : [];
    } catch {
      return [];
    }
  }

  public static async getVehicles(): Promise<any[]> {
    try {
      const res = await fetch('/api/vehicles');
      const data = await res.json();
      return data.success ? data.data : [];
    } catch {
      return [];
    }
  }

  public static async triggerSlugAttack(damageDealt = 150): Promise<any> {
    try {
      const token = ApiClient.getToken();
      const res = await fetch('/api/vehicles/slug-attack', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ vehicleId: 'SV_001', damageDealt })
      });
      return await res.json();
    } catch {
      return { success: false };
    }
  }

  public static async rescuePow(powName: string, rewardType: string): Promise<any> {
    try {
      const token = ApiClient.getToken();
      const res = await fetch('/api/pows/rescue', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ powName, rewardType })
      });
      return await res.json();
    } catch {
      return { success: false };
    }
  }

  public static async getEnemiesCatalog(): Promise<any[]> {
    try {
      const res = await fetch('/api/enemies');
      const data = await res.json();
      return data.success ? data.data : [];
    } catch {
      return [];
    }
  }

  public static async logEnemyKill(enemyType: string, killedBy: string): Promise<any> {
    try {
      const token = ApiClient.getToken();
      const res = await fetch('/api/enemies/kill', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ enemyType, killedBy })
      });
      return await res.json();
    } catch {
      return { success: false };
    }
  }
}
