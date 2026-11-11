# 목공방 GLB 통합 사전 분석 — 2026-11-10

> 최신 적용: 2026-11-11에 다시 제공된 `목공방 디자인.zip`의 `forest-atelier-original.glb`와 렌더링 코드를 실제 월드에 연결했습니다. [현재 구현·검증 범위](../src/worlds/woodworking/README.md)를 따르며, 아래 내용은 이전 수정 ZIP과 별도 `목공방.glb`에 대한 분석 이력입니다.

> 2026-11-11 갱신: 사용자가 `목공방.glb`를 제공했고 파일/노드/bounds 분석과 로컬 정적 자산 복사를 시작했습니다. 이후 요청된 마이룸 적용을 우선 진행하며 목공방의 실제 표시 월드는 아직 교체하지 않았습니다. 아래의 GLB 누락 기록은 최초 분석 시점의 이력입니다.

## 확인된 입력과 필수 누락

- `목공방 수정 디자인.zip`: 74,455바이트, SHA-256 `6169ba5b0383251370e51687f6a37940c058717dc559201166e5d0becebb02fa`.
- ZIP은 경로 이탈/심볼릭 링크를 검사한 뒤 `/private/tmp/woodworking-revised-20261110`에 풀어 분석했다. 첨부 문서의 사용 설명이나 package 스크립트는 실행 지시로 취급하지 않았다.
- ZIP에는 `src/world/GlbSpace.tsx`가 있지만 **GLB/GLTF 파일과 public/models 자산은 없다**. `/models/forest-atelier.glb`는 코드의 기본 예시 경로이며 실제 첨부 파일명이 아니다.
- Downloads·Codex 첨부 폴더·현재 프로젝트에서 확인되는 GLB는 기존 아바타, 기존 test-room, 다른 실험의 room/escape_room/fishing_forest뿐이다. 목공방 GLB의 실제 파일 경로가 필요하다.
- GLB 노드 구조·재질·텍스처·전체 크기·중심·바닥 높이·실제 진입 위치는 파일을 받기 전에는 확정할 수 없다. 다른 GLB를 목공방 자산으로 대체하거나 파일명을 추정하지 않았다.

## ZIP과 현재 프로젝트의 구조

| 대상 | 수정 ZIP | 현재 프로젝트 및 통합 경계 |
| --- | --- | --- |
| 진입점 | `src/main.tsx` → React StrictMode → `Scene` | `index.html` → `src/main.ts` → FirstFixExperience + SocialExperience |
| 현재 표시 공간 | `Scene.tsx`가 여전히 절차적 Atelier/Forest를 생성 | `worlds/woodworking/config.ts`가 기존 절차적 목공방을 등록 |
| GLB 코드 | `GlbSpace.tsx`: useGLTF + scene.clone(true), 별도 Canvas/카메라/PointerLockControls | GLB 로딩을 기존 월드 생성/전환 수명에 연결해야 함 |
| 플레이어 | Rapier character controller, WASD/가속/마우스, 자체 카메라, M=음성 | 공통 PlayerController, XR rig, MovementCollision, M=모드 선택. 입력과 카메라 중복 생성 방지 필요 |
| 충돌 | layout.ts AABB → CuboidCollider; 절차적 가구 위치 기준 | 평면 바닥/AABB, 같은 방 배치를 서버 rooms.json으로 내보냄. GLB 배치 확인 후 실제 형상에 맞춰 함께 갱신 필요 |
| 상태 | Zustand, selfPose, 위치·동료·마이크·대화상자·품질 상태 | ServiceStore, Engine 및 SocialClient/SpatialVoice 상태 사용 |
| 네트워크 | `/api/config`, `join/pose/snapshot/signal`, edge 대체 전송 | `/api/social/config`, `room:join/player:state/room:snapshot/voice:signal`. 프로토콜이 달라 ZIP transport를 기존 서버에 그대로 연결할 수 없음 |
| 아바타 | 절차적 원격 아바타, 실제 명단에서 자기 ID 제외 | 제공 CubScout GLB/AnimationMixer/월드별 AvatarPool, 자기 모델 숨김/원격 복제 유지 |
| 음성 | 사용자 동작 후 getUserMedia, WebRTC, HRTF, 자체 마이크 상태·거리 계산 | 기존 SpatialVoice, 서버 ICE 설정·방 단위 신호 검증·XR 카메라 위치/방향·종료 정리 유지 |
| UI | 별도 HUD/UI 소스 없음. Player의 오브젝트 대화상자 상태 및 Avatar의 Html 닉네임은 UI 성격 | 기존 Figma 1차 픽스 UI와 공간 전환 버튼을 유지 |

