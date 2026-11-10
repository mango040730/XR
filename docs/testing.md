# 개발·브라우저·VR 테스트

## 통합 서비스 검사 (v0.4.0)

기본 `/`는 Figma 서비스, `/?lab=1`는 기존 엔진 실험 UI입니다. 기존 테스트 12개는 lab 경로로 이동했으며 검사 의미/실제 입력·로딩·충돌을 보존합니다. 새 service.spec.ts는 다음을 검사합니다.

- PC 및 모바일 Chromium touch/viewport 에뮬레이션: 데모 로그인 → 아바타 선택 → 동네 → 마이룸 → 협력 모드 → 실제 GLB → 일시정지/계속 → 평가 → 홈 → 로컬 채팅 → 초대 → 참여자 선택 → 날짜/시간/장소 → 약속 생성 → 새로고침과 로컬 보존.
- 실제 페이지 오류/requestfailed 수집, 최종 저장 데이터와 실제 활성 월드 ID 확인.
- 만원 서버 오류·이전 화면 복구·초대 거절.
- 센서가 없는 실제 Chromium에서 Cardboard 양안 render, 실제 pointer drag → 카메라 회전 → Ray/1.2초 dwell로 로그인. XR/센서 성공 응답을 위조하지 않음.
- Cardboard 전체 서비스: 실제 drag/Ray/dwell만으로 로그인→월드 입장→이동→평가→채팅→약속 생성→VR 종료. DOM click으로 선택을 대체하지 않음. 브라우저 드래그 체험이며 실제 센서 테스트 아님.
- 1200×600에서 원본 13개 프레임의 코드 컴포넌트/로컬 이미지 디코딩/폰트 로딩 후 스크린샷.
- production 빌드의 서비스 온보딩과 개발 진단 제거.

```bash
npm run typecheck
npm run lint
npm test
npm run build
npm run test:e2e
npm run compare:figma
```

새 `service-*.png`, `figma-{노드번호}.png`도 `test-results/screenshots/`에 저장됩니다. 비교 이미지는 `test-results/design-comparison/`, 원본은 `tests/design-reference/`입니다. 이미지를 생성한 사실과 직접 관찰한 범위·차이는 progress.md에 기록합니다. 이 검사는 렌즈별 광학 보정이나 실제 iPhone Safari/Android Chrome 센서를 확인하지 않습니다. [모바일 실기기 절차](cardboard-testing.md)를 별도로 수행하세요.

이하 이전 엔진 검사 절차는 lab 경로에 적용합니다.

최신 실제 결과는 `docs/progress.md`에 기록합니다. 단위 검사, 실제 Chromium, 이미지 확인, VR 기기 검증을 구분합니다.

## 1. 설치와 실행

VS Code에서 프로젝트 폴더를 연 터미널에서 실행합니다.

```bash
npm ci
npm run test:e2e:install
npm run typecheck
npm run lint
npm test
npm run validate:assets
npm run build
npm run test:e2e
```

현재 작업 폴더에는 npm 의존성과 Chromium을 설치했습니다. 다른 컴퓨터에서는 처음 두 명령이 필요합니다. Playwright 1.65.0의 공식 Chromium을 사용하고 `.playwright-browsers/`에 저장합니다. macOS용 npm 명령은 PLAYWRIGHT_BROWSERS_PATH를 설정합니다.

`npm run check`는 lint, 단위 테스트, GLB Validator, 타입 검사/빌드를 묶습니다. E2E는 별도 명령입니다. `test:e2e`가 4173번 개발 서버와 4174번 production preview를 실행하고 HTTP 응답을 확인한 후 Chromium을 엽니다. 테스트 종료 시 자신이 실행한 서버를 정리합니다. 이미 실행 중인 일반 개발 서버(5173)는 건드리지 않습니다. 4173/4174에 다른 서버가 있으면 임의로 재사용하지 않고 실패합니다.

현재 설정은 `channel:'chromium'`의 새 headless 모드와 SwiftShader 소프트웨어 WebGL입니다. 실제 WebGL2 context·scene·render loop를 실행하며 가짜 renderer를 쓰지 않습니다. 다만 물리 GPU 성능 측정은 아닙니다. Headless Shell은 이번 macOS 환경에서 ICU 자원 경로 오류로 GPU 프로세스가 종료되어 사용하지 않습니다.

## 2. 자동 검사 범위

