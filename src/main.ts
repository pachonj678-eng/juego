import './index.css';
import { GameLoop } from './engine/GameLoop.js';
import { InputManager } from './engine/InputManager.js';
import { Renderer } from './rendering/Renderer.js';
import { Player } from './entities/Player.js';
import { RebelSoldier } from './entities/RebelSoldier.js';
import { RebelTank } from './entities/RebelTank.js';
import { RebelChopper } from './entities/RebelChopper.js';
import { EnemyBullet } from './entities/EnemyBullet.js';
import { EnemyGrenade } from './entities/EnemyGrenade.js';
import { WeaponPickup } from './entities/WeaponPickup.js';
import { VehicleSlug } from './entities/VehicleSlug.js';
import { POW } from './entities/POW.js';
import { Explosion } from './entities/Explosion.js';
import { Vector2 } from './engine/Vector2.js';
import { ApiClient } from './api/auth.js';

// 1. Inicialización de Componentes de Arquitectura
const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
const renderer = new Renderer(canvas);
const input = new InputManager();

// Entidades del Jugador y Vehículo SV-001
const player = new Player(80, renderer.groundY);
const slug = new VehicleSlug(200, renderer.groundY);

// Enemigos de la Fase 4: Infantería IA, Tanque Pesado y Helicóptero Aéreo
const soldiers: RebelSoldier[] = [
  new RebelSoldier(350, renderer.groundY, 80),
  new RebelSoldier(420, renderer.groundY, 60),
  new RebelSoldier(490, renderer.groundY, 70)
];

const tank = new RebelTank(540, renderer.groundY);
const chopper = new RebelChopper(440, 110);

const enemyBullets: EnemyBullet[] = [];
const enemyGrenades: EnemyGrenade[] = [];

// Prisioneros (POWs) y Cajas de Armamento
const pows: POW[] = [
  new POW(300, renderer.groundY, 'H'),
  new POW(580, renderer.groundY, 'S')
];

const pickups: WeaponPickup[] = [
  new WeaponPickup(150, renderer.groundY, 'BOMB')
];

function handleExplosion(exp: Explosion): void {
  player.explosions.push(exp);
}

// 2. Colisión Proyectiles Enemigos -> Jugador / Tanque
function handleEnemyAttacks(): void {
  // Balas enemigas
  for (let i = enemyBullets.length - 1; i >= 0; i--) {
    const eb = enemyBullets[i];
    if (!eb.isAlive) {
      enemyBullets.splice(i, 1);
      continue;
    }

    if (slug.state === 'OCCUPIED' && eb.hitbox.intersects(slug.hitbox)) {
      eb.isAlive = false;
      slug.takeDamage(1);
    } else if (player.fsm.getState() !== 'IN_VEHICLE' && eb.hitbox.intersects(player.hitbox)) {
      eb.isAlive = false;
      if (!player.isInvulnerable()) {
        player.lives = Math.max(0, player.lives - 1);
        player.grantIFrames(Player.DEFAULT_IFRAME_DURATION);
      }
    }
  }

  // Granadas de infantería
  for (let i = enemyGrenades.length - 1; i >= 0; i--) {
    const eg = enemyGrenades[i];
    eg.update(GameLoop.FIXED_TIMESTEP, renderer.groundY, player, slug, handleExplosion);
    if (!eg.isAlive) {
      enemyGrenades.splice(i, 1);
    }
  }
}

