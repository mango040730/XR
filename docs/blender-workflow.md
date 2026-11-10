# Blender → 공통 PC·VR 월드 연결 규격

최종 공간·아바타 없이 포함된 `public/assets/models/test-room/scene.glb`로 개발합니다. 이 파일은 무압축 glTF 2.0 방 fixture입니다. 최종 Blender 자산의 모든 재질·텍스처·확장 호환성을 증명하지는 않습니다.

## 1. Blender에서 준비/내보내기

1. 원본 `.blend`를 별도로 저장합니다. Scene Units에서 Metric을 사용하고 실제 1m 크기를 확인합니다.
2. 바닥 윗면을 Blender Z=0에 놓고 모델 중심/원점을 정리합니다. 필요한 객체의 크기를 확인하고 Object Mode에서 `Ctrl+A → Scale`을 적용합니다.
3. 상호작용할 문·버튼·소품에는 **고유 ASCII 이름**을 지정합니다. 예: `door_button`, `room_prop_01`. 공백·점·괄호는 피합니다. glTF/Three.js 이름 정리 과정으로 표시 이름이 달라질 수 있습니다. 같은 이름이 중복되면 바인딩 오류로 처리합니다.
4. 법선과 표면 방향을 확인하고 Principled BSDF 기반의 단순한 재질로 시작합니다. 복잡한 노드/절차적 재질은 적절히 bake해야 할 수 있습니다.
5. `File → Export → glTF 2.0 (.glb/.gltf)`에서 **glTF Binary (.glb)**를 선택합니다. 필요한 공간 객체만 내보내고 불필요한 카메라·조명은 제외합니다.
6. glTF **+Y Up** 변환을 사용합니다. 모델 전체를 추가로 -90도 회전하지 않습니다. 모디파이어를 사용했다면 Apply Modifiers와 실제 내보낸 결과를 확인합니다.
7. 처음에는 Draco/Meshopt/KTX2 압축을 끕니다. 현재 해당 디코더를 등록하지 않았습니다. 텍스처는 GLB 안에 포함하고 원본 크기/용량을 확인합니다.
8. `scene.glb`로 저장합니다. `.blend` 파일의 확장자만 바꾸면 안 됩니다.

웹의 좌표는 미터 단위, Y-up, 카메라 기본 방향 -Z입니다. 기본 내보내기에서 Blender `(x,y,z)`는 glTF `(x,z,-y)`가 됩니다. config 회전은 **라디안**입니다. model의 변환과 충돌/텔레포트/시작 위치는 모두 최종 **월드 좌표**에서 일치해야 합니다.

## 2. 파일 복사와 등록

VS Code 터미널에서 프로젝트 폴더를 기준으로 실행합니다.

```bash
mkdir -p public/assets/models/new-world
mkdir -p src/worlds/new-world
```

내보낸 파일을 `public/assets/models/new-world/scene.glb`에 복사합니다. `test-room/scene.glb`는 생성 스크립트가 다시 쓰는 fixture이므로 최종 자산은 다른 폴더를 사용합니다.

`src/worlds/new-world/config.ts`에는 아래처럼 모델/시작점/조명/바닥/박스를 작성합니다. 아래 예시는 폭 10m·깊이 12m인 평평한 방입니다.

```ts
import { DEFAULT_PLAYER } from '../../config/defaults';
import type { WorldConfig } from '../../engine/world/types';

export const newWorld: WorldConfig = {
  id: 'new-world', name: 'Blender 공간', description: '공통 PC·VR 공간',
  model: {
    url: `${import.meta.env.BASE_URL}assets/models/new-world/scene.glb`,
    position: [0, 0, 0], rotation: [0, 0, 0], scale: [1, 1, 1],
  },
  spawn: { position: [0, 0, 4], yaw: 0 },
  player: { ...DEFAULT_PLAYER },
  lighting: { sky: '#d6f3ff', ground: '#415163', intensity: 2, sun: 2.5, background: '#172b3a' },
  floors: [{ center: [0, 0], size: [10, 12], y: 0, color: '#334e5c', visible: false }],
  boxes: [
    { position: [0, 1.5, -6], size: [10, 3, 0.3], color: '#637f8c', visible: false },
    { position: [0, 1.5, 6], size: [10, 3, 0.3], color: '#637f8c', visible: false },
    { position: [-5, 1.5, 0], size: [0.3, 3, 12], color: '#637f8c', visible: false },
    { position: [5, 1.5, 0], size: [0.3, 3, 12], color: '#637f8c', visible: false },
  ],
  interactions: [
    { nodeName: 'door_button', id: 'door-button', label: '문 버튼', maxDistance: 3 },
  ],
  teleport: {
    areas: [{ minX: -4.5, maxX: 4.5, minZ: -5.5, maxZ: 5.5, y: 0 }],
    maxDistance: 8,
  },
  xr: { movement: 'teleport', turn: 'snap', snapAngle: Math.PI / 6 },
};
```