| 검사 | 실제 검사 내용 | 한계 |
| --- | --- | --- |
| TypeScript/ESLint | 타입·모듈·코드 규칙 | 브라우저 지원을 증명하지 않음 |
| Vitest | 기존 28개 + XR 입력·좌표·텔레포트·합성 세션/포즈·공통 상호작용 | 입력 DOM과 GPU는 Chromium에서 검사 |
| Khronos Validator | 포함 GLB의 glTF 2.0 구조와 버퍼 유효성 | 최종 Blender 자산의 외관·성능은 별도 |
| Vite build | production 번들·개발 진단 제거 검사 | VR 하드웨어를 검사하지 않음 |
| Chromium E2E | 실제 canvas, UI, 입력, GLTFLoader, 실패 복구, 자원 관리 | Safari/실제 GPU/VR 기기와 동일하지 않음 |

현재 단위 검사 55개, Chromium E2E 12개 구성이며 최신 실제 결과는 progress.md에서 확인합니다.

E2E는 다음을 검사합니다.

- 루트 HTTP 200, 실제 WebGL2 context 생성, context 손실 여부
- 헤드셋 없는 Chromium에서 immersive VR 미지원 감지, 이유와 비활성 버튼, PC 모드 유지
- A/B 진입·전환·퇴장·재진입과 각 spawn, 이전 root 제거
- 실제 Pointer Lock 획득 후 키보드 W/A/S/D에 따른 플레이어 위치 변화
- 마우스 이동에 따른 실제 yaw 변화, Escape로 실제 잠금 해제
- A 큐브를 향해 계속 이동할 때 충돌 경계 유지, 선택 강조·실제 클릭 색상 변경과 선택 결과 UI
- teleport/snap 기본값, smooth 선택과 월드 변경 후 설정 초기화
- 실제 GLB의 이름 있는 Pedestal 노드에 접근하고 마우스로 조준해 선택/색 변경/메시지 및 전환 후 UI 해제
- 프로젝트 GLB의 실제 HTTP bytes·GLB magic/version, 실제 GLTFLoader decode
- 모델 위치/회전/크기와 월드 bounds, 8개 mesh
- GLB/A 5회 왕복 교체 후 모델 1개/root 1개, 새 UUID, 실제 dispose 이벤트 증가와 renderer geometry counter 안정성
- 퇴장 후 world root와 renderer geometry counter가 0으로 돌아오는지
- 실제 누락 URL의 404, 이전 월드/플레이어 위치 유지, 정상 월드로 복구
- 잘못된 binary 응답의 로딩 실패 후 실제 정상 GLB 재진입
- 실제 파일 응답을 지연한 동안 UI로 다른 월드 진입/취소, 늦은 응답이 현재 공간을 덮어쓰지 않는지
- 실제 production 빌드에서도 GLB 로딩, 오류 fixture/개발 진단 전역이 없는지

잘못된 binary 검사는 Playwright route가 명시적으로 잘못된 bytes를 반환하는 음성 테스트입니다. 전환/취소 검사는 실제 파일 요청을 잠시 지연했다가 원래 서버로 통과시킵니다. 정상 로딩·이동·충돌·WebXR 지원 여부는 성공으로 위조하지 않습니다. 자연스러운 미지원 환경을 사용하며 API 부재/정책 거절 분기는 기존 단위 테스트가 모의 응답으로 검사합니다.

`src/dev/engineDiagnostics.ts`의 `window.__XR_DEBUG__.snapshot()`은 위치·상태·모델·renderer counter·dispose 이벤트를 **읽기만** 합니다. 위치 강제 설정, 로딩 성공 처리, 가짜 XR 기능은 없습니다. `DEV && MODE === 'e2e'`일 때만 동적으로 불러오며 일반 개발/프로덕션에는 전역을 만들지 않습니다.

## 3. 로그와 스크린샷

```text
test-results/
├── screenshots/
│   ├── test-world-a.png
│   ├── test-world-b.png
│   ├── glb-test-room.png
│   ├── model-loading-error.png
│   └── glb-interaction.png
├── browser-logs/          # 테스트별 console/pageerror/network/최종 snapshot/renderer
├── e2e-results.json       # Playwright 최종 결과
├── gltf-validation.json   # Khronos Validator 보고서
└── playwright/            # 실패 시 스크린샷·trace 등
playwright-report/         # HTML 보고서
```

```bash
npx playwright show-report
```

모든 JavaScript pageerror, console error, 실패 요청, HTTP 4xx/5xx를 수집합니다. 예상하지 않은 오류는 테스트 실패입니다. 누락 모델 테스트의 **해당 경로 404**만 명시적으로 허용하며, 이때도 UI 오류와 기존 공간 보존/회복을 검사합니다. WebGL 성능 경고(ReadPixels 등)는 숨기지 않고 로그에 남깁니다.