// 3. Colisiones Proyectiles del Jugador / Tanque -> Enemigos
function handlePlayerCombatCollisions(): void {
  const allActiveBullets = [...player.bullets, ...slug.vulcanBullets];

  // A. Balas (Pistola, HMG, Vulcan) contra Soldados, Tanque y Helicóptero
  for (const b of allActiveBullets) {
    if (!b.isAlive) continue;

    // Contra Infantería (1 HP - Muerte instantánea y salida volando)
    for (const soldier of soldiers) {
      if (soldier.isAlive && b.hitbox.intersects(soldier.hitbox)) {
        b.isAlive = false;
        soldier.takeDamage('BULLET', b.direction.x > 0 ? 1 : -1);
        player.score += 100;
        ApiClient.logEnemyKill('REBEL_INFANTRY', 'BULLET');
        break;
      }
    }

    // Contra Tanque "Iron Iso" (20 HP - Hit Flash blanco)
    if (b.isAlive && tank.isAlive && b.hitbox.intersects(tank.hitbox)) {
      b.isAlive = false;
      tank.takeDamage(b.damage);
      player.score += 50;
      if (!tank.isAlive) {
        player.score += 1000;
        ApiClient.logEnemyKill('REBEL_TANK', 'BULLET');
      }
    }

    // Contra Helicóptero "R-Shobu" (15 HP - Hit Flash blanco)
    if (b.isAlive && chopper.isAlive && b.hitbox.intersects(chopper.hitbox)) {
      b.isAlive = false;
      chopper.takeDamage(b.damage);
      player.score += 75;
      if (!chopper.isAlive) {
        player.score += 1500;
        ApiClient.logEnemyKill('REBEL_CHOPPER', 'BULLET');
      }
    }
  }

  // B. Cohetes (Rocket Launcher) -> Impacto directo y Splash Damage
  for (const r of player.rockets) {
    if (!r.isAlive) continue;

    // Impacto con Tanque
    if (tank.isAlive && r.hitbox.intersects(tank.hitbox)) {
      r.isAlive = false;
      tank.takeDamage(r.damage);
      handleExplosion(new Explosion(r.position.x, r.position.y, 45, 0.35, 12));
      player.score += 200;
      if (!tank.isAlive) {
        player.score += 1000;
        ApiClient.logEnemyKill('REBEL_TANK', 'ROCKET');
      }
    }

    // Impacto con Helicóptero
    if (r.isAlive && chopper.isAlive && r.hitbox.intersects(chopper.hitbox)) {
      r.isAlive = false;
      chopper.takeDamage(r.damage);
      handleExplosion(new Explosion(r.position.x, r.position.y, 45, 0.35, 12));
      player.score += 250;
      if (!chopper.isAlive) {
        player.score += 1500;
        ApiClient.logEnemyKill('REBEL_CHOPPER', 'ROCKET');
      }
    }
  }

  // C. Perdigones de Escopeta -> Daño masivo a corto alcance
  for (const p of player.pellets) {
    if (!p.isAlive) continue;

    if (tank.isAlive && p.hitbox.intersects(tank.hitbox)) {
      p.isAlive = false;
      tank.takeDamage(p.damage);
      player.score += 150;
      if (!tank.isAlive) {
        player.score += 1000;
        ApiClient.logEnemyKill('REBEL_TANK', 'SHOTGUN');
      }
    }

    if (p.isAlive && chopper.isAlive && p.hitbox.intersects(chopper.hitbox)) {
      p.isAlive = false;
      chopper.takeDamage(p.damage);
      player.score += 150;
      if (!chopper.isAlive) {
        player.score += 1500;
        ApiClient.logEnemyKill('REBEL_CHOPPER', 'SHOTGUN');
      }
    }
  }

  // D. Obuses del Cañón del Tanque SV-001
  for (const shell of slug.cannonShells) {
    if (!shell.isAlive) continue;

    if (tank.isAlive && shell.hitbox.intersects(tank.hitbox)) {
      shell.isAlive = false;
      tank.takeDamage(shell.damage);
      handleExplosion(new Explosion(shell.position.x, shell.position.y, 65, 0.45, 40));
      player.score += 500;
      if (!tank.isAlive) {
        player.score += 1000;
        ApiClient.logEnemyKill('REBEL_TANK', 'SLUG_CANNON');
      }
    }

    if (shell.isAlive && chopper.isAlive && shell.hitbox.intersects(chopper.hitbox)) {
      shell.isAlive = false;
      chopper.takeDamage(shell.damage);
      handleExplosion(new Explosion(shell.position.x, shell.position.y, 65, 0.45, 40));
      player.score += 500;
      if (!chopper.isAlive) {
        player.score += 1500;
        ApiClient.logEnemyKill('REBEL_CHOPPER', 'SLUG_CANNON');
      }
    }
  }

  // E. Melee Knife Override contra Infantería
  if (player.fsm.getState() === 'MELEE') {
    for (const soldier of soldiers) {
      if (soldier.isAlive && player.meleeRangeBox.intersects(soldier.hitbox)) {
        soldier.takeDamage('KNIFE', player.facing);
        player.score += 500;
        ApiClient.logEnemyKill('REBEL_INFANTRY', 'KNIFE');
      }
    }
  }
}

