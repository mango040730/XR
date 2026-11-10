# 맑은 실내 수조 물

2026-11-08 (Asia/Seoul). 실제 프로젝트는 `Downloads/공간 실험`입니다.

## 구현과 레퍼런스

현재 Three.js 0.187.0 엔진을 유지하며, 사용자 이미지 1의 맑은 물과 적갈색 수중 타일 및 앞서 첨부된 현재 공간 화면을 비교했습니다. 새 외부 패키지·유료 에셋·이미지 텍스처는 추가하지 않았습니다.

- 수중 타일: 20×12=240개의 실제 InstancedMesh 박스입니다. 저채도 적갈색 4종, 6mm 줄눈이며 수면의 무늬로 그리지 않았습니다. 원래 수조 바닥 -1.13m 위에 새 받침과 타일층을 두어 타일 상면 -0.65m / 수면 0.385m, 약 1.035m 깊이를 만듭니다. 기존 수조 벽·테두리의 위치·형상은 유지합니다. 물고기가 새 바닥 안으로 들어가지 않도록 수중 이동 높이 하한만 맞췄습니다.
- 투명도/굴절: 별도 ShaderMaterial 수면이 실제 수중 장면을 Refractor로 촬영하고 약하게 왜곡합니다. 타일과 물고기의 깊이·원근이 실제 3D 구조에서 옵니다. Beer–Lambert 형태의 채널별 감쇠로 시선 경로가 길수록 색이 조금 깊어집니다. 조합된 수중 장면을 출력하므로 alpha=1이어도 불투명한 녹색 평면이 아니라 수중 장면이 보입니다.
- 반사: 기존 장면의 천장·창·조명을 Reflector로 촬영합니다. 넓은 픽셀 커널로 부드럽게 샘플링하고 Fresnel과 작은 노멀 변화를 적용합니다. 고정된 흰 원형 광원을 수면에 그리지 않습니다.
- 움직임: 방향이 다른 약한 파동 3개와 저주파 노이즈를 조합합니다. 최대 높이 변화 약 1.8mm, 느린 속도입니다. 기존의 큰 반복 원형/격자 빛무늬는 제거했습니다. 실제 바닥에만 낮은 강도의 비주기 빛무늬가 이동하며, 찌 주변 링은 반경 약 0.3m 이내로 작게 유지합니다.
- 렌더 순서: 수면은 depthTest=true/depthWrite=false입니다. 수중 장면은 잘린 전용 패스로 구성하고, 국소 파문/낚싯줄은 그 뒤에 그려 사라지지 않게 합니다.

공간 구조, 카메라 기본 위치/높이, WASD/마우스, 좌석/도구/사람, 실제 주광/점광원, UI, 사용자 상태와 1~5분 포획 로직은 변경하지 않았습니다. 기존 실시간 멀티플레이 서버는 없으며 새 서버도 추가하지 않았습니다.

## 렌더링 경계와 비용

광학 패스는 같은 지오메트리를 공유하되 캡처용 재질·조명을 별도로 보유해 본 화면의 그림자/HDR 재질 상태를 오염시키지 않습니다. 일반 웹에서는 MSAA 본 화면 전에 캡처하고, XR/Cardboard에서는 각 눈의 실제 카메라에 맞춰 처리합니다. XR/viewport/scissor/렌더 대상은 예외가 나도 finally에서 복구합니다. UI용 높은 renderOrder 객체는 캡처에서 제외합니다.

일반 웹은 굴절 1024² + 반사 512², XR은 512² + 256², 가벼운 품질은 굴절 512²로 낮추고 반사 패스를 생략합니다. 그림자 맵은 광학 패스에서 재생성하지 않습니다. 타일은 단일 인스턴싱 드로입니다. 데이터 텍스처 다운로드는 없습니다. 월드 퇴장 시 두 렌더 타깃, 캡처 재질, 타일 인스턴스 자원을 해제합니다.

