import * as THREE from 'three';
import { ENTRY_WIDTH, wallWithOpening, createEntrance } from './entrance.js';

export const SCREEN_WALL_HEIGHT = 6.8;
const SEGMENTS = 512;

export function createDigitalWall(model, radius, floorY, carpet, height = SCREEN_WALL_HEIGHT) {
  const root = new THREE.Group();
  root.name = 'Full_circle_digital_wall';
  const frame = new THREE.MeshStandardMaterial({
    name: 'Dark display housing', color: '#172e59', roughness: 0.65, metalness: 0.2,
    side: THREE.DoubleSide,
  });
  const display = new THREE.MeshPhysicalMaterial({
    name: 'Blank digital screen', color: '#122958', roughness: 0.3, metalness: 0.05,
    clearcoat: 0.8, clearcoatRoughness: 0.18,
    emissive: '#19386f', emissiveIntensity: 0.28, side: THREE.DoubleSide,
  });
  const screen = new THREE.Mesh(
    wallWithOpening(radius - 0.01, 0.12, height - 0.12, SEGMENTS),
    display,
  );
  screen.name = 'Digital_screen_360';
  screen.position.y = floorY;
  screen.userData.surface = 'digital-screen';
  screen.userData.content = 'blank';
  root.add(screen);

  // Keep the display and its backing far enough apart to avoid depth fighting
  // when viewing the curved wall at a shallow angle from across the room.
  for (const r of [radius + 0.12, radius + 0.3]) {
    const side = new THREE.Mesh(wallWithOpening(r, 0, height, SEGMENTS), frame);
    side.name = r < radius + 0.2 ? 'Inner_display_housing' : 'Outer_wall_back';
    side.position.y = floorY;
    root.add(side);
  }
  for (const y of [floorY, floorY + height]) {
    const halfAngle = y === floorY ? Math.asin(ENTRY_WIDTH / 2 / radius) : 0;
    const geometry = new THREE.RingGeometry(radius, radius + 0.3, SEGMENTS, 1, Math.PI * 1.5 + halfAngle, Math.PI * 2 - halfAngle * 2);
    geometry.rotateX(-Math.PI / 2);
    const cap = new THREE.Mesh(geometry, frame);
    cap.name = 'Display_housing_edge';
    cap.position.y = y;
    root.add(cap);
  }
  const bezelMaterial = new THREE.MeshStandardMaterial({
    name: 'Slim screen bezel', color: '#ffe1ae', roughness: 0.35, metalness: 0.4,
    emissive: '#ffb461', emissiveIntensity: 0.15,
  });
  for (const y of [floorY + 0.12, floorY + height - 0.12]) {
    let geometry;
    if (y < floorY + 1) {
      const halfAngle = Math.asin(ENTRY_WIDTH / 2 / (radius - 0.01));
      class BezelArc extends THREE.Curve {
        getPoint(t, target = new THREE.Vector3()) {
          const angle = THREE.MathUtils.lerp(halfAngle, Math.PI * 2 - halfAngle, t);
          return target.set((radius - 0.01) * Math.sin(angle), 0, (radius - 0.01) * Math.cos(angle));
        }
      }
      geometry = new THREE.TubeGeometry(new BezelArc(), SEGMENTS, 0.025, 6, false);
    } else {
      geometry = new THREE.TorusGeometry(radius - 0.01, 0.025, 6, SEGMENTS);
      geometry.rotateX(Math.PI / 2);
    }
    const bezel = new THREE.Mesh(geometry, bezelMaterial);
    bezel.name = 'Continuous_screen_bezel';
    bezel.position.y = y;
    root.add(bezel);
  }
  const entrance = createEntrance(root, radius, floorY, carpet.material, carpet.geometry);
  root.traverse(object => {
    if (!object.isMesh) return;
    object.castShadow = true;
    object.receiveShadow = object.userData.surface !== 'digital-screen';
  });
  model.add(root);
  // A stable, independently mapped surface is ready for future screen content.
  // This change intentionally supplies no graphics, text, controls or behavior.
  return { root, screen, entrance, radius: radius - 0.01, height };
}
