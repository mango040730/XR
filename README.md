# 공간 VR

배포 주소: https://mango040730.github.io/XR/

`공간.glb`를 원래 크기와 재질로 불러오는 UI 없는 WebXR 공간입니다.
화면에는 3D 캔버스만 표시됩니다. 원본은 `public/models/space.glb`에 보존했습니다.

## 실행

```sh
npm install
npm run dev
```

배포용 빌드: `npm run build` (`dist/`).

검사: `npm run check`. GitHub의 main 브랜치에 업로드하면 Actions에서 검사·빌드 후 GitHub Pages로 자동 배포합니다. Pages 빌드는 `VITE_BASE_PATH=/XR/`로 실행합니다.

## 조작

- PC: 화면 클릭 후 마우스로 둘러보기, WASD/방향키 이동, Shift 빠르게 걷기, Esc 마우스 해제, R 시작 위치.
- 모바일: 한 손가락 드래그로 둘러보기, 두 손가락을 대고 있으면 앞으로 이동.
- WebXR 지원 헤드셋: HTTPS 주소를 헤드셋 브라우저에서 열고 공간을 클릭하면 VR 진입. 키보드가 있다면 V로도 진입.
- VR: 왼쪽 스틱 이동, 오른쪽 스틱 30도 회전, 컨트롤러로 바닥을 가리키고 트리거를 눌렀다 놓으면 15m 이내 보이는 바닥으로 이동. 종료는 헤드셋의 시스템 메뉴.

브라우저의 VR 접근 권한창은 브라우저가 표시합니다. 별도의 VR 버튼이나 HUD는 없습니다.
WebXR은 HTTPS 또는 localhost에서 사용할 수 있습니다. 헤드셋을 사용하지 않는 PC·모바일에서는 일반 3D 탐색으로 동작합니다.
실제 헤드셋에서의 입체 표시와 컨트롤러 동작은 기기 검증이 필요합니다.