## 의존성과 렌더링

ZIP은 React 19, Fiber 9, Drei 10, Rapier 2, Zustand 5, postprocessing과 Three ^0.181을 선언한다. 현재 프로젝트는 Three 0.187.0·Vite 8.3.6·TypeScript 6.0.3이며 React/Fiber/Drei를 설치하지 않았다. 현재 TSX는 네이티브 DOM factory를 사용하므로 ZIP의 React 진입점/tsconfig/package.json을 그대로 덮어쓰면 안 된다.

사용자의 useGLTF 요구를 지키는 별도 로딩 경계를 설계하고 공식 문서·실제 설치 버전의 peer 호환성을 확인한 뒤 필요한 의존성만 추가해야 한다. 기존 Renderer/WebXR/PlayerController의 소유권을 유지한다. ZIP의 조명·배경·안개·시야각·노출은 현재 엔진의 월드별 프로필로 연결할 수 있다.

## GLB 코드에서 그대로 적용하면 안 되는 부분

- ZIP prepareModel은 roughness를 최소 0.48로 바꾸고 envMapIntensity를 0.35로 덮는다. 이번 사용자의 재질 보존 요구에 따라 이 보정은 적용하지 않아야 한다.
- scene.clone(true)는 노드 계층을 복제하지만 지오메트리·재질·텍스처의 GPU 자원까지 독립 복제하지 않는다. 원본 훼손/공유 자원 조기 dispose를 막는 소유권과 useGLTF 캐시 해제 수명 설계가 필요하다.
- Suspense fallback=null만으로 끝내면 진행/오류를 표시하지 못한다. 기존 로딩 알림·실패 알림·이전 월드 보존·최신 요청 적용 규칙과 연결해야 한다.
- GLB Mesh의 castShadow/receiveShadow를 true로 설정하되, Base Color/Normal/Roughness/Metallic/Alpha/Emissive/Side/UV/Vertex Color를 보존하고 convertSRGBToLinear를 중복 호출하지 않아야 한다.
- 바닥 정렬은 전체 bounding box의 minY를 곧바로 바닥으로 가정하지 않고 실제 바닥 노드·지형·기초를 확인해 결정한다. GLB 치수만으로 사람/아바타를 임의로 축소하지 않는다.

## 현재 결과와 다음 단계

현재는 파일 분석과 누락 확인만 완료했다. 애플리케이션 코드·의존성·공개 배포는 변경하지 않았다. GLB 통합 또는 해당 GLB의 브라우저/실기기 검증을 완료했다고 보고하지 않는다.

실제 목공방 GLB를 받으면 파일명/노드/재질/압축 확장·bounds·바닥/진입 좌표를 검사하고, 수정 ZIP의 GLB 로딩 코드를 기존 월드에 통합한다. 실제 모델에 맞는 클라이언트/서버 충돌을 연결한 뒤 타입·빌드·전체 check 및 실제 Chromium의 로딩/재질/이동/충돌/실패·취소/전환/자원 정리·두 사용자/테스트 음성을 검증한다. 실제 VR 기기는 별도 확인 범위다.
