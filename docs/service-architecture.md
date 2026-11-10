# 통합 서비스 구조

## 책임 경계

- `engine/`: 기존 월드 생성/정리, 충돌, 공통 플레이어, 입력, XR. UI·서비스 데이터 import 없음. 추가 경계는 frame Signal, presenter 함수, desktop 입력 허용 API뿐.
- `worlds/my-room/config.ts`: 임시 홈 공간. 기존 registry A/B/GLB는 유지하고 서비스 조립에서 홈을 추가 등록.
- `experience/ServiceExperience.ts`: 엔진·저장소·라우터·화면 조립. 화면 이동과 월드 이동을 분리하며 최신 로딩 요청만 완료 화면으로 반영.
- `ui/figma/`: 원본 13개 프레임의 코드 요소, 원본 에셋 URL은 로컬 파일로 변경.
- `ui/ServiceScreens.ts`: 원본 노드를 semantic button/input으로 연결하고 신규 화면 생성. 비동기 모델 로딩/저장 구현 없음.
- `components/`: native TSX factory와 작은 디자인 시스템. 향후 React UI도 Engine/Store Signal을 구독할 수 있음.
- `state/`: DemoData와 ServiceStore. 입력 검증·평가/초대/약속의 상태 전이.
- `services/LocalDemoRepository.ts`: 읽기/쓰기 경계. 현재 동기 로컬 저장이며, 서버 연결 시에는 async repository와 로딩/충돌 처리를 추가할 위치. 현재 로컬 전용이며 서버에 전송하지 않음.
- `routing/`: 화면 해시와 접근 조건. 로그인/온보딩/시뮬레이션 상태가 없으면 가능한 경로로 복구.
- `data/demo.ts`: 사용자/서버 인원/친구/장소/모드의 명시적 데모 데이터.
- `experience/CardboardPresenter.ts`: 센서/터치 시점, 양안 render, 공간 UI와 시선 adapter. 실제 WebXR 세션은 기존 XRManager 유지.
- `experience/DomPanelTexture.ts`: live DOM 측정값으로 텍스트/로컬 SVG/사진/상태를 그리는 CanvasTexture. Figma 화면 PNG를 사용하지 않음.

## 흐름과 데이터

최초 접속 → 로컬 데모 로그인 → 프로필/아바타 → 생활권 → 홈 월드 → 모드/서버 → 해당 A/B/GLB 월드 → 종료/평가 → 홈 → 채팅/초대 → 참여자/날짜/시간/장소 → 로컬 약속.

모드 `solo/social/team`은 A/B/GLB에 연결됩니다. 새 모델 연결은 기존 world config/registry 방식입니다. 서비스 모드와 월드 연결은 `data/demo.ts`에서 설정합니다. 서버 인원은 데모 스냅샷이고 실제 사람 접속 수가 아닙니다. 서버 생성도 로컬 항목 생성입니다. 시뮬레이션에 보이는 다른 캐릭터가 실제 접속자라고 표시하지 않습니다.

별점은 종료한 세션에만 저장되며 모두 1~5점이어야 합니다. 동일 세션 재평가는 한 결과로 교체합니다. 평가 전 별점은 0이고 모드/참여 경험/개인별 평가를 선택해야 완료됩니다. 채팅은 마지막 100개, 초대 수락/거절과 약속은 현재 origin의 브라우저에 저장됩니다. 새로고침은 저장한 프로필로 홈에 도착합니다. 탭/브라우저 간 실시간 동기화는 없습니다.

## 자원·복구

월드 자원은 기존 WorldManager와 disposeObject 수명주기를 사용합니다. UI 평면/텍스처·임시 아바타는 서비스 수명 동안 별도 소유하고 dispose에서 정리합니다. 공간 변경은 세션/입력과 UI 로딩 상태를 함께 갱신합니다. 모델 실패 시 이전 월드가 유지됩니다. 로컬 저장 차단 시 현재 탭 메모리로 계속 작동하고 상태 안내를 표시합니다. 손상된 저장 데이터는 기본값과 안내로 복구합니다.

## 모바일 VR

`StereoCamera`의 양안 카메라와 scissor/viewport가 각각 화면 절반을 렌더링합니다. 실제 WebGLRenderer/월드/공간 패널을 사용합니다. WebXR API가 없어도 센서 또는 드래그를 통한 3DoF 체험이 가능합니다. 헤드셋의 6DoF 이동으로 주장하지 않습니다. 스마트폰은 WASD 대신 시선으로 전/후 이동·30도 회전 버튼을 선택할 수 있고, 같은 PlayerController/CollisionSystem을 사용합니다. 자동 연속 이동은 없습니다.

센서 권한은 사용자 버튼으로만 요청합니다. 권한 허용과 orientation 이벤트 수신은 구별합니다. 미수신 상태는 대기 안내와 드래그 대안이며 자동 성공 처리를 하지 않습니다. native WebXR 세션과 Cardboard renderer는 동시에 사용하지 않습니다. PC 패널 크기는 원본을 유지하고 축소만 하며, VR 폭/거리/IPD/dwell은 별도 설정입니다.

## 확인한 공식 문서

- [Three.js StereoCamera](https://threejs.org/docs/pages/StereoCamera.html): 설치된 r187 소스의 aspect/eyeSep/update를 함께 확인. 추가 SDK 없음.
- [W3C Device Orientation and Motion](https://www.w3.org/TR/orientation-event/): 보안 컨텍스트·권한 요청·기기 좌표. 브라우저 구현 차이는 실기기로 확인해야 함.
- [Pretendard 공식 배포](https://github.com/orioncactus/pretendard): v1.3.9 정적 woff2 및 OFL.

실제 장치 체크는 [cardboard-testing.md](cardboard-testing.md), Figma 원본 대응은 [design-audit.md](design-audit.md)를 따릅니다.
