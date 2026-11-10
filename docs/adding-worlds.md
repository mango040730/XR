# Blender 공간과 새 월드 연결하기

최종 디자인이 없어도 현재 A/B와 GLB Test Room으로 엔진을 개발할 수 있습니다. 새 공간을 연결할 때 수정할 곳은 **GLB 파일, 월드 config, registry**입니다. 공통 엔진에 월드 ID별 코드를 추가하지 않습니다.

## 현재 GLB 테스트 자산

- 실제 파일: `public/assets/models/test-room/scene.glb` (2,880바이트, glTF 2.0)
- 생성 원본: `src/worlds/glb-test-room/layout.json`
- 생성 명령: `npm run generate:assets`
- 검증 명령: `npm run validate:assets`
- 설정: `src/worlds/glb-test-room/config.ts`

단위 큐브의 position/normal/index 버퍼와 PBR 재질로 방·벽·기둥·받침대 8개를 담았습니다. 외부 파일·텍스처·압축 확장은 없습니다. config에서 위치 `[2,0,-1]`, Y 회전 90도, 크기 `[1.2,1,1.2]`를 적용합니다. 이 fixture의 충돌 박스는 같은 layout에서 계산하지만 **임의 Blender 모델의 충돌을 자동 생성하지는 않습니다.** 최종 GLB는 `test-room`과 다른 폴더에 저장하세요. 생성 명령이 fixture 파일을 다시 씁니다.

## 3단계 상호작용/텔레포트 설정

`WorldConfig.interactions`에 `{ nodeName, id, label, maxDistance? }`를 지정하면 이름 있는 GLB 노드/하위 메시를 PC/XR 공통 액션에 연결합니다. 이름은 고유해야 하며 누락/중복이면 로딩 실패로 처리해 이전 공간을 유지합니다. 현재 액션은 색 변경/복원과 안내이며 문 애니메이션은 별도 콘텐츠입니다.

`teleport: { areas: [{ minX, maxX, minZ, maxZ, y }], maxDistance: 8 }`로 월드 좌표의 착지 영역을 지정합니다. `xr: { movement: 'teleport', turn: 'snap' }`이 기본이며 smooth 옵션도 설정할 수 있습니다. 머리 기준 회전/이동은 공통 엔진이 처리합니다. 완성 예제와 내보내기 규격은 [blender-workflow.md](blender-workflow.md), 장치 검사는 [vr-device-checklist.md](vr-device-checklist.md)를 확인하세요.

## 1. Blender에서 내보낼 모델 준비

1. 원본 `.blend`를 별도로 저장합니다. 최종 디자인 전에는 작은 방 하나로 시작해도 됩니다.
2. Scene Properties의 Units에서 Metric을 사용하고 실제 1m 크기를 확인합니다. 처음에는 바닥 중심을 원점 주변에 놓고 **바닥 윗면의 Blender Z를 0**으로 맞춥니다.
3. Object Mode에서 내보낼 객체를 선택합니다. 의도한 크기를 확인한 뒤 필요하면 `Ctrl+A → Scale`로 스케일을 적용합니다. 애니메이션/리깅은 현재 범위에 포함하지 않습니다.
4. 외부에서 보이는 면의 법선 방향과 재질을 확인합니다. 처음에는 Principled BSDF의 기본 색상/거칠기 중심으로 단순하게 만드세요. Blender의 모든 셰이더 노드가 웹으로 그대로 옮겨지는 것은 아닙니다.
5. `File → Export → glTF 2.0 (.glb/.gltf)`를 선택합니다. Format은 **glTF Binary (.glb)**로 지정합니다.
6. 필요한 공간 객체만 내보내고, 원치 않는 카메라·조명은 제외합니다. 모디파이어를 사용했다면 Apply Modifiers 옵션과 내보낸 결과를 확인합니다. glTF의 **+Y Up** 변환을 사용합니다. 별도로 모델 전체를 -90도 회전하지 않습니다.
7. 첫 연결에서는 Draco/Meshopt/KTX2 같은 압축 확장을 사용하지 않습니다. 현재 엔진에 해당 디코더를 등록하지 않았습니다.
8. 파일 이름을 `scene.glb`로 저장합니다. GLB가 텍스처를 내부에 포함했는지도 확인합니다.

Blender는 Z-up, 이 웹 엔진과 glTF는 Y-up입니다. 기본 내보내기 변환에서 Blender 위치 `(x,y,z)`는 glTF `(x,z,-y)`가 됩니다. 웹 설정의 회전 단위는 라디안이고 카메라는 기본적으로 -Z를 바라봅니다. 내보낸 모델의 크기·정면 방향은 실제 브라우저에서 다시 확인하세요.

