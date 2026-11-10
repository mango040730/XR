# 기술 구조

## 3단계 PC·VR 공통 조작

`DesktopInput`과 `XRInput`은 분리되어 있고 `PlayerController.update()`와 `MovementCollision`을 공유합니다. `XRInputMapper`는 순수한 xr-standard axes/deadzone/중립 재무장/턴/텔레포트 제스처 상태기계입니다. native `XRInput`은 inputSources·select·visibilitychange·inputsourceschange만 연결합니다. `XRControllerSystem`은 XRFrame 포즈를 공통 이동/선택에 조립하고 `XRVisuals`는 Ray·목적지·head-locked 안내/암전만 그립니다.

PC에서 rig.position은 발 위치입니다. VR에서는 **가상 feet**와 **tracking origin인 rig.position**을 분리합니다. local-floor 머리의 수평 오프셋 h, rig yaw 회전 R, 발 위치 F에 대해 `rig.position = F - R*h`(수평축)를 유지합니다. 첫 포즈는 발을 유지하며 정렬합니다. 이후 머리의 수평 tracking delta를 같은 CollisionSystem에 통과시켜 F를 이동합니다. 카메라 local pose는 Three.js가 반영합니다. 스냅 턴은 F를 고정한 채 R과 rig 원점을 함께 조정하므로 머리 중심을 피벗으로 회전합니다.

리센터 reset 또는 큰 tracking 불연속은 마지막 포즈를 재기준화하고 발을 뛰게 하지 않습니다. 추적 손실/포커스 상실은 입력과 선택을 비우며 암전합니다. 실제 머리 이동이 가상 벽을 넘으려 하면 발 위치를 제한하고 rig를 보정합니다. 이는 물리적 제지가 아니며 보정/암전 정책의 편의성은 실기기 미검증입니다. 카메라가 충돌체에 들어갈 수 있는 높이 상황도 canStand 검사와 암전으로 처리하며 임의 3D capsule 물리는 아닙니다.

TeleportSystem은 같은 높이의 평면 바닥에 직선 controller ray를 투영합니다. world teleport.areas, 몸 반경·현재 머리 높이, 거리, ray 가림, 몸체 경로/바닥 틈을 검사하고 놓는 프레임에도 다시 판정합니다. 유효한 경우에만 F를 옮깁니다. 기본은 teleport/snap, smooth 이동·회전은 각각 opt-in이며 설정은 세션 전에 선택합니다. VR 세션 중 Engine.enterWorld 요청은 먼저 세션 종료를 기다리고 기존 전환 로직을 사용합니다. HTML 메뉴는 VR 중 잠기며 VR 내부 월드 메뉴는 아직 없습니다.

InteractionSystem.update(camera)와 updateRay(channel, ray, observer)는 같은 hit/거리/몸 기준 가림 검사와 activate 액션을 사용합니다. 각 입력의 BoxHelper 강조는 월드 외부 그룹에 두고 hover/월드/세션 정리 때 dispose합니다. GLB 노드는 world.interactions의 이름으로 연결하고 재질을 분리하여 버튼 색이 다른 공유 재질 객체로 번지지 않게 합니다. 동일 논리 ID의 하위 메시들은 같은 액션을 받습니다. PC 메시지와 VR HUD는 공통 messages/actions를 구독합니다.

XR 세션 종료 시 실제 가상 feet와 마지막 rig+head 수평 시선을 PC rig로 옮기고 저장한 PC pitch/눈높이를 복구합니다. 월드 진입은 spawn/설정/선택 상태를 새로 초기화합니다. 네이티브 입력 이벤트와 reference reset 구독은 세션 끝에 제거하며 XR 시각 자원은 엔진 끝에 dispose합니다. PC 모드에서는 XR 그룹을 숨겨 그리지 않습니다.

