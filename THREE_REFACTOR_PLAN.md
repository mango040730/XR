# Three.js 리팩터링 계획

## 현재 구조 분석

### 유지할 부분

- `state` 기반 화면 상태와 MODE 01–03 선택
- `homeScene`, `settingsScene`, `worldHud`, `reviewScene`의 UI 마크업
- 버튼 이벤트와 화면 전환을 담당하는 `bindInteractions`
- 키보드·터치 이동 입력과 `worldPlayer` 상태
- 리뷰 별점, 토스트, 전체화면 진입, 반응형 UI
- 좌우 `eye` 컨테이너를 사용하는 기존 VR 화면 골격

### 교체하거나 분리할 부분

- `startLegacyCanvasWorld` 내부의 수동 원근 투영과 Canvas 2D 도형 렌더링
- 화면별 Canvas 렌더러 생성·해제 생명주기
- 카메라 회전을 단순 `gamma`/`beta` 값으로 계산하는 방향 센서 처리
- 현재 DOM 복제로 구현된 양안 화면을 Three.js 카메라 기반 양안 렌더링으로 전환
- 모드별 절차적 공간을 Three.js Scene 또는 GLB 에셋으로 구성

## 단계별 구현

### 1단계 — 단일 Three.js 공간 렌더링 (현재 단계)

- 기존 UI와 화면 전환 유지
- 기존 Canvas 요소에 Three.js `WebGLRenderer` 연결
- 기존 `worldPlayer` 이동·시점 값을 Three.js 카메라에 연결
- 렌더러 생성 및 화면 전환 시 GPU 리소스 해제
- `GLTFLoader`와 전용 모델 루트 준비
- 하나의 검증용 실내 공간을 모든 화면 배경으로 렌더링
- 기존 Canvas 2D 렌더러 제거

### 2단계 — iPhone 15 센서와 양안 렌더링

- 사용자 동작에서 `DeviceOrientationEvent.requestPermission()` 요청
- 기기 쿼터니언과 화면 방향을 조합한 카메라 자세 계산
- 왼쪽·오른쪽 눈의 IPD 오프셋과 투영 행렬 적용
- Safari 전체화면 제한과 가로 화면 전환 대응
- 센서 미허용 시 터치 LOOK 컨트롤 유지

### 3단계 — 모드별 Three.js 공간 복원

- MODE 01 숲속 낚시터
- MODE 02 2–4인 원형 테이블 비즈 공방
- MODE 03 방탈출 공간
- 모드별 충돌 영역과 시작 위치 분리

### 4단계 — Blender GLB 파이프라인

- `assets/models/` 경로와 모델 매니페스트 정의
- GLB 비동기 로딩, 로딩 상태 UI, 오류 처리
- 애니메이션 믹서와 모델별 변환값 적용
- Draco/KTX2 압축 여부 결정 및 iPhone 성능 측정

### 5단계 — 검증과 최적화

- iPhone 15 Safari 실기기 테스트
- 양안 모드 프레임 속도와 메모리 측정
- 렌더 해상도, 조명, 텍스처 크기 조정
- iPhone Safari 오류 처리와 WebGL 지원 안내 추가

## 1단계 완료 조건

- 홈·설정·모드 선택·월드·리뷰 화면이 기존대로 전환된다.
- 배경 Canvas가 Three.js WebGL 장면을 표시한다.
- 키보드·터치 이동 및 드래그 시점 조작이 Three.js 카메라에 반영된다.
- 화면 재렌더링 시 이전 WebGL 렌더러가 정리된다.
- 향후 GLB 파일을 `loadGLB()`로 추가할 수 있다.