스크린샷은 픽셀 이미지를 저장하는 검사이며 기준 이미지와 자동 비교하는 visual regression은 아직 없습니다. 생성되었다는 사실과 실제 사람이/에이전트가 이미지를 보고 확인했다는 사실은 별도로 기록합니다. renderer.info.memory는 Three.js 관리 수치이고 실제 GPU 바이트나 브라우저 전체 메모리가 아닙니다. 내부 renderer 텍스처가 남을 수 있으며 자원이 전부 0이라고 주장하지 않습니다.

## 4. 권한/환경 문제

- `listen EPERM` 또는 브라우저 프로세스 실행 거절: 제한된 Codex 샌드박스의 로컬 서버·브라우저 실행 권한을 확인합니다. 일반 VS Code 터미널에서는 위 명령을 그대로 실행할 수 있습니다.
- `Executable doesn't exist`: `npm run test:e2e:install`로 프로젝트 Chromium을 설치합니다.
- `icudtl.dat not found in bundle`/GPU 프로세스 종료: 설정이 `channel:'chromium'`인지 확인합니다. 이번 환경에서는 기본 Headless Shell이 실패하고 정식 Chromium headless가 실행되었습니다. 바이너리 파일을 임의로 패치하지 않았습니다.
- `EADDRINUSE`/서버 이미 실행 중: 4173/4174를 점유한 본인의 테스트 서버를 확인합니다. 다른 작업의 프로세스를 임의 종료하지 않습니다.
- 포인터 잠금 실패: 실패 보고서의 UI/콘솔 로그를 확인합니다. 테스트에서 잠금 상태를 위조하지 않습니다.

실행할 수 없으면 명령·오류·수행된 범위만 기록합니다. 실패를 skip/성공 처리하지 않습니다.

## 5. PC에서 직접 확인할 사항

1. `npm run dev` 후 실제 출력 주소를 사용자의 PC 브라우저로 엽니다.
2. A/B/GLB 공간의 바닥·벽·기둥·조명과 크기를 확인합니다.
3. 화면 클릭 직후 WASD를 누르고 마우스로 둘러봅니다. Esc로 해제 후 속도 슬라이더/월드 메뉴를 조작합니다.
4. 벽/큐브 충돌, 가까운 큐브 클릭, 탭/앱 전환 후 키 고정 여부를 확인합니다.
5. 화면 크기와 브라우저를 바꿔 UI/렌더링을 확인합니다. Safari에서 실제 동작은 별도 확인이 필요합니다.
6. 최종 Blender GLB를 추가하면 재질·텍스처·단위·방향·spawn·충돌 프록시·메모리·로딩 시간을 새로 검사합니다.

## 6. VR 실기기 필수 검사

1. 신뢰 가능한 HTTPS 주소를 기기 브라우저로 엽니다. PC의 LAN HTTP 주소는 보안 연결 요구를 충족하지 않습니다. 헤드셋의 localhost는 PC가 아닙니다.
2. 월드 진입 후 공식 ENTER VR을 누르고 세션 권한을 확인합니다.
3. 좌우 눈 렌더링·머리 회전/위치 추적·시작 방향·1m 스케일·local-floor 눈높이를 확인합니다. PC 눈높이가 실제 머리 높이에 중복 가산되면 안 됩니다.
4. 권한 거절, 기기 메뉴 종료, 재진입을 검사합니다. 종료 후 PC 눈높이·화면 비율·WASD·마우스가 복구되어야 합니다.
5. A/B/GLB 공간에서 반복하고 실제 프레임률·발열·멀미·기기 모델/OS/브라우저 버전을 기록합니다.

컨트롤러 이동/레이 선택·간단한 VR 내부 안내·가상 몸 충돌 보정은 코드로 구현했습니다. 합성 XRInputSource/Gamepad/XRFrame/포즈를 사용하는 단위 테스트로 입력 해제·선택·텔레포트·추적 손실·좌표 복귀를 검사하지만 물리 기기 검사는 아닙니다. 자동 Chromium은 실제 VR 세션·헤드셋 추적·컨트롤러 동작을 완전히 검증하지 못합니다. [VR 실기기 체크리스트](vr-device-checklist.md)의 모든 항목은 아직 미수행입니다.

## XR 단위 테스트 구분

`xr-locomotion.test.ts`는 합성 축 데이터와 Three.js 수학으로 deadzone·중립 재무장·단발 snap·설정식 smooth·텔레포트 release/disconnect 취소·발/원점/머리 피벗·같은 충돌·리센터/PC 복귀·목적지/몸체 경로·동적 머리 높이를 검사합니다. `xr-runtime.test.ts`는 합성 EventTarget 세션과 XRFrame 포즈, 시각 출력 sink를 사용해 native select 소비·hidden 입력 차단·실제 공통 액션·텔레포트 확정·추적 손실을 연결 검사합니다. 이것들은 WebXR 브라우저 드라이버나 실제 하드웨어 성공 결과가 아닙니다.