공식 참고: [Blender glTF 내보내기 설명](https://docs.blender.org/manual/en/4.4/addons/import_export/scene_gltf2.html). Blender 버전에 따라 옵션의 배치는 다를 수 있습니다.

## 2. 프로젝트에 파일 복사

VS Code에서 `xr-spatial-platform` 폴더를 연 뒤 터미널에서 실행합니다.

```bash
mkdir -p public/assets/models/new-world
mkdir -p src/worlds/new-world
```

Finder 또는 VS Code를 이용해 내보낸 GLB를 아래 위치에 복사합니다.

```text
public/assets/models/new-world/scene.glb
```

URL에는 `public`을 쓰지 않습니다. 배포 하위 경로를 지원하도록 config에서 `import.meta.env.BASE_URL`을 사용합니다. `.gltf` 형식을 사용하면 `.bin`과 외부 텍스처도 상대 경로를 유지해 복사해야 합니다. 처음에는 단일 GLB 파일이 관리하기 쉽습니다.

복사한 파일의 유효성을 검사할 수 있습니다.

```bash
npm run validate:assets -- public/assets/models/new-world/scene.glb
```

결과는 `test-results/gltf-validation.json`에 저장됩니다. 이 명령은 자체 포함 GLB용이며 외부 리소스가 있는 자산의 검증 설정은 별도 조정이 필요합니다. 형식 유효성 통과는 화면 품질·성능·충돌 정확도까지 보장하지 않습니다. 인자 없는 검사는 포함된 테스트 방을 검증합니다.

## 3. 월드 config 작성

`src/worlds/new-world/config.ts`를 만들고 다음을 넣습니다. 아래 값은 **중심이 원점이고 폭 10m, 깊이 12m, 벽 높이 3m인 방**을 위한 예시입니다. 실제 모델에 맞게 바닥·벽·시작 위치를 바꿔야 합니다.

```ts
import { DEFAULT_PLAYER } from '../../config/defaults';
import type { WorldConfig } from '../../engine/world/types';

export const newWorld: WorldConfig = {
  id: 'new-world',
  name: '나의 Blender 공간',
  description: '최종 모델 연결 테스트',
  model: {
    url: `${import.meta.env.BASE_URL}assets/models/new-world/scene.glb`,
    position: [0, 0, 0],
    rotation: [0, 0, 0],
    scale: [1, 1, 1],
  },
  spawn: { position: [0, 0, 4], yaw: 0 },
  player: { ...DEFAULT_PLAYER },
  lighting: {
    sky: '#d6f3ff', ground: '#415163',
    intensity: 2, sun: 2.5, background: '#172b3a',
  },
  floors: [
    { center: [0, 0], size: [10, 12], y: 0, color: '#334e5c', visible: false },
  ],
  boxes: [
    { position: [0, 1.5, -6], size: [10, 3, 0.3], color: '#637f8c', visible: false },
    { position: [0, 1.5, 6], size: [10, 3, 0.3], color: '#637f8c', visible: false },
    { position: [-5, 1.5, 0], size: [0.3, 3, 12], color: '#637f8c', visible: false },
    { position: [5, 1.5, 0], size: [0.3, 3, 12], color: '#637f8c', visible: false },
  ],
};
```

- `id`는 중복되지 않는 고유 문자열입니다.
- `spawn.position`은 눈이 아니라 **플레이어 발 위치**입니다. 눈높이는 player.eyeHeight가 더합니다. 바닥 위이고 벽/장애물 밖이어야 합니다.
- floors의 center는 `[x,z]`, size는 `[폭,깊이]`, y는 바닥 윗면 높이입니다.
- boxes는 월드 좌표의 `[x,y,z]` 중심과 `[폭,높이,깊이]` 크기입니다. `solid: false`를 지정하지 않으면 충돌합니다.
- `visible: false`는 **충돌은 유지하면서 테스트 Geometry를 그리지 않는 설정**입니다. GLB의 바닥/벽과 중복 렌더링하지 않도록 사용합니다. 생략하면 기존 A/B처럼 기본 Geometry를 그립니다. 충돌 프록시 디버깅 시 true로 바꿔 비교할 수 있습니다.
- 모델의 위치·회전·크기를 바꾸면 충돌 프록시와 spawn도 같은 월드 좌표에 맞춰야 합니다. config의 임의 박스가 모델 변환을 자동으로 따라가지는 않습니다.

현재 바닥은 평평하고 같은 높이에서만 이동합니다. 박스 충돌은 AABB이며 회전된 벽·계단·경사면을 정확하게 표현하지 못합니다. 모델을 지정하는 것만으로 충돌이 생기지는 않습니다.

## 4. registry에 등록

`src/worlds/registry.ts`에 import를 추가합니다.

```ts
import { newWorld } from './new-world/config';
```

기존 목록을 유지하며 끝에 추가합니다.

```ts
export const worlds: readonly WorldConfig[] = [
  testWorldA, testWorldB, glbTestRoom, newWorld,
];
```

공통 WorldManager/ModelLoader/PlayerController는 수정하지 않습니다. 중복 ID는 등록 시 오류가 나며 등록되지 않은 ID 진입은 오류 상태로 처리합니다. 일반 UI에는 registry의 정상 월드만 나타납니다. E2E 오류 월드는 `src/dev/e2eWorlds.ts`에 따로 있으며 프로덕션에 들어가지 않습니다.

## 5. 실행·교체·회귀 검사

```bash
npm run typecheck
npm run lint
npm test
npm run build
npm run dev
```

1. 브라우저에서 새 이름을 선택하고 진입합니다.
2. 다운로드·디코딩이 끝나 준비 완료가 되는지 확인합니다. 전체 크기가 없으면 KB만 표시하며, 다운로드 퍼센트는 전체 디코딩 진행률을 뜻하지 않습니다.
3. 크기, 방향, 시작 발 위치, 조명, 바닥/벽/장애물 충돌을 확인합니다.
4. A/B로 전환했다가 다시 진입하고, 나가기/재진입을 반복합니다.
5. GLB를 새 파일로 교체했다면 저장 후 페이지를 새로고침하고 다시 진입합니다. model URL을 바꾸는 방법도 가능합니다. 새 월드가 성공해야 기존 자원이 정리·교체되며 실패 시 기존 월드가 유지됩니다.
6. 자동 브라우저 회귀 검사는 `npm run test:e2e`입니다. 처음 실행 전 `npm run test:e2e:install`을 실행합니다.

현재 프로덕션 E2E는 정상 월드 3개를 기대합니다. 새 월드를 정식 등록했다면 `tests/e2e/production.spec.ts`의 목록 개수 기대값과 새 월드 검사를 갱신하세요. 엔진 수정은 필요 없습니다.

## 문제 해결

- **모델 로딩 실패/404**: 실제 파일 이름·대소문자·확장자·폴더를 확인합니다. GLB 요청은 HTML SPA fallback을 받지 않도록 모델 MIME Accept 헤더를 사용합니다.
- **파일은 있지만 파싱 실패**: `.blend` 파일의 확장자만 GLB로 바꾼 것이 아닌지 확인하고 glTF Binary로 다시 내보냅니다. 압축 확장과 버전도 확인합니다. 원본 예외는 Error.cause에 보존합니다.
- **바닥이 깜빡임**: GLB 바닥과 기본 floor Geometry가 겹치는지 확인하고 해당 floor를 visible:false로 바꿉니다.
- **공간이 비었거나 너무 큼/작음**: 모델 원점·단위·변환과 spawn 위치를 확인합니다.
- **벽을 통과하거나 보이지 않는 벽에 막힘**: 시각 모델과 충돌 프록시가 다릅니다. boxes를 실제 월드 좌표에 맞추세요.
- **시작 위치 오류**: 발 y가 floors.y와 같은지, 몸체가 바닥 안에 들어오는지, 박스와 겹치는지 확인합니다.
- **외부 모델 URL 실패**: 서버 CORS가 필요합니다. 첫 연결에서는 public 아래 자산을 사용하세요.

별도 `collision.glb`·triangle-mesh 충돌, 애니메이션, 텍스처 압축, 최종 모델별 최적화는 아직 구현하지 않았습니다. 로딩 취소는 최신 요청 적용을 막고 늦은 자원을 정리하지만 모든 내부 네트워크 요청을 즉시 중단하는 기능은 아닙니다.

## 통합 서비스의 모드와 연결

`/?lab=1`는 기존 registry의 테스트 월드를 표시합니다. 기본 서비스는 `experience/ServiceExperience.ts`에서 `myRoom` 홈 config를 추가 등록합니다. 새로운 시뮬레이션은 위 절차대로 config와 registry에 등록한 뒤 **`src/data/demo.ts`의 해당 mode.world를 새 월드 ID로 지정**합니다. 파일명만 바꾸고 ID를 등록하지 않으면 등록되지 않은 월드 오류가 납니다. 서버 목록은 로컬 데모이며 월드 설정과 실시간 서버 연결을 혼동하지 마세요.

홈 디자인이 완성되면 `src/worlds/my-room/config.ts`에 모델 경로/위치/크기를 연결하고 임시 boxes를 정리합니다. 실제 충돌과 텔레포트 영역은 새 공간에 맞게 따로 작성하세요. UI 원본 프레임을 고치기 위해 엔진을 수정할 필요는 없습니다.