// 4. Rescate de POWs
function handlePOWRescues(): void {
  for (const pow of pows) {
    if (pow.state !== 'TIED') continue;

    // Rescate con Cuchillo
    if (player.fsm.getState() === 'MELEE' && player.meleeRangeBox.intersects(pow.hitbox)) {
      pow.rescue(player.position.x, (p: WeaponPickup) => pickups.push(p));
      player.score += 10000;
      continue;
    }

    // Rescate con Balas
    for (const b of [...player.bullets, ...slug.vulcanBullets]) {
      if (b.isAlive && b.hitbox.intersects(pow.hitbox)) {
        b.isAlive = false;
        pow.rescue(player.position.x, (p: WeaponPickup) => pickups.push(p));
        player.score += 10000;
        break;
      }
    }
  }
}

// 5. Abordaje del Tanque SV-001
function handleVehicleMounting(): void {
  if (player.fsm.getState() !== 'IN_VEHICLE' && slug.state === 'UNMANNED') {
    if (player.hitbox.intersects(slug.hitbox)) {
      if (input.isDown('DOWN') && input.consumeBuffered('JUMP')) {
        player.mountVehicle(slug.position.x, slug.position.y);
        slug.state = 'OCCUPIED';
      }
    }
  }
}

// 6. Game Loop Determinista a 60 FPS
const gameLoop = new GameLoop(
  (dt: number) => {
    input.update(dt);
    handleVehicleMounting();

    // Actualizar vehículo SV-001
    const { playerEjected, ejectImpulse } = slug.update(
      dt,
      input,
      renderer.groundY,
      [], // Los enemigos de Fase 4 son procesados en el controlador principal
      enemyBullets,
      handleExplosion
    );

    if (playerEjected && ejectImpulse) {
      player.dismountVehicle(slug.position.x, slug.position.y - 20, ejectImpulse);
    }

    if (slug.state === 'OCCUPIED') {
      player.position.copy(slug.position);
    }

    // Actualizar jugador
    player.update(dt, input, renderer.groundY, [], enemyBullets, pickups);

    // Actualizar Soldados de Infantería IA
    for (const soldier of soldiers) {
      soldier.update(
        dt,
        renderer.groundY,
        player.position.x,
        (b: EnemyBullet) => enemyBullets.push(b),
        (g: EnemyGrenade) => enemyGrenades.push(g)
      );
    }

    // Actualizar Tanque Pesado Rebelde "Iron Iso"
    tank.update(
      dt,
      renderer.groundY,
      player.position.x,
      (b: EnemyBullet) => enemyBullets.push(b),
      handleExplosion
    );

    // Actualizar Helicóptero de Ataque "R-Shobu"
    chopper.update(
      dt,
      renderer.groundY,
      player.position.x,
      (b: EnemyBullet) => enemyBullets.push(b),
      (g: EnemyGrenade) => enemyGrenades.push(g),
      handleExplosion
    );

    // Actualizar POWs
    for (const pow of pows) {
      pow.update(dt, renderer.groundY, player.position.x, (p: WeaponPickup) => {
        pickups.push(p);
      });
    }

    // Actualizar Pickups
    for (const pickup of pickups) {
      pickup.update(dt);
    }

    // Actualizar Balas Enemigas
    for (const eb of enemyBullets) {
      eb.update(dt);
    }

    handleEnemyAttacks();
    handlePlayerCombatCollisions();
    handlePOWRescues();
    input.lateUpdate();
  },
  (_alpha: number) => {
    renderer.render(player, soldiers, tank, chopper, enemyBullets, enemyGrenades, pickups, slug, pows, gameLoop.currentFps);
  }
);

gameLoop.start();

