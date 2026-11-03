# VR Interface

> Three.js 전환은 `main` 브랜치에서 단계적으로 진행합니다. 전체 계획은 [THREE_REFACTOR_PLAN.md](./THREE_REFACTOR_PLAN.md)를 참고하세요.

Figma의 `UI 인터페이스` 디자인을 바탕으로 만든 정적 웹앱입니다. 별도 빌드나 패키지 설치가 필요하지 않습니다.

1단계 리팩터링에서는 기존 UI와 화면 전환을 유지한 채 배경 렌더러를 Three.js WebGL로 교체했습니다. 현재는 전환 검증용 단일 실내 공간을 렌더링하며, 모드별 공간과 iPhone 양안·센서 처리는 다음 단계에서 순차적으로 이전합니다.

Three.js와 애드온은 공식 설치 가이드 방식의 import map으로 같은 버전(`0.187.0`)을 사용합니다. `three-world.js`에는 향후 Blender GLB를 불러오기 위한 `GLTFLoader`와 `loadGLB()` 진입점이 포함되어 있습니다.

MODE 01은 설정 화면의 `ENTER`로 월드에 진입할 때 `assets/models/fishing_forest.glb`를 불러옵니다. 홈과 설정 화면에서는 이 낚시터 GLB를 로드하지 않습니다.

홈의 모드 선택 화면과 각 모드의 설정 화면은 `assets/models/room.glb`를 공통 배경 공간으로 사용합니다.

GitHub Pages는 항상 `https://mango040730.github.io/XR/` 한 주소로 제공됩니다. Pages 배포가 완료되면 `.github/workflows/cleanup-pages-deployments.yml`이 이전 배포 기록을 삭제하고 최신 기록 하나만 유지합니다.

## 실행

```bash
python3 -m http.server 8080
```

브라우저에서 `http://localhost:8080`을 엽니다. 아이폰에서는 같은 Wi-Fi의 Mac IP로 접속한 뒤 가로 모드에서 화면을 두 번 탭하세요.

## 조작

- 키보드 `W`/`A`/`S`/`D` 또는 방향키: 3D 공간 이동
- 배경 드래그 또는 `Q`/`E`: 시점 회전
- 키보드 `R`: 시작 위치로 복귀
- iPhone 가로 모드: 좌측 `MOVE`, 우측 `LOOK` 터치 컨트롤
- 모드 카드 또는 `ENTER` 버튼: 환경 설정으로 이동
- 환경 설정의 `ENTER` 버튼: 선택한 VR 장면 입장
- 하단 하트 버튼: 별점 리뷰 열기
- 화면 두 번 탭: 좌우 눈 화면 + 전체화면 시도
- 키보드 `1`/`2`/`3`: 장면 이동
- 키보드 `V`: VR 보기 전환
- `Esc` 또는 `Backspace`: 홈으로 복귀
