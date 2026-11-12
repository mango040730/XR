# 실시간 소셜 VR 구현 및 실행

## 공개 사이트 연결 상태 — 2026-11-12 확인

공개 서버 배포용 `render.yaml`을 추가했습니다. Node 22·싱가포르 리전·Free 단일 인스턴스에서 기존 Socket.IO 서버만 실행합니다. 빌드는 `npm ci --include=dev && npm run server:build`, 시작은 `node server-dist/server/index.js`, 상태 확인은 `/health`입니다. `HOST=0.0.0.0`과 Pages Origin을 명시하며 프론트 자산은 계속 GitHub Pages에서 제공합니다. 서버 이름은 실제 배포 시 충돌에 따라 바뀔 수 있으므로 `onrender.com` 주소를 추측해서 프론트에 넣지 않습니다.

Render 계정을 연결하면 이 저장소의 Blueprint를 배포할 수 있습니다. 연결 대신 대시보드에서 진행하는 경우 [이 저장소 서버 생성](https://render.com/deploy?repo=https%3A%2F%2Fgithub.com%2Fmango040730%2FXR)에서 설정을 검토할 수 있습니다. 실제 서비스 생성과 배포 성공 전에는 서버가 실행 중이라고 간주하지 않습니다. Free 서버는15분 유휴 후 중지되고 다시 연결할 때 약1분의 시작 시간이 생길 수 있습니다. 유료 업그레이드는 하지 않습니다. [Render 공식 Free 제한](https://render.com/docs/free).

실제 HTTPS 주소가 확정되면 다음 명령으로 Pages Origin의 WebSocket 허용·두 실제 사용자 참여/목록 공유·검사 사용자 정리를 확인합니다.

```sh
npm run verify:social -- https://실제-서버-주소
```

이 검사가 통과한 주소를 저장소 Actions 변수 `SOCIAL_SERVER_URL`에 저장하고 Pages workflow를 실행합니다. workflow도 해당 변수가 설정된 경우 실제 연결 검사를 수행한 뒤 빌드합니다. Render의 유휴 시작을 고려해 CLI 연결 검사는90초 제한을 사용합니다. `/health`만 응답하는 잘못된 서버나 Origin을 허용하지 않는 서버는 검사를 통과하지 못합니다. 실제 프론트 두 브라우저에서 같은 월드/room으로 참여하고 아바타가 보이는지 최종 확인해야 합니다. 계정 연결/서비스 생성 전에는 이 단계가 완료된 것이 아닙니다.

현재 `https://mango040730.github.io/XR/`에는 공개 Socket.IO 서버가 연결되어 있지 않습니다. GitHub 저장소 Actions 변수 목록이 비어 있어 배포 workflow의 `vars.SOCIAL_SERVER_URL`도 설정되지 않았습니다. Pages 빌드에서 `VITE_STATIC_HOST=github-pages`이고 서버 주소가 없으면 `SocialClient.available`이 false가 되어 참여 패널을 숨기고 네트워크 연결을 시작하지 않습니다. 실제 독립 Chromium 두 개에서 같은 `room=public` 주소를 열었을 때 모두 미접속 상태이며 Socket.IO 요청과 WebSocket 연결이 0개임을 확인했습니다. 따라서 같은 공개 주소를 동시에 열어도 서로의 아바타는 나타나지 않습니다. 이는 현재 공개 배포 구성의 제한입니다.

공개 멀티플레이를 사용하려면 기존 `server/index.ts`를 실행하는 외부 Node 호스트와 HTTPS 주소를 준비하고, 서버의 `ALLOWED_ORIGINS`에 `https://mango040730.github.io`를 넣어야 합니다. 이 주소에는 `/XR/` 경로를 넣지 않습니다. 저장소 Actions 변수 `SOCIAL_SERVER_URL`을 해당 서버의 HTTPS 주소로 설정한 뒤 Pages를 다시 빌드해야 합니다. 저장소 URL은 실행 중인 Socket.IO 서버 주소로 사용할 수 없습니다. 이번 점검에서는 새 호스팅 서비스나 계정을 생성하지 않았습니다.

서버가 연결된 환경에서도 페이지를 여는 것만으로 방에 자동 등록되지 않습니다. 현재 Figma UI에서는 **상단 알림(종) 아이콘 → 닉네임 입력 → 입장**으로 참여합니다. 사람 아이콘은 약속잡기용입니다. 두 사용자의 월드와 `room` 값이 모두 같아야 상대 아바타가 표시되며, 첫 사람의 1인칭 화면에 자기 아바타가 보이지 않는 것은 의도한 동작입니다. 로컬 두 브라우저 검증과 공개 서버 검증은 구분합니다. [공개 브라우저 검사](screenshots/social-diagnosis-20261112/public-verification.json).

## 기존 구조와 변경 범위

기존 기술은 Three.js 0.187.0, TypeScript 6.0.3, Vite 8.3.6과 DOM/TSX 컴포넌트입니다. 렌더링은 Engine의 단일 animation loop와 Renderer/Scene을 유지합니다. PlayerController의 공통 이동, MovementCollision의 AABB 충돌, WorldManager의 최신 요청 우선 전환/실패 시 이전 월드 보존을 재사용했습니다. GLB 공간은 기존 GLTFLoader/ModelLoader로 읽습니다. 이전에는 서버가 없고 ServiceStore/LocalDemoRepository에 브라우저 로컬 데모 데이터만 있었습니다.

새 소셜 계층은 `main.ts`에서 기존 경험과 조립합니다. 엔진은 UI/월드를 import하지 않습니다. 기존 4개 Figma 화면·조명·셰이딩·가구 위치는 유지합니다. 소셜 패널은 공간 화면에서만 보이며, 메뉴/평가/약속 화면은 기존 UI를 사용합니다. 현재 기본 카메라는 1인칭입니다. 자기 아바타는 생성 직후부터 본인 렌더에 표시하지 않으며, 같은 아바타의 독립 원격 복제는 다른 접속자 화면에 표시합니다. 이동·인사·앉기 동기화는 유지합니다. 공통 엔진의 3인칭 카메라 충돌 기능은 기존 코드로 보존하지만 현재 서비스에서는 사용하지 않습니다. WebXR/Cardboard도 기존 1인칭을 유지합니다. 기존 1인용 검수는 `?offline=1`로 실행할 수 있습니다.

## 실행

Node.js 22.18 이상과 npm을 사용합니다. 설치된 추가 라이브러리는 `socket.io@4.8.4`, `socket.io-client@4.8.4` 두 개입니다. TypeScript는 기존 도구로 서버를 JS로 빌드하므로 별도 실행 라이브러리는 없습니다.

```sh
npm install
npm run server
```

다른 터미널에서:

```sh
npm run dev
```

브라우저 주소: `http://127.0.0.1:5173/?room=demo#my-room`

다른 브라우저/시크릿 창에서 동일한 주소를 열고 각각 닉네임을 입력해 ‘입장’을 누릅니다. 서버는 3001, 프론트엔드는 5173 포트를 사용합니다. Vite가 Socket.IO 경로를 서버로 프록시합니다. 서버가 없어도 개인 공간을 볼 수 있으나 입장 시 연결 오류가 표시됩니다. 접속 전에는 마이크/네트워크 방에 자동 입장하지 않습니다.

`npm run build` 후 `npm run server`로 실행하면 같은 Node 서버가 `dist/`도 제공합니다. 이 경우 주소는 `http://127.0.0.1:3001/?room=demo#my-room`입니다.

## 아바타 원본과 검사

ZIP의 `outputs/Repair_v6/CubScout_v6_Rigged.glb`를 바이트 변경 없이 `public/assets/avatars/cub-scout-v6.glb`에 복사했습니다. SHA-256은 `9bfaa8255e85d7eff4f33446cae809011d519ebfd3ba2fa35f5a0d2b50f338ea`입니다.

실제 GLTFLoader 검사: 19개 관절, 16개 SkinnedMesh, 5개 클립. 원본 높이는 약 1.899m이며 1.75m로 균일 스케일을 적용하고 바닥 기준을 보정합니다. 얼굴(+Z)을 기존 플레이어 전방(-Z)으로 맞추기 위해 모델만 Y축 π 회전합니다. 기존 관절/클립을 재사용하며 새로운 관절/애니메이션은 만들지 않습니다.

- `01_Idle`: 대기
- `02_Walk`: 이동
- `03_Wave`: 1번 키/버튼, 1회 재생 후 당시 이동 상태로 복귀
- `04_Sit`: 좌석 정렬 후 재생, 마지막 자세 유지
- `05_Shoulder_Check`: 일반 사용자 동작에 포함하지 않음

전환은 0.18초 crossFade입니다. 같은 방의 아바타는 원본 GLB를 한 번 로드하는 방 소유 풀에서 SkeletonUtils.clone으로 복제합니다. 각 인물의 스켈레톤/AnimationMixer는 독립적이며 geometry/material/texture는 풀 수명 동안 공유합니다. 개별 퇴장은 해당 skeleton/mixer/닉네임 자원을, 방 퇴장은 원본 GPU 자원까지 정리합니다. 취소 뒤 늦게 끝난 로딩도 정리합니다. 전역 영구 자원 캐시는 추가하지 않았습니다.

현재 좌석은 기존 마이룸의 소파 형태 블록 2자리와 낚시터 12자리입니다. 기존 블록/가구의 위치나 디자인을 바꾸지 않았습니다. 좌석의 발 기준·안전한 통로 위치·방향·실제 표면 높이를 별도 메타데이터로 둡니다. 원본 Sit 클립은 Hips 평행 이동이 없으므로 실제 좌석 표면과 골반 앵커를 맞추는 모델 오프셋을 적용합니다. 다른 높이/형태의 빈백을 추가할 때는 해당 가구의 좌석 메타데이터와 원본 자세를 시각 검수해야 합니다.

`npm run inspect:avatar`로 재검사하며 상세 결과는 `docs/social-avatar-report.json`에 저장합니다. 원본 GLB는 validator 오류 0개, `NODE_SKINNED_MESH_NON_ROOT` 경고 16개가 있습니다. 원본 메시/리깅을 임의로 고치지 않았습니다.

## 서버와 동기화

Socket.IO 서버는 실제 연결된 소켓을 닉네임 입장 시에만 방에 등록합니다. 소켓 ID가 세션 사용자 ID입니다. 방 키는 `월드 ID:room 값`이며 두 값이 모두 같아야 아바타/채팅/음성 signaling을 공유합니다. 방당 최대 16명, 서버 최대 256개 방입니다. 빈 방은 삭제합니다. 영구 계정/로그인/DB는 구현하지 않았습니다.

일반 화면의 마이룸 데모 인물과 낚시터 샘플 인물은 생성하지 않습니다. 자기 자신의 아바타는 로컬 프리뷰로 표시하고, 다른 아바타는 서버 목록에 있는 실제 사용자만 만듭니다. 예전 샘플 인물은 DEV + e2e의 기존 검수 전용 화면에만 남습니다. 모드 카드의 과거 임의 접속 숫자도 일반 화면에서 제거했습니다. 접속 인원은 서버의 현재 방 목록으로 표시합니다.

클라이언트는 15Hz로 자신의 위치/회전을 전송하고 서버도 15Hz 스냅샷을 보냅니다. 로컬 이동은 즉시 처리합니다. 원격 이동은 100ms 표본 버퍼, 위치/최단각 보간과 지수 평활을 사용합니다. 갱신이 끊기면 마지막 위치에서 멈춥니다. 서버는 유한 수치, 실제 바닥/AABB 충돌, 이동 거리/속도 예산을 검증하고 잘못된 이동을 보정합니다. VR 순간이동은 별도 이벤트로 기존 허용 영역/최대 거리(기본 8m), 1.2초 재사용 간격, 같은 높이의 착지 및 전체 경로 충돌을 검사합니다. 실제 VR 기기의 이 동작은 미검증이며 서버 정책은 Node 검사로 확인합니다. 서버 충돌 카탈로그는 기존 월드 config에서 `npm run generate:social-rooms`로 추출하며 단위 검사로 일치 여부를 확인합니다.

좌석 요청은 서버에서 거리·유효 좌석·현재 점유를 한 번에 검사합니다. 승인된 좌석만 로컬/원격에 반영하며 서 있을 때는 지정 통로로 돌아옵니다. 퇴장/연결 종료/방 변경은 점유를 해제합니다. 연결 손실은 heartbeat 감지 후 다른 사용자에게 제거되며, 재접속 시 새로운 세션과 현재 목록으로 복귀합니다. 마이크는 재접속 뒤 다시 명시적으로 켜야 합니다.

채팅은 같은 방의 실제 접속자에게만 전달하고 최근 50개를 방 메모리에 보관합니다. 500자 제한, 제어문자 제거, HTML이 아닌 text node 렌더링, 10초당 5개 제한을 적용합니다. 서버 전체 이벤트도 토큰 제한과 최대 패킷 크기를 적용합니다. 브라우저 Origin은 명시된 목록으로 제한합니다.

## 조작

| 입력/버튼 | 기능 |
|---|---|
| WASD | 기존 공통 이동과 충돌 |
| 마우스 | 기존 포인터 잠금/시점 |
| Esc | 포인터 잠금 해제, 기존 메뉴/종료 |
| 1 / 손 흔들기 | 서버로 Wave 전달 |
| E / 좌석 버튼 | 가까운 좌석 요청, 앉아 있으면 일어나기 |
| Q | 앉은 상태에서 일어나기 |
| 채팅 | 채팅창 열기/닫기 |
| 음성 켜기/끄기 | 명시적 마이크 권한 및 통화 시작/종료 |
| 마이크 음소거/켜기 | 통화는 유지하면서 송출 트랙만 음소거 |

텍스트 입력 중에는 기존 이동 키가 작동하지 않습니다. 모바일 기존 시점/두 손가락 이동도 유지합니다. 소셜 UI는 회색 계열이며 활성 마이크 등 필요한 상태에만 #E04D08을 사용합니다.

## 음성 구성과 외부 접속

텍스트 채팅과 분리된 WebRTC mesh 음성입니다. 같은 방에서 양쪽이 음성을 명시적으로 켠 경우에만 signaling을 전달합니다. 고정 오디오 트랙 하나에 세션 ID 순서로 offerer를 정해 offer 충돌을 피하고, remote description 이전 ICE 후보는 제한된 큐에 둡니다.

Web Audio의 MediaStreamSource → HRTF Panner → Gain → destination으로 출력합니다. 몸 사이 거리 1.5m 안에서는 기본 gain 1, 그 밖에는 부드럽게 줄고 12m 이상에서 0이 됩니다. 카메라 회전에 따른 방향감도 반영합니다. 음성 끄기·퇴장·방 변경·연결 손실 때 peer connection, 오디오 노드/요소, 마이크 트랙과 AudioContext를 정리합니다.

서버 설정은 `.env.social.example`을 `.env.social`로 복사합니다. 실제 TURN 자격증명은 소스에 넣지 않습니다. 이 파일은 Git 제외입니다.

| 변수 | 용도 |
|---|---|
| HOST | 기본 127.0.0.1. 다른 기기에서 접속할 서버는 0.0.0.0 |
| PORT | 기본 3001 |
| ALLOWED_ORIGINS | 허용할 프론트 URL을 쉼표로 구분. 실제 HTTPS 도메인/포트 포함 |
| STATIC_DIRECTORY | 빌드 프론트 파일, 기본 dist |
| RTC_ICE_SERVERS | STUN/TURN RTCIceServer 배열 JSON, 기본 [] |
| SOCIAL_SERVER_URL | Vite 개발/preview 프록시 대상. 기본 http://127.0.0.1:3001 |
| VITE_SOCIAL_SERVER_URL | 별도 공개 Socket.IO 주소가 필요할 때 프론트 빌드 환경변수. 같은 Origin 프록시면 생략 |
| VITE_AVATAR_URL | 기본 GLB 대신 사용할 호환 모델 URL. 기본 파일을 권장 |

같은 LAN에서 텍스트/이동을 확인하려면 서버 HOST=0.0.0.0, 허용 Origin을 실제 LAN 주소로 지정하고 프론트를 `npm run dev -- --host 0.0.0.0`로 실행한 뒤 해당 IP:5173 주소를 엽니다. 마이크는 localhost 외에는 HTTPS가 필요합니다.

실제 인터넷 배포에는 공개 Node 서버·HTTPS 프론트·`/socket.io/` WebSocket upgrade 프록시·허용 Origin을 설정해야 합니다. NAT/방화벽이 다른 사용자의 음성에는 운영 가능한 STUN/TURN 서버(릴레이 주소, 계정, 암호 또는 단기 자격증명)가 필요합니다. 기본 ICE 배열이 비어 있으므로 로컬 두 브라우저 연결은 되지만 임의의 인터넷망 연결을 보장하지 않습니다. TURN 수명/계정 발급 인프라와 외부 호스팅 계정은 제공되지 않아 배포하지 않았습니다.

현재는 단일 Node 프로세스의 휘발성 방입니다. 여러 Node 인스턴스로 확장하려면 sticky session/Socket.IO adapter와 원자적인 좌석 상태 저장소를 함께 설계해야 합니다. 계정 인증·대화 영구 저장·음성 SFU·운영 모니터링은 추가하지 않았습니다.

## 검증

최종 `npm run check` 통과(Node 25개 파일/132개, 프론트/서버 빌드·프로덕션 분리 포함). 소셜 통합 4개 통과. 기존 전체 회귀 52개 중 50개 통과 후, NPC 제거에 따른 착석 검사 2개의 입력 관찰을 보정하고 관련 8개를 재실행해 모두 통과했습니다. 정확한 실행별 결과는 `docs/progress.md`와 `docs/screenshots/social/`에 기록했습니다.

```sh
npm run check
npm run test:e2e -- --config=playwright.water.config.ts
npm run test:e2e:social
```

소셜 E2E는 실제 Node 서버, 실제 GLTFLoader, 실제 키보드 이동과 두 독립 Chromium 프로세스를 사용합니다. 진단은 DEV + e2e에서 읽기 전용으로 노출하며 프로덕션에서 제거합니다. 음성 검사는 브라우저의 테스트용 마이크를 사용해 실제 RTCPeerConnection 오디오 RTP 수신 바이트/거리 gain/음소거/종료를 확인합니다. 실제 사람의 마이크 음질, 외부 인터넷 NAT/TURN, 실기기 VR/스마트폰 센서/Safari는 검증 결과에 포함하지 않습니다.

## 주요 추가/수정 파일

- `server/app.ts`, `server/RoomService.ts`, `server/index.ts`: HTTP/Socket.IO, 서버 상태·검증·좌석·채팅·signaling
- `shared/social.ts`, `shared/rooms.json`, `scripts/export-social-rooms.mjs`: 통신 타입과 기존 공간의 충돌/좌석 카탈로그
- `src/social/*`: GLB 풀/애니메이션, 원격 보간, 닉네임, 클라이언트, 음성, 최소 소셜 UI, 경험 조립 어댑터
- `src/main.ts`: 기존 경험과 소셜 계층 연결
- `src/engine/player/PlayerController.ts`, `src/engine/collision/CollisionSystem.ts`, `src/engine/core/Engine.ts`: 공통 3인칭/카메라 충돌
- `src/experience/FirstFixExperience.ts`, `src/experience/startFishing.ts`, `src/worlds/indoor-fishing/runtime.ts`, `state.ts`: 데모 인물 제외, 기존 낚시 좌석과 서버 연결
- `src/ui/FixScreens.ts`: 가상의 모드 접속 숫자 제외
- `src/dev/socialDiagnostics.ts`, `scripts/check-production.mjs`: 읽기 전용 테스트 진단과 프로덕션 분리
- `tests/social.test.ts`, `tests/avatar.test.ts`, `tests/e2e/social.spec.ts`, `playwright.social.config.ts`: 실제 모델·서버 정책·두 브라우저·음성 검사
- `package.json`, `package-lock.json`, `tsconfig.server.json`, `vite.config.ts`, `.env.social.example`: 설치/실행/환경 설정

참고한 공식 문서: [Socket.IO 설치](https://socket.io/docs/v4/server-installation/), [클라이언트 호환성](https://socket.io/docs/v4/client-installation/), [Three.js SkeletonUtils](https://threejs.org/docs/pages/module-SkeletonUtils), [AnimationAction](https://threejs.org/docs/pages/AnimationAction.html), [MDN WebRTC](https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API/Perfect_negotiation).