// 7. Atajos y Controles de Prueba de Fase 4
window.addEventListener('keydown', (e) => {
  if (e.code === 'KeyH') {
    renderer.showDebug = !renderer.showDebug;
  }
  if (e.code === 'KeyU') {
    triggerSlugAttackAction();
  }
});

function triggerSlugAttackAction(): void {
  if (slug.state === 'OCCUPIED') {
    const success = slug.triggerSlugAttack();
    if (success) {
      player.dismountVehicle(slug.position.x, slug.position.y - 30, new Vector2(0, -480));
      player.grantIFrames(3.5);
      ApiClient.triggerSlugAttack(150);
    }
  }
}

// Botones UI
document.getElementById('btn-toggle-debug')?.addEventListener('click', () => {
  renderer.showDebug = !renderer.showDebug;
});

// Generadores de Enemigos Fase 4
document.getElementById('btn-respawn-tank')?.addEventListener('click', () => {
  tank.respawn(540, renderer.groundY);
});

document.getElementById('btn-respawn-chopper')?.addEventListener('click', () => {
  chopper.respawn(480, 110);
});

document.getElementById('btn-respawn-soldiers')?.addEventListener('click', () => {
  soldiers[0].respawn(340, renderer.groundY);
  soldiers[1].respawn(420, renderer.groundY);
  soldiers[2].respawn(500, renderer.groundY);
});

// Controles Tanque y Armas
document.getElementById('btn-toggle-mount')?.addEventListener('click', () => {
  if (slug.state === 'OCCUPIED') {
    slug.state = 'UNMANNED';
    player.dismountVehicle(slug.position.x, slug.position.y - 20, new Vector2(player.facing * 120, -360));
  } else if (slug.state === 'UNMANNED') {
    player.mountVehicle(slug.position.x, slug.position.y);
    slug.state = 'OCCUPIED';
  }
});

document.getElementById('btn-slug-attack')?.addEventListener('click', triggerSlugAttackAction);

document.getElementById('btn-repair-slug')?.addEventListener('click', () => {
  slug.repair();
  slug.position.set(200, renderer.groundY);
  slug.cannonAmmo = 10;
});

document.getElementById('btn-spawn-pow')?.addEventListener('click', () => {
  const rewards: ('H' | 'R' | 'S' | 'BOMB')[] = ['H', 'R', 'S', 'BOMB'];
  const r = rewards[Math.floor(Math.random() * rewards.length)];
  pows.push(new POW(player.position.x + 160, renderer.groundY, r));
});

document.getElementById('btn-weapon-shotgun')?.addEventListener('click', () => {
  player.equipWeapon('SHOTGUN', 30);
});
document.getElementById('btn-weapon-rocket')?.addEventListener('click', () => {
  player.equipWeapon('ROCKET', 30);
});

// 8. Integración SQLite (Catálogo de Enemigos, High Scores)
const authModal = document.getElementById('auth-modal') as HTMLDivElement;
const btnOpenAuth = document.getElementById('btn-open-auth') as HTMLButtonElement;
const btnCloseModal = document.getElementById('btn-close-modal') as HTMLButtonElement;
const authForm = document.getElementById('auth-form') as HTMLFormElement;
const modalTitle = document.getElementById('modal-title') as HTMLHeadingElement;
const btnSubmitAuth = document.getElementById('btn-submit-auth') as HTMLButtonElement;
const btnToggleAuthMode = document.getElementById('btn-toggle-auth-mode') as HTMLButtonElement;
const authAlert = document.getElementById('auth-alert') as HTMLDivElement;
const userDisplay = document.getElementById('user-display') as HTMLSpanElement;
const scoresContainer = document.getElementById('scores-container') as HTMLDivElement;
const btnRefreshScores = document.getElementById('btn-refresh-scores') as HTMLButtonElement;
const enemiesCatalogContainer = document.getElementById('enemies-catalog-container') as HTMLDivElement;

let isRegisterMode = false;

function setAlert(message: string, isError: boolean): void {
  authAlert.textContent = message;
  authAlert.className = `mb-3 p-2 rounded text-xs ${
    isError ? 'bg-red-900/60 text-red-200 border border-red-500' : 'bg-green-900/60 text-green-200 border border-green-500'
  }`;
}

