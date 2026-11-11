# 첨부 원본 목공방 GLB 통합

2026-11-11에 다시 제공된 `목공방 디자인.zip`을 사용합니다. 이전 같은 이름 ZIP과 내용이 다릅니다.

- ZIP SHA-256: `f172499bafde612dd76022c8c7a823ee2126f07fdaf32047bb9f37ad744c089d`
- 실제 GLB: `public/assets/models/woodworking-original/forest-atelier-original.glb` (11,732,792바이트).
- GLB SHA-256: `e0ea1fee3962a65eceae8d18a43ed61a9e567b7259abd4af9de70b566161767d`, ZIP가 기록한 원본 커밋 `738ad8318bba9f8af95e973777c34d072b9a1279`.
- 원본 1,031개 정적 메시를 내보낸 43개 배치, 108,934 삼각형, 43개 재질, PNG 19개입니다. 숲까지 포함한 bounds는 [-60,-2.3819466,-60]~[60,8.2474632,60]입니다. 실제 실내 바닥 Y=0, 진입 [0,0,5.6], 눈높이 1.65m입니다. 숲 지형의 최저점으로 실내 바닥을 재정렬하지 않습니다. GLB의 원본 미터 단위·좌표·scale=1을 유지합니다.

`AtelierModel.ts`는 drei `useGLTF`를 사용하고 `scene.clone(true)` 이후 geometry/material/texture를 월드별로 복제합니다. 별도 React Canvas나 카메라를 만들지 않고 훅 로더만 격리하여 기존 Three.js 엔진에 전달합니다. 요청마다 private Blob URL을 사용해 서로의 캐시·자원을 공유하지 않습니다. 중단된 디코딩도 완료 시 정리하며 캐시/URL/React 루트를 해제합니다. 다운로드 진행과 실제 파일명·HTTP/GLB 오류를 UI 및 콘솔에 표시하고 실패 시 이전 공간을 유지합니다.

기존 Base Color·normal/roughness 맵·metalness·alpha·발광·DoubleSide·UV·vertex color를 유지합니다. ZIP `AtelierModel.tsx`와 동일하게 `atelierRender`의 depthWrite/flatShading/normalScale와 노드별 그림자 플래그를 복원하고 anisotropy=4를 적용합니다. 색공간을 다시 변환하지 않습니다.

`original-lights.json`과 `lights.ts`는 ZIP의 광원 21개와 좌표/방향/강도·high 그림자를 사용합니다. ACES 노출 1.12, FOV77, near .06/far85, 안개 #d4dbbd(22~60), 최대 DPR1.65, N8AO(.35/1.2/.8, high, halfRes, denoise5), bloom .055/threshold2.4, 한 번 구운 접촉 그림자(19m/1024/.28)와 먼지 35개를 연결합니다.

호환성 차이: 프로젝트 Three r187에서 삭제된 PCFSoftShadowMap 대신 현재 PCFShadowMap을 사용합니다. N8AO 2.0.1의 MRT getter를 해당 인스턴스에서 r187의 `texture=textures[0]` 규약에 맞춥니다. OutputPass가 색공간 변환을 담당하므로 N8AO의 gammaCorrection은 꺼 중복 변환을 막습니다. bloom은 기존 Three composer의 UnrealBloomPass로 연결합니다. 화면 768px 미만·저품질·소프트웨어 GPU·XR에서는 기존 직접 렌더링 경로로 AO/bloom을 생략합니다. 광원/GLB 재질·접촉 그림자는 유지합니다. ZIP의 원본 렌더링과 픽셀 단위 동일함을 보장하지 않습니다.

ZIP의 layout 충돌은 기존 공통 MovementCollision/PlayerController와 연결합니다. PointerLock 플레이어·Rapier·중복 네트워크/음성/UI는 가져오지 않습니다. WASD·방향키는 공간 클릭 없이 즉시 이동하며 마우스 드래그로 시점을 조절합니다. `design/`의 이전 절차적 구현은 보존하되 실제 월드에서는 호출하지 않습니다. 공통 충돌 배치만 재사용합니다.

`npm run inspect:atelier`는 원본 해시·실제 GLB geometry/좌표·메시/재질/이미지 수·extras와 Khronos 결과를 확인합니다. 원본 GLB의 tangent 미포함 경고 11개를 명시적으로 허용하며 다른 경고/오류는 실패시킵니다. 브라우저는 수정하지 않은 GLB와 PNG를 실제로 로드합니다. 도구는 정적 배치이며 목공 게임은 포함하지 않습니다. 실제 VR 기기 성능은 별도 확인이 필요합니다.
