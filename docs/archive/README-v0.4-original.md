> **그래픽·낚시 업데이트:** 수면 셰이더와 조명·그림자, 30초~2분 무작위 포획, WASD/시점 선택 검사 최적화. [변경·검증 기록](docs/fish-species-update.md). 현재 프로젝트 위치는 `Downloads/공간 실험`입니다.

> **실내 낚시터 추가 (2026-11-08):** `npm run dev -- --port 5173` 실행 후 `http://127.0.0.1:5173/?fishing`에서 입장합니다. 기존 서비스의 혼자 활동해요에도 연결했습니다. [구현·조작·검증 기록](docs/indoor-fishing.md)을 확인하세요. 브라우저 스크린샷/헤드셋 검증은 아직 완료하지 못했습니다.

# XR Spatial Platform — 통합 서비스 MVP v0.4.0

Figma **9주차 정리(1144:282)**의 원본 13개 화면을 기존 Three.js 공간 엔진에 연결했습니다. 기본 주소 `/`에서 **데모 로그인 → 아바타/동네 → 마이룸 → 모드/서버 → 시뮬레이션 → 평가 → 소통 → 약속 생성**을 이용할 수 있습니다. 원본 UI는 코드 컴포넌트이며 이미지 53개와 Pretendard 폰트는 프로젝트 내부에 있습니다.

로그인·서버 인원·친구·채팅·초대·약속은 **브라우저 로컬 데모**입니다. 운영 인증, 실제 접속자, 실시간 메시지/음성, 외부 예약 기능은 연결하지 않았습니다. 선택과 평가·약속은 현재 브라우저 localStorage에 저장됩니다. 비밀번호는 저장하지 않습니다. 프로필에서 저장한 활동을 확인할 수 있습니다.

## 빠른 실행

```bash
cd xr-spatial-platform
npm ci                 # 이미 설치된 현재 폴더에서는 생략 가능
npm run dev
```

터미널 주소를 열고 **로그인**을 누릅니다. 이메일/비밀번호 없이 데모를 시작할 수 있습니다. 아바타 그림을 누르면 임시 아바타를 고를 수 있습니다. 다음 → 동네 선택 → 마이룸의 시뮬레이션 버튼 순서로 진행하세요. 시뮬레이션은 PC에서 공간 클릭 후 WASD/마우스로 조작하며 Esc로 UI 조작으로 돌아옵니다. 종료 후 두 별점 행과 개인별 평가를 선택하면 완료할 수 있습니다. 상단 달력 아이콘이 **작당모의**, 사람 아이콘이 **초대**, 종이 **초대함**, 메뉴가 **프로필**입니다.

기존 엔진 테스트 메뉴는 **`http://127.0.0.1:5173/?lab=1`**에서 그대로 제공합니다. 포트가 다르면 출력된 주소에 `?lab=1`을 붙이세요. A/B/GLB 테스트·속도·텔레포트 설정과 회귀 검사를 보존했습니다.

## 스마트폰 / VR 박스

스마트폰은 가로 화면으로 이용하세요. **VR 박스 모드 → 센서 허용 후 VR 시작**으로 좌우 눈에 실제 3D UI 평면을 렌더링합니다. 시선을 버튼에 1.2초 유지하면 선택합니다. 센서가 없으면 드래그 체험을 이용할 수 있습니다. 입력 필드는 VR에서 데모 대체 문구를 사용하고 실제 자유 입력은 박스 밖 또는 PC에서 합니다. PC Cardboard 종료는 Esc, VR 안에서는 패널 하단 **VR 종료**입니다.

휴대폰 센서에는 휴대폰이 신뢰하는 **HTTPS 주소**가 필요합니다. PC의 localhost URL을 휴대폰에 그대로 입력하면 PC에 연결되지 않습니다. [접속 절차와 실기기 체크리스트](docs/cardboard-testing.md)를 확인하세요. 단순 양안/방향 추적 프로토타입이며 렌즈 보정·최종 기기 성능을 검증한 제품은 아닙니다.

## 문서와 파일

- [Figma 원본 화면·노드 ID·신규 화면·디자인 토큰](docs/design-audit.md)
- [서비스/엔진 경계와 로컬 데이터 구조](docs/service-architecture.md)
- [실제 검사 결과와 수정 내역](docs/progress.md)
- [테스트 실행과 스크린샷](docs/testing.md)
- [Blender 연결](docs/blender-workflow.md), [새 월드 등록](docs/adding-worlds.md), [다음 단계](docs/next-steps.md)