`door_button`은 실제 GLB에 있어야 합니다. 버튼이 아직 없다면 interactions를 생략합니다. ID는 논리 액션 식별자이고 nodeName은 GLB 객체 이름입니다. 이름으로 찾은 노드와 하위 메시를 같은 액션으로 연결합니다. 현재 액션은 색상 변경/복원과 선택 안내이며 **실제로 문을 여는 애니메이션은 아직 없습니다**. 향후 `InteractionSystem.actions`를 구독해 전용 콘텐츠를 연결합니다.

`src/worlds/registry.ts`에 import와 목록 원소만 추가합니다.

```ts
import { newWorld } from './new-world/config';
// 기존 testWorldA, testWorldB, glbTestRoom을 유지
export const worlds: readonly WorldConfig[] = [testWorldA, testWorldB, glbTestRoom, newWorld];
```

프로덕션 E2E의 월드 개수 기대값도 새 등록 수에 맞춥니다. 공통 엔진 코드는 수정하지 않습니다.

## 3. 충돌과 텔레포트 규격

- spawn.position은 **발 위치**입니다. PC의 눈높이를 더한 값을 넣지 않습니다. VR은 실제 local-floor 머리 높이를 사용합니다.
- floors는 `[x,z]` 중심·폭/깊이·윗면 y, boxes는 `[x,y,z]` 중심·전체 크기입니다. `visible:false`는 충돌은 유지하고 프록시 Geometry만 숨깁니다.
- 시각 GLB를 지정해도 자동 충돌은 생기지 않습니다. 벽·기둥·문/장애물에 맞는 박스를 수동 작성합니다. model 위치/회전/크기를 바꾸면 프록시와 spawn도 맞춰야 합니다.
- teleport.areas는 착지할 발 영역입니다. 몸 반경까지 영역 안에 있어야 합니다. areas를 생략하면 월드 floors를 기본 사용하고 `areas:[]`는 텔레포트를 막습니다.
- 목적지 거리/유한 좌표/같은 바닥 높이/착지 몸체/머리 여유/경로의 벽·장애물·바닥 틈과 컨트롤러 시야를 검사합니다. 벽 뒤나 틈 너머를 점프하는 이동은 허용하지 않습니다.
- 지금은 평면/AABB만 지원합니다. 임의 회전 벽은 보수적인 AABB로 근사합니다. 계단·경사면·triangle collision/collision.glb는 아직 지원하지 않습니다.
- 모델에 포함된 카메라·조명·애니메이션을 자동 채택하지 않습니다. 월드 config/공통 플레이어가 담당합니다.

## 4. 검증 명령과 직접 확인

```bash
npm run validate:assets -- public/assets/models/new-world/scene.glb
npm run typecheck
npm run lint
npm test
npm run build
npm run test:e2e
npm run dev
```

형식 검사는 자체 포함 GLB를 대상으로 합니다. 실제 자산마다 텍스처·재질·단위·방향·spawn·시야·충돌 프록시·자원/성능을 확인합니다. 프록시를 잠시 visible:true로 보여 일치 여부를 비교할 수 있습니다. 여러 번 A/B와 전환하고 누락 파일/바인딩 오류에서 이전 공간이 유지되는지도 검사합니다.

VR은 신뢰 가능한 HTTPS/기기 브라우저에서 별도로 [실기기 체크리스트](vr-device-checklist.md)를 수행합니다. 자동 테스트의 합성 XR 샘플을 하드웨어 검증으로 취급하지 않습니다.

공식 참고: [Blender glTF 내보내기](https://docs.blender.org/manual/en/4.4/addons/import_export/scene_gltf2.html), [Three.js GLTFLoader](https://threejs.org/docs/pages/GLTFLoader.html).


## 통합 서비스의 최종 자산 교체 순서

1. 홈 공간은 `src/worlds/my-room/config.ts`, 시뮬레이션은 새 world config/registry에 GLB 경로와 transform을 지정합니다.
2. `src/data/demo.ts`에서 모드의 `world`를 등록된 월드 ID로 바꿉니다. 공통 엔진과 Figma 화면 코드는 바꾸지 않습니다.
3. 원본 UI와 모델이 겹치지 않는 시작 위치/조명/카메라 방향을 PC와 Cardboard 모두 확인합니다. 충돌 AABB와 텔레포트 영역은 시각 모델과 별도 데이터입니다.
4. 아바타는 현재 서비스가 임시 CapsuleGeometry와 SphereGeometry를 소유합니다. 최종 GLB는 별도 avatar asset 모듈로 로드하고 프로필의 avatar ID와 매핑합니다. skeleton/animation/multiplayer 동기화는 아직 구현하지 않았습니다.
5. `npm run check`와 `npm run test:e2e` 후 실제 기기의 성능·외관을 확인합니다. 현재 GLB fixture 검증이 최종 Blender 모델/재질/애니메이션 호환성을 보장하지 않습니다.
