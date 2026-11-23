import * as THREE from 'three';

export const SCREEN_WALL_HEIGHT = 6.8;
const SEGMENTS = 512;

export function createDigitalWall(model, radius, floorY) {
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
    new THREE.CylinderGeometry(radius - 0.01, radius - 0.01, SCREEN_WALL_HEIGHT - 0.24, SEGMENTS, 1, true),
    display,
  );
  screen.name = 'Digital_screen_360';
  screen.position.y = floorY + SCREEN_WALL_HEIGHT / 2;
  screen.userData.surface = 'digital-screen';
  screen.userData.content = 'blank';
  root.add(screen);

  // Keep the display and its backing far enough apart to avoid depth fighting
  // when viewing the curved wall at a shallow angle from across the room.
  for (const r of [radius + 0.12, radius + 0.3]) {
    const side = new THREE.Mesh(new THREE.CylinderGeometry(r, r, SCREEN_WALL_HEIGHT, SEGMENTS, 1, true), frame);
    side.name = r < radius + 0.2 ? 'Inner_display_housing' : 'Outer_wall_back';
    side.position.y = floorY + SCREEN_WALL_HEIGHT / 2;
    root.add(side);
  }
  for (const y of [floorY, floorY + SCREEN_WALL_HEIGHT]) {
    const geometry = new THREE.RingGeometry(radius, radius + 0.3, SEGMENTS);
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
  for (const y of [floorY + 0.12, floorY + SCREEN_WALL_HEIGHT - 0.12]) {
    const geometry = new THREE.TorusGeometry(radius - 0.01, 0.025, 6, SEGMENTS);
    geometry.rotateX(Math.PI / 2);
    const bezel = new THREE.Mesh(geometry, bezelMaterial);
    bezel.name = 'Continuous_screen_bezel';
    bezel.position.y = y;
    root.add(bezel);
  }
  root.traverse(object => {
    if (!object.isMesh) return;
    object.castShadow = true;
    object.receiveShadow = object.userData.surface !== 'digital-screen';
  });
  model.add(root);
  // A stable, independently mapped surface is ready for future screen content.
  // This change intentionally supplies no graphics, text, controls or behavior.
  return { root, screen, radius: radius - 0.01, height: SCREEN_WALL_HEIGHT };
}