```text
src/
  engine/                  기존 공통 3D·WebXR 엔진
  worlds/my-room/          서비스 홈 월드
  worlds/{test-world-a,test-world-b,glb-test-room}/
  experience/              서비스 조립, Cardboard, live UI texture
  ui/figma/                원본 13개 프레임 TSX/정적 CSS
  ui/ServiceScreens.ts     버튼/입력/신규 화면
  components/              원본 스타일의 공통 DOM 컴포넌트
  services/                로컬 저장소 (향후 서버 어댑터 경계)
  data/                    명시적 데모 데이터
  state/                   서비스 타입/검증/상태 전이
  routing/                 화면 라우트/접근 조건
public/assets/{figma,fonts,models}/
tests/design-reference/    원본 참조 PNG (앱에서 사용 안 함)
```

검사는 `npm run check`, 실제 Chromium 회귀는 `npm run test:e2e`, 원본 이미지 비교는 `npm run compare:figma`입니다. `test-results/screenshots/`에 PC/모바일/원본 대응 화면을 저장하고 `test-results/design-comparison/`에 원본-구현 나란히 보기/차이/수치를 저장합니다. 자동 검사는 실제 iPhone/Android 센서나 VR 헤드셋 검증을 대신하지 않습니다. 최종 검사: **단위 68개 / Chromium E2E 19개 통과**, 타입·린트·빌드·GLB 검증 통과. 실제 결과와 제한은 progress.md를 따릅니다.

---

아래는 보존된 공통 엔진 실험 UI(`?lab=1`)와 기존 기술 문서입니다.

아래 공통 엔진 설명은 **3단계(v0.3.0) 기술 기록**이며 현재 서비스 버전은 v0.4.0입니다. 기존 Geometry 월드 A/B와 실제 GLB 파일을 읽는 GLB Test Room을 제공합니다. 최종 Blender 모델 없이 개발할 수 있습니다. 실행용 의존성은 Three.js 하나이며, React·백엔드·Meta SDK는 사용하지 않습니다.

**3단계 검증 기록:** 단위 테스트 55개(기존 28개 유지), Chromium E2E 12개 통과, 포함 GLB의 Khronos Validator 오류·경고 0개. PC 스크린샷 5장을 저장했고 최신 GLB 선택 화면과 A 이미지를 직접 확인했습니다. Safari·최종 Blender 자산·VR 실기기는 별도 검증이 필요합니다.

## 실행하기

1. VS Code에서 **이 README가 있는 `xr-spatial-platform` 폴더**를 엽니다.
2. VS Code의 **터미널 → 새 터미널**을 선택합니다.
3. `node --version`으로 Node.js를 확인합니다. 이 프로젝트의 요구 버전은 **22.12 이상**입니다. 이번 개발 환경은 Node 26.13.0 / npm 11.20.0입니다.
4. 처음 설치하거나 다른 컴퓨터에서 열었다면 `npm ci`를 실행합니다. 현재 폴더에는 의존성을 설치해 두었습니다.
5. `npm run dev`를 실행합니다.
6. 터미널에 출력된 주소(기본 `http://127.0.0.1:5173/`)를 PC Chrome 또는 Edge에서 엽니다. 포트 사용 중이면 실제 출력된 주소를 사용합니다.
7. Test World A를 선택하고 **월드 진입** → **3D 화면 클릭** 순서로 진행합니다.
8. **WASD** 이동, **마우스** 시점 조절, **Esc** 마우스 잠금 해제. 속도는 UI 슬라이더로 변경합니다.
9. A의 민트색 큐브에 가까이 접근해 화면 중앙 `+`로 조준하면 안내가 나타납니다. 클릭하면 색상이 바뀝니다.
10. Esc로 UI를 조작할 수 있게 한 뒤 B 또는 **GLB Test Room**을 선택하고 다시 진입하여 전환합니다. GLB 공간은 실제 `public/assets/models/test-room/scene.glb`를 로딩합니다. **나가기**로 월드를 정리합니다. 로딩 도중 다른 월드를 선택하고 진입하면 최신 요청으로 전환합니다.
11. 종료할 때 터미널에서 `Ctrl+C`를 누릅니다.

`index.html`을 파일로 직접 열지 마세요. 개발 서버가 모듈과 자산 경로를 처리합니다. PC 탐색은 키보드·마우스용이며 모바일 터치 이동은 이번 범위에 포함하지 않습니다.

## 구현 범위