설치된 Three.js **0.187.0**의 getReferenceSpace/getSession, XRFrame 포즈 갱신 순서와 타입을 확인했습니다. 추가 SDK는 사용하지 않습니다. [WebXR 표준](https://www.w3.org/TR/webxr/)과 [Gamepads 표준](https://www.w3.org/TR/webxr-gamepads-module-1/)의 inputSources/targetRaySpace/select/xr-standard를 사용하며 `navigator.getGamepads()`나 기기별 버튼 추측을 사용하지 않습니다. axes[2,3]은 thumbstick, buttons[1]은 optional primary squeeze입니다. 표준 mapping이 없는 입력은 이동을 비활성화하고 native select/Ray만 제공합니다.

## 2단계 보강 (유지)

기존 WorldManager/ModelLoader/PlayerController/CollisionSystem/InteractionSystem/XRManager/registry 경계를 유지했습니다. GLB Test Room을 registry에 추가하고 floors/boxes에 `visible:false`를 지원해 GLB 시각 모델과 충돌 프록시를 분리했습니다. CollisionSystem 자체는 평면/AABB 구현을 유지합니다.

로딩 중 UI 진입 버튼도 다른 월드 요청을 허용합니다. WorldManager의 최신 요청 우선 규칙을 그대로 사용해 늦은 로딩 결과가 현재 공간을 덮어쓰지 않습니다. 모델 MIME Accept 헤더로 누락 파일이 HTML SPA 응답으로 대체되는 일을 막습니다.

`src/dev/engineDiagnostics.ts`는 엔진 외부의 읽기 전용 관찰자입니다. 실제 위치/변환/scene root/renderer resource counter와 실제 dispose 이벤트를 관찰하며 기능을 성공 처리하거나 입력을 대신 생성하지 않습니다. `main.ts`의 `DEV && MODE === 'e2e'` 조건에서만 동적 import합니다. production JS 문자열 검사와 실제 production Chromium 검사로 진단 전역·오류 fixture가 제외되는지 확인합니다.

실제 입력 검사에서 pointerlockchange 획득 이벤트가 첫 keydown 뒤 도착해 키를 지우는 경쟁 조건을 발견했습니다. DesktopInput은 잠금 상실 때만 키를 초기화하고 Escape 키에서 명시적으로 잠금을 해제하도록 보강했습니다. 입력 경계와 공통 이동 로직은 유지했습니다.

## 경계와 데이터 흐름

`main.ts`가 월드 목록과 UI 컨테이너를 `Engine`에 전달합니다. 엔진은 월드 레지스트리의 위치나 UI 구현을 알지 못합니다. 향후 React UI는 `Engine` 생성/해제, `worlds.changes`·`xr.changes`·`notices` 구독, `enterWorld`·`leaveWorld` 호출로 연결할 수 있습니다. React의 effect 정리 때 구독 해제와 `await engine.dispose()`를 실행합니다.

`DesktopInput.readMovement()`는 `{ right, forward }` 의도만 반환합니다. `PlayerController`가 속도·yaw·delta를 적용하고 `MovementCollision.move()`에 이동을 요청합니다. 시점의 pitch는 수평 이동에 영향을 주지 않습니다. XR 입력 어댑터를 추가할 때도 이 공통 이동 경로를 사용하되 방향 기준과 편의성 설정은 XR 어댑터에서 결정합니다.

`Renderer`는 scene/camera/WebGL renderer와 resize를 소유합니다. 루프는 `renderer.setAnimationLoop()` 하나를 사용해 XR 렌더링에 연결합니다. `PlayerController.rig`는 PC에서 발 위치/방향을 소유하고 PC 카메라는 그 안에서 눈높이에 배치됩니다. VR의 발 위치/원점 분리는 위 3단계 규칙을 따릅니다. VR 세션에는 `local-floor`와 rig를 사용하고 카메라의 위치·회전은 Three.js WebXRManager가 갱신합니다. XR 세션에서 PC 입력은 중지합니다. 종료 시 카메라를 PC 눈높이·pitch로 복구합니다.

## 월드 생명주기

1. 등록된 config를 찾고 요청 번호 및 AbortController를 생성합니다.
2. scene에 아직 붙이지 않은 새 root에 임시 월드를 준비합니다. 로딩 동안 PC 이동과 VR 진입을 중지합니다.
3. 성공했고 최신 요청이면 새 root를 scene에 붙이고 이전 월드를 정리합니다.
4. 실패하면 새 root의 부분 생성 자원을 정리하고 기존 월드를 유지합니다. UI에서 다시 진입할 수 있습니다.
5. 더 늦게 끝난 이전 요청의 완료/오류/진행률은 현재 상태를 덮어쓰지 않습니다.
6. 퇴장은 진행 중 요청을 무효화하고 활성 root를 정리합니다. 미완료 GLTF 요청은 네트워크 완료 후 폐기합니다.

`WorldBuildContext.root`에 생성 자원을 즉시 붙이는 규칙을 지켜야 실패 시 관리자가 정리할 수 있습니다. 월드 전용 외부 이벤트나 타이머를 추가한다면 반드시 `WorldInstance.dispose()`에 해제를 연결하는 설계를 함께 추가하세요. 현재 config.build는 시각적 구성 확장용이며 외부 타이머/이벤트를 보유하지 않습니다.

## 리소스 소유권

월드 root는 geometry, material, texture를 독점 소유합니다. 월드 내부의 공유 자원은 Set으로 중복 해제를 방지합니다. 퇴장/교체 때 GPU 자원 dispose, ImageBitmap close, skeleton/light shadow 정리 후 scene에서 제거합니다. 엔진을 종료할 때만 renderer와 resize observer, 입력 이벤트, 루프, 구독도 해제합니다.

월드 사이에 동일한 GPU 자원을 공유하는 캐시는 없습니다. 향후 캐시가 필요하면 참조 수명 관리부터 구현해야 합니다. 로딩 중에는 기존/새 월드가 일시적으로 함께 메모리에 있어 큰 GLB는 최대 메모리 사용량 측정이 필요합니다. Three.js 내부 캐시와 브라우저 GPU 회수 시점 때문에 실제 메모리가 즉시 0이 되는 것은 보장하지 않습니다.

## 충돌의 현재 범위

평면 바닥 영역과 static AABB 장애물을 사용합니다. 플레이어는 폭을 가진 직육면체로 검사하며 x/z를 분리해 벽을 따라 이동합니다. 작은 이동 구간으로 나누어 얇은 벽 통과를 막습니다. 발 위치의 높이는 고정되고, 몸체가 완전히 한 바닥 영역 위에 놓여야 이동을 허용합니다. 낙하를 계산하기보다 바닥 없는 곳으로의 이동을 차단합니다. 여러 바닥 경계를 자연스럽게 잇는 처리, 높이 변화, 경사·계단은 아직 없습니다.

추후 `MovementCollision` 구현을 capsule/triangle-mesh 방식으로 교체하고 WorldInstance가 해당 구현을 공급하도록 확장할 수 있습니다. PC 입력과 UI는 그대로 재사용할 수 있습니다. 시각 모델만 지정했다고 자동으로 물리 충돌이 생기지는 않습니다.

## XR과 UI

`detectXR`는 보안 연결/API/immersive-vr 가능 여부를 각각 검사합니다. 지원되고 활성 월드가 있을 때 공식 `VRButton.createButton()`을 생성합니다. 버튼 스타일만 조정하고 Three.js의 진입 핸들러를 사용합니다. r187 공식 버튼의 requestSession 거절에는 catch가 없어, 진입 대기 중 발생한 promise rejection을 UI 상태로 알리고 PC 입력을 복구하는 보완 처리를 두었습니다. 실제 요청 거절 및 재진입 흐름은 실기기 확인이 필요합니다.

VR 중 HTML 월드/속도/편의 설정 메뉴는 잠급니다. HTML UI는 VR 내부에 표시되지 않으며 별도의 XRVisuals가 Ray·목적지·안내·선택 결과를 그립니다. 컨트롤러 스틱/레이는 구현했으며 컨트롤러 자체 모델과 고급 VR 메뉴는 포함하지 않았습니다. 실제 신체는 물리적으로 제지할 수 없고 가상 몸 제한/rig 보정·암전 정책을 사용합니다.

## 이후 기능 연결 지점

- 아바타: player rig와 별도 avatar 모듈. 애니메이션 mixer/모델의 해제 수명도 관리합니다.
- 시뮬레이션: interaction action 구독과 월드 전용 모듈. 전역 월드 ID 분기를 만들지 않습니다.
- React/Figma: UI adapter 교체. 엔진 내부에 UI 컴포넌트를 넣지 않습니다.
- 로그인/마이룸/멀티플레이: 별도 애플리케이션·네트워크 계층에서 월드 선택과 플레이어 상태를 연결합니다. 현재 서버나 가짜 API 추상화는 만들지 않았습니다.
- 오디오: config metadata만 예약했습니다. 향후 브라우저 사용자 동작, AudioContext, 월드 퇴장 시 정지를 함께 구현합니다.

공식 근거: [WebXRManager](https://threejs.org/docs/pages/WebXRManager.html), [VRButton](https://threejs.org/docs/pages/VRButton.html), [GLTFLoader](https://threejs.org/docs/pages/GLTFLoader.html). 추가 XR SDK 없이 첫 단계 범위를 충족하므로 Meta SDK는 채택하지 않았습니다.

## v0.4 서비스 조립

기존 engine 경계를 유지한 채 기본 진입점을 `ServiceExperience`로 바꾸고 기존 `AppUI` 조립을 `experience/startLab.ts`(`?lab=1`)로 보존했습니다. 엔진에는 프레임 Signal/presenter와 desktop 입력 허용 경계만 추가했습니다. 서비스/저장/화면/Cardboard의 상세 설계는 [service-architecture.md](service-architecture.md)를 따릅니다. Figma 변경은 engine 수정 없이 UI 모듈에서 처리합니다.