btnOpenAuth?.addEventListener('click', () => {
  if (btnOpenAuth.textContent === 'Cerrar Sesión') {
    ApiClient.clearToken();
    userDisplay.textContent = 'INVITADO';
    userDisplay.className = 'text-arcade-green font-bold';
    btnOpenAuth.textContent = 'Iniciar Sesión';
    return;
  }
  authAlert.className = 'hidden';
  authModal.classList.remove('hidden');
});

btnCloseModal?.addEventListener('click', () => {
  authModal.classList.add('hidden');
});

btnToggleAuthMode?.addEventListener('click', () => {
  isRegisterMode = !isRegisterMode;
  modalTitle.textContent = isRegisterMode ? 'REGISTRO DE USUARIO' : 'INICIAR SESIÓN';
  btnSubmitAuth.textContent = isRegisterMode ? 'CREAR CUENTA' : 'ENTRAR';
  btnToggleAuthMode.textContent = isRegisterMode
    ? '¿Ya tienes cuenta? Inicia sesión aquí'
    : '¿No tienes cuenta? Regístrate aquí';
  authAlert.className = 'hidden';
});

authForm?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const usernameInput = document.getElementById('auth-username') as HTMLInputElement;
  const passwordInput = document.getElementById('auth-password') as HTMLInputElement;

  const username = usernameInput.value.trim();
  const password = passwordInput.value;

  try {
    const response = isRegisterMode
      ? await ApiClient.register(username, password)
      : await ApiClient.login(username, password);

    if (response.success && response.data) {
      userDisplay.textContent = response.data.user.username;
      userDisplay.className = 'text-arcade-yellow font-bold';
      btnOpenAuth.textContent = 'Cerrar Sesión';
      authModal.classList.add('hidden');
      authForm.reset();
    } else {
      setAlert(response.error || 'Ocurrió un error en el servidor.', true);
    }
  } catch (err: any) {
    setAlert('Error de conexión con el backend.', true);
  }
});

async function loadEnemiesCatalog(): Promise<void> {
  const enemiesData = await ApiClient.getEnemiesCatalog();
  if (enemiesData.length === 0) {
    enemiesCatalogContainer.innerHTML = '<div class="text-gray-500 italic">No hay enemigos en SQLite.</div>';
    return;
  }

  enemiesCatalogContainer.innerHTML = enemiesData
    .map(
      (e) => `
      <div class="p-1.5 rounded bg-arcade-dark/70 border border-red-700/60">
        <div class="flex items-center justify-between text-arcade-red font-bold">
          <span>${e.name}</span>
          <span class="text-arcade-yellow">${e.max_health} HP</span>
        </div>
        <div class="text-[10px] text-gray-400 mt-0.5">${e.description}</div>
      </div>
    `
    )
    .join('');
}

async function loadHighScores(): Promise<void> {
  scoresContainer.innerHTML = '<div class="text-gray-500 italic">Consultando SQLite...</div>';
  const scores = await ApiClient.getHighScores();
  if (scores.length === 0) {
    scoresContainer.innerHTML = '<div class="text-gray-500 italic">No hay récords registrados aún.</div>';
    return;
  }

  scoresContainer.innerHTML = scores
    .map(
      (s, idx) => `
      <div class="flex items-center justify-between py-1 border-b border-arcade-border/40">
        <span class="${idx === 0 ? 'text-arcade-yellow font-bold' : 'text-gray-300'}">
          #${idx + 1} ${s.username}
        </span>
        <span class="text-arcade-green font-bold">${s.score.toLocaleString()} PTS</span>
      </div>
    `
    )
    .join('');
}

btnRefreshScores?.addEventListener('click', loadHighScores);

async function initSession(): Promise<void> {
  const profile = await ApiClient.getProfile();
  if (profile) {
    userDisplay.textContent = profile.username;
    userDisplay.className = 'text-arcade-yellow font-bold';
    btnOpenAuth.textContent = 'Cerrar Sesión';
  }
  await Promise.all([loadHighScores(), loadEnemiesCatalog()]);
}

initSession();