- 월드 config 등록, 비동기 진입/전환/퇴장, 로딩·오류 상태 및 재시도
- 새 월드 준비 성공 후 교체, 실패 시 이전 월드 유지, 최신 요청 우선 적용
- Geometry/Material/Texture 및 월드 객체 정리
- 서로 다른 바닥·벽·장애물·조명·시작 위치를 가진 테스트 월드 A/B
- Pointer Lock 마우스 시점, WASD, 대각선 속도 정규화, 속도 변경
- 평면 바닥 경계/박스 벽/장애물 충돌, 벽을 따라 미끄러지는 이동, 바닥 밖 이동 차단
- PC와 XR Ray의 공통 선택/액션, 선택 강조, 색상 변경/복원 및 선택 결과 UI
- 월드 설정으로 이름 있는 GLB 노드와 논리 액션 연결, 월드별 텔레포트 허용 영역
- 기본 VR 텔레포트·30도 스냅 턴, 선택식 연속 이동·회전과 표준 컨트롤러 상태
- 가상 발 위치와 tracking origin 분리, 머리 기준 회전 피벗·충돌 제한·추적 손실/경계 암전
- WebXR 지원 검사, 지원하지 않는 이유 표시, Three.js 공식 VRButton 연결
- XR 세션 이벤트, 플레이어 rig에 대한 헤드셋 시점 반영 및 종료 시 PC 카메라 복원
- 비동기 GLTFLoader 어댑터: 경로/위치/회전/크기, 다운로드 진행량, 오류와 취소 후 늦게 도착한 모델 정리

**현재 충돌은 평평한 바닥 + 축에 정렬된 박스(AABB)만 지원합니다.** 중력·점프·계단·경사면·임의 Blender 충돌 메시를 아직 구현하지 않았습니다. VR 스틱·스냅 턴·텔레포트·Ray 선택·머리 추적 보정과 간단한 VR 내부 안내를 코드로 구현했습니다. 실제 장치 동작과 편의성은 아직 미검증입니다. 기존의 무압축·텍스처 없는 glTF 2.0 GLB를 유지하며 유효성·실제 파싱·브라우저 상호작용 검증을 확장했습니다. 최종 Blender 자산과 모든 확장의 호환성을 검증한 것은 아닙니다.

## 구조

```text
xr-spatial-platform/
├── src/
│   ├── engine/
│   │   ├── core/          # Engine 조립, Signal 구독 API
│   │   ├── world/         # config 타입, 생성, 비동기 생명주기
│   │   ├── rendering/     # renderer, scene, resize
│   │   ├── player/        # 공통 이동, 플레이어 rig
│   │   ├── input/         # PC 입력 → 이동 의도
│   │   ├── collision/     # 교체 가능한 충돌 경계와 평면/AABB 구현
│   │   ├── interaction/   # PC 오브젝트 선택과 이벤트
│   │   ├── assets/        # GLTFLoader, 리소스 해제
│   │   └── xr/            # 지원 감지, 세션, 컨트롤러 조립, VR Ray/HUD
│   ├── worlds/
│   │   ├── test-world-a/config.ts
│   │   ├── test-world-b/config.ts
│   │   ├── glb-test-room/    # 실제 GLB config와 생성용 layout.json
│   │   └── registry.ts
│   ├── ui/               # 교체 가능한 DOM UI, 스타일
│   ├── config/           # 공통 기본값
│   ├── dev/              # DEV + e2e 모드 전용, 읽기 전용 진단/오류 월드
│   └── main.ts
├── public/assets/models/ # 향후 GLB 및 텍스처
├── tests/                # Vitest 단위 테스트 + e2e/ Chromium 브라우저 테스트
├── scripts/              # GLB 생성·검증, 프로덕션 분리 검사
├── playwright.config.ts
├── docs/                 # 설계, 월드 추가, 검증 기록, 다음 단계
├── AGENTS.md
├── package.json
├── package-lock.json
└── index.html
```

## 검사 명령

```bash
npm run typecheck
npm run lint
npm test
npm run build
npm run check
npm run validate:assets
npm run test:e2e:install
npm run test:e2e
```

`npm run check`는 lint → 단위 테스트 → GLB 유효성 검사 → 타입 검사와 빌드를 실행합니다. E2E는 별도 `npm run test:e2e`로 실행합니다. 첫 실행 전 `npm run test:e2e:install`로 Chromium을 설치하세요. 브라우저는 프로젝트의 `.playwright-browsers/`에 저장되며 Git/린트에서 제외됩니다.

