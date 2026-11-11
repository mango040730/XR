# XR Spatial Platform

Three.js 기반 1인칭 3D 소셜 공간입니다. 기존 공간과 Figma 1차 픽스 4개 화면을 유지합니다. 자기 아바타는 본인 시야에 표시하지 않고, 같은 방에 실제로 입장한 다른 사용자의 아바타만 표시합니다.

공개 웹사이트: https://mango040730.github.io/XR/

## 로컬 실행

Node.js 22.18 이상에서 설치합니다.

```sh
npm ci
```

서로 다른 터미널에서 서버와 프론트를 실행합니다.

```sh
npm run server
```

```sh
npm run dev
```

http://127.0.0.1:5173/?room=demo#my-room 을 브라우저 두 개로 열고 각각 닉네임으로 입장하면 이동·인사·좌석·채팅을 공유합니다. 음성은 각 사용자가 명시적으로 켠 뒤 연결됩니다.

## 기본 공간

홈·모드 선택·약속 등 콘텐츠 모드 외 화면은 제공한 마이룸 GLB 디자인 2.7.1을 사용합니다. 기존 1인칭 이동과 가구 충돌, 16cm 플랫폼 단차를 연결했습니다.

## 모드와 공간

- 혼자 활동해요 → 제공 디자인의 숲속 목공방
- 친목을 다져요 → 기존 실내 낚시터
- 협력하며 즐겨요 → 첨부 디자인의 4레인 볼링장

목공방은 최신 첨부 ZIP의 원본 GLB·재질·조명과 후처리를 사용하며 기존 1인칭 이동·충돌·최소 UI를 연결합니다. 평가 화면은 콘텐츠 종료 순간의 실제 화면을 저장해 유지합니다.

## 조작

- WASD/방향키: 공간 클릭 없이 즉시 이동, 마우스 드래그: 시점, Esc: 기존 메뉴/콘텐츠 종료
- 1: 손 흔들기, E: 가까운 좌석/일어나기, Q: 일어나기
- M: 모드 선택, B: 약속, V: VR 전환
- 터치 한 손가락: 시점, 두 손가락 밀어 유지: 이동

## GitHub Pages 배포

main에 push하면 `.github/workflows/deploy-pages.yml`이 의존성 설치·검사·프론트/서버 빌드를 거쳐 dist만 같은 Pages 주소에 배포합니다. `/XR/` 하위 경로에 맞춰 모델·폰트·화면 복귀 주소를 빌드합니다.

GitHub Pages는 프론트 정적 호스팅입니다. Node.js/Socket.IO 서버는 별도로 실행해야 합니다. 공개 서버가 준비되면 저장소 Settings → Secrets and variables → Actions → Variables에 `SOCIAL_SERVER_URL`을 HTTPS 주소로 등록하고 Pages 워크플로를 다시 실행합니다. 서버의 ALLOWED_ORIGINS에는 `https://mango040730.github.io`를 포함합니다. 외부망 음성에는 운영 STUN/TURN도 필요합니다.

공개 서버 주소가 없는 Pages 빌드에서는 공간 둘러보기를 제공하고 실시간 연결 준비 상태를 표시합니다. 연결할 수 없는 같은 Origin에 소켓 요청을 반복하거나 가상의 접속자를 만들지 않습니다. 로컬 실행의 실제 멀티플레이어는 유지됩니다.

## 검사 및 문서

```sh
npm run check
npm run test:e2e:social
npm run test:e2e -- --config=playwright.water.config.ts
```

- [서버/아바타/음성·환경변수·배포 설정](docs/social-multiplayer.md)
- [기능·검사·제한 기록](docs/progress.md)
- [원본 GLB 검사 결과](docs/social-avatar-report.json)
- [기존 README 기록](docs/archive/README-v0.4-original.md)

제공 아바타의 최종 위치는 `public/assets/avatars/cub-scout-v6.glb`입니다. 일반 사용자 동작은 원본 Idle/Walk/Wave/Sit을 사용합니다. 실제 VR 기기·사람 마이크 음질·외부 NAT/TURN 연결은 별도 검증이 필요합니다.
