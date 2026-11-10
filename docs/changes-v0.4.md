# v0.4.0 수정 파일 목록

## 새 서비스 모듈

- `src/experience/ServiceExperience.ts`: 화면/상태/홈·시뮬레이션 월드 조립
- `src/experience/CardboardPresenter.ts`: 센서·드래그·양안·Ray/dwell
- `src/experience/DomPanelTexture.ts`: 실시간 코드 UI의 CanvasTexture
- `src/experience/cardboardLogic.ts`: 방향 변환·dwell·VR 표시 설정
- `src/experience/startLab.ts`: 이전 main.ts 조립을 보존한 실험 UI 진입점
- `src/components/{dom.ts,jsx.d.ts,designSystem.ts}`: native TSX·공통 컴포넌트
- `src/data/demo.ts`, `src/state/{types.ts,ServiceStore.ts}`
- `src/services/LocalDemoRepository.ts`, `src/routing/ServiceRouter.ts`
- `src/worlds/my-room/config.ts`
- `src/ui/ServiceScreens.ts`, `src/ui/service.css`
- `src/ui/figma/Frame1144_{700,715,750,742,764,552,472,494,407,450,635,574,618}.tsx`, `index.ts`, `generated.css`

## 새 자산·검사

- `public/assets/figma/`: 원본 SVG/PNG 53개 (약 8.6MB 전체), 임시 외부 URL 없음
- `public/assets/fonts/`: Pretendard woff2 3개(약 2.3MB)와 OFL
- `tests/design-reference/reference-*.png`: 원본 테스트 참조 13장. 런타임 UI로 사용하지 않음
- `tests/service.test.ts`, `tests/e2e/service.spec.ts`
- `scripts/import-figma.mjs`: MCP 감사 자료에서 코드/정적 CSS를 가져오는 개발 유틸. 실행 입력은 `.figma-audit/`이며 일반 개발/빌드에는 필요 없음
- `scripts/compare-figma.mjs`: Chromium Canvas 기반 원본/구현 비교 이미지·수치

## 수정한 기존 파일

- `src/main.ts`: 기본 서비스와 `?lab=1` 분기
- `src/engine/core/Engine.ts`: frame Signal·presenter·desktop 허용 경계, 해제 추가
- `tests/e2e/worlds.spec.ts`: 기존 실험 UI 경로만 `?lab=1`로 지정
- `tests/e2e/production.spec.ts`: 기존 production 경로 보존 및 서비스 온보딩 검사 추가
- `tsconfig.json`, `eslint.config.js`: native TSX factory와 해당 lint 규칙
- `package.json`, `package-lock.json`: v0.4.0과 비교 스크립트. 새 npm 라이브러리 없음
- `index.html`, `.gitignore`
- `README.md`, `docs/{architecture,implementation-status,progress,adding-worlds,blender-workflow,testing,next-steps}.md`

## 새 문서

`docs/{design-audit,service-architecture,cardboard-testing,changes-v0.4}.md`

## 유지한 기존 동작

WorldManager/ModelLoader/PlayerController/CollisionSystem/InteractionSystem/XRManager/registry의 역할을 유지했습니다. A/B와 GLB fixture 및 기존 55개 단위 테스트를 삭제하지 않았습니다. Engine은 서비스·Figma·월드별 ID를 import하지 않습니다. 기존 월드 교체·실패 복구·AABB 충돌·XR 입력/텔레포트·공식 VRButton과 DEV/e2e 진단 분리를 유지합니다.

실제 결과는 [progress.md](progress.md)를 확인하세요.