E2E는 4173번 개발 서버와 4174번 프로덕션 미리보기 서버를 직접 실행·종료합니다. 해당 포트를 비워 두세요. 기존 5173번 개발 서버를 종료할 필요는 없습니다. macOS에서 Safari 화면이나 컴퓨터 제어 권한 없이 headless Chromium으로 실행합니다. 제한된 Codex 실행 환경에서는 로컬 포트/브라우저 프로세스 실행 권한이 필요할 수 있습니다.

결과물은 `test-results/screenshots/`, `test-results/browser-logs/`, `playwright-report/`에 저장됩니다. `npx playwright show-report`로 HTML 보고서를 볼 수 있습니다. 오류 월드와 `window.__XR_DEBUG__`는 **DEV + e2e 모드에서만** 사용하며 일반 개발/프로덕션에는 노출하지 않습니다. 빌드와 프로덕션 브라우저 테스트에서도 분리를 검사합니다.

테스트용 GLB 재생성은 `npm run generate:assets`, 유효성 재검사는 `npm run validate:assets`입니다. 최종 Blender 파일은 별도 폴더에 저장해 생성용 fixture를 덮어쓰지 마세요. `npm run preview`는 빌드된 `dist`를 확인할 때 사용합니다. 상세 결과는 [진행 및 검증 기록](docs/progress.md)에 있습니다. **Chromium 소프트웨어 WebGL 테스트는 실제 GPU 성능 또는 VR 실기기 검증을 대신하지 않습니다.**

## WebXR 기기 검증

PC에서 WebXR이 없어도 일반 3D 모드로 개발합니다. VR에는 호환 헤드셋/브라우저와 보안 연결이 필요합니다. 헤드셋에서 PC의 `http://192.168…` 주소를 여는 것만으로 WebXR을 사용할 수는 없습니다. 신뢰할 수 있는 HTTPS 테스트 호스팅을 준비하거나 기기용 localhost 연결 환경을 별도로 설정해야 합니다. 헤드셋에서 `127.0.0.1`은 헤드셋 자신을 가리킵니다.

실기기 순서는 [VR 체크리스트](docs/vr-device-checklist.md)를 따릅니다. `local-floor` 기준 높이, 양안 렌더링, 컨트롤러 매핑, 물리적 머리 이동과 충돌 보정, 세션 종료/재진입은 아직 장치로 검증하지 않았습니다. 자동 테스트의 합성 XR 포즈/입력 성공을 장치 검증으로 취급하지 않습니다.

VR 진입 전 이동/회전 메뉴를 선택합니다. 기본은 **텔레포트 + 스냅 턴**입니다.

- 왼쪽 스틱 앞으로 유지하고 바닥을 가리킨 뒤 놓기: 유효 목적지로 텔레포트
- 스퀴즈 유지 후 놓기: 연속 이동 설정에서도 텔레포트 가능
- 오른쪽 스틱 좌우: 기본 30도 스냅 턴, 중립 후 다시 입력
- 트리거의 표준 select: 가까운 물체 강조/선택, 색 변경과 안내
- 연속 이동을 선택하면 왼쪽 스틱이 머리 방향 기준으로 이동합니다. 연속 회전은 별도 설정입니다.
- 연결/포커스 복귀 때 스틱을 중립에 둔 뒤 조작합니다. 알 수 없는 매핑은 Ray만 사용하고 스틱을 추측하지 않습니다.

가상 몸은 평면/AABB 경계에 제한하며 실제 머리 이동이 막힐 때 rig 보정과 암전을 적용합니다. 물리적인 몸을 제지하는 기능은 아니며 편의성과 추적 안정성은 실기기 검증이 필요합니다.

## 이어서 개발하기

- [구현 수준 점검](docs/implementation-status.md)
- [엔진 구조와 확장 경계](docs/architecture.md)
- [Blender PC·VR 연결 규격](docs/blender-workflow.md)
- [VR 실기기 체크리스트](docs/vr-device-checklist.md)
- [새 월드와 Blender 모델 연결](docs/adding-worlds.md)
- [테스트 절차](docs/testing.md)
- [진행 기록과 알려진 제한](docs/progress.md)
- [다음 개발 단계](docs/next-steps.md)

공식 참고: [Three.js VRButton](https://threejs.org/docs/pages/VRButton.html), [WebXRManager](https://threejs.org/docs/pages/WebXRManager.html), [GLTFLoader](https://threejs.org/docs/pages/GLTFLoader.html), [Vite 가이드](https://vite.dev/guide/).