소프트웨어 GPU(SwiftShader/llvmpipe 등)의 기존 HDR 후처리 경로에서 큰 흰 번짐이 확인되어 해당 백엔드에서는 직접 렌더링으로 폴백합니다. Apple M4 Metal에서는 기존 필름 톤·약한 Bloom을 유지합니다. 조명 위치/세기는 변경하지 않습니다.

## 설정 파일

`src/worlds/indoor-fishing/waterConfig.ts`의 `WATER`에서 조절합니다.

| 설정 | 현재값 / 역할 |
| --- | --- |
| clarity | 0.97, 물의 맑기 |
| absorption | [0.055, 0.022, 0.016], 깊이에 따른 채널 감쇠 |
| waveAmplitude | 0.0018m |
| waveSpeed | 0.13 |
| normalStrength | 0.025 |
| refractionStrength | 0.045 |
| reflectionStrength | 0.72 |
| reflectionBlur | 2.2 texel |
| highlightGain | 0.55 |
| causticsStrength | 0.055 |
| tileTopY | -0.65m |

주요 변경 파일은 `ClearWater.ts`, `WaterScene.ts`, `waterShaders.ts`, `water.ts`, `waterConfig.ts`입니다. `equipment.ts`는 파문 크기/투명도·줄/파문 렌더 순서만, `Renderer.ts`는 물 사전 패스 연결과 소프트웨어 GPU 폴백만 수정했습니다. UI 파일이나 플레이어·XR 입력 코드는 수정하지 않았습니다.

## 실제 검사

- `npm run check`: 린트, 16개 파일/90개 단위 테스트, 기존 GLB 검증, 타입 검사, 프로덕션 빌드/개발 진단 분리 통과.
- `npm run test:e2e -- --config playwright.water.config.ts --project=chromium --grep 'clear water|walks and collides'`: **2개 통과**, 19.1초. Chromium 158.0.8127.18 / Apple M4 / ANGLE Metal / WebGL2. 실제 Pointer Lock/WASD·충돌·착석·찌 투입·가상 시계 포획·회수·일어나기를 검사했습니다. 포획 검사의 가상 시계는 테스트에서만 사용하며 제품의 대기 시간은 바꾸지 않았습니다.
- `water.spec.ts`: 전체 구도, 내려다보기, 시간 경과, 반대편, 낮은 품질, 390×844 화면 전환 검증. 런타임 pageerror / console error / 실패 네트워크 요청 0개입니다. GPU와 로그는 [브라우저 검수 기록](clear-water-browser.json)에 보관합니다.
- 추가 단위 검사는 실제 타일/물 분리와 경계, 인스턴스 유지, 렌더 타깃 해제, 실패 시 XR/viewport/scissor 복원, 캡처 재질 분리와 부모 visibility를 확인합니다.
- [내려다본 수면](screenshots/clear-water/clear-water-downward.png), [전체 구도](screenshots/clear-water/clear-water-overview.png), [반대편](screenshots/clear-water/clear-water-opposite.png), [모바일](screenshots/clear-water/clear-water-mobile.png)을 직접 열어 타일과 반사를 확인했습니다. 기존 기본 카메라 자체를 수정하지 않고 검수 중 일반 마우스 입력으로 내려다봤습니다.

실제 Safari 재검수, 헤드셋 양안/기기 성능은 미검증입니다. 실제 FPS 수치는 측정하지 않았으며 프레임 속도를 보장하지 않습니다. 물의 두 추가 패스 비용은 남으므로 낮은 품질을 제공합니다. 기존 500KB Three.js 번들 경고와 PCFSoftShadowMap이 PCFShadowMap으로 대체된다는 r187 경고는 기록했습니다.

설치 버전의 [Refractor](https://threejs.org/docs/pages/Refractor.html)와 [Reflector](https://threejs.org/docs/pages/Reflector.html) 공식 API 및 로컬 소스를 확인해 사용했습니다.
