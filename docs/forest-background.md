# 창밖 로우폴리 숲 배경

2026-11-08. 첨부 화면의 둥근 활엽수·일부 침엽수·낮은 바위·올리브색 지면과 옅은 하늘을 현재 실내 낚시터의 창밖에 적용했습니다. 참고 이미지의 목공방이나 UI는 복제하지 않았습니다.

## 적용 범위

- `forestPalette.ts`: 숲 전용 8색. Leather #5E3721 / Fall Leaves #8D5C2F / Mustard #C5953E / Trail Dust #C8B38B / Field Notes #F4EEE6 / Pine Dew #BFBFA2 / Moss Pillow #7E7639 / PNW Breeze #443B1C. 하늘·지면·나무·관목·바위에만 사용합니다. 하늘과 자연스러운 색 차이는 이 팔레트의 혼합색입니다.
- `forest.ts`: 둥근 다면체 수관을 가진 활엽수 54그루, 후방 침엽수 12그루, 낮은 관목 16개와 바위 32개를 네 방향에 배치했습니다. 모든 요소는 실제 3D이며, 이동과 시점 회전 시 시차가 생깁니다. 난수 배치는 고정되어 입장 때마다 바뀌지 않습니다.
- 기존 원뿔형 나무 44그루와 외부 지면을 교체하고 월드의 배경색만 숲의 옅은 하늘색으로 변경했습니다. 반구광·햇빛·펜던트의 색과 세기, 실내 구조·재질·팔레트·카메라·충돌·UI·이동·낚시는 유지했습니다.
- 지면은 네 구역으로 나누어 건물 아래 16×12m를 실제로 비웠습니다. 새 외부 지면이나 바닥 그림자가 수조 내부를 가로지르지 않습니다.
- 나무·바위는 인스턴스 메시 4개로 묶고, 지면 1개와 부드러운 지면 그림자 1개를 추가해 숲 자체는 일반 장면 패스당 6회 그립니다. 별도 반사/그림자 렌더 타깃이나 대형 텍스처를 추가하지 않습니다.
- 실내 햇빛이 바뀌지 않도록 외부 수목은 기존 실내 그림자 맵에 넣지 않았습니다. 지형에 맞춘 정적 지면 그림자를 사용합니다. 새 자원은 월드별로 소유하며 geometry 해제 시 인스턴스 버퍼도 정리합니다. 기존 수면 캡처에는 실제 숲이 반영됩니다.

## 검증

`npm run check`: 18개 파일 / 98개 단위 검사, 린트·타입·GLB 검사·빌드 통과. 숲의 모든 인스턴스가 건물을 침범하지 않는지, 건물/수조 아래 지면과 그림자가 없는지, 정적 병합 후 인스턴스를 보존하는지, 서로 다른 월드의 자원과 해제를 분리하는지 검사했습니다.

Chromium 158 / Apple M4 / ANGLE Metal: 창가 양쪽 시점·WASD 시차, 기존 물 품질과 낚시/이동 회귀 3개를 통과했습니다. 가까운 나무를 모두 활엽수로 다듬은 뒤 숲 검사를 다시 통과했습니다. 현재 실행 중인 5174 서버에서도 팔레트 응답·양쪽 창·실내 전체·기존 탭 전체 갱신 검사 1개를 통과하고 캡처를 직접 확인했습니다. Safari와 실제 VR 헤드셋은 미검증입니다.

`style.ts`, `water.ts`, `waterConfig.ts`, `waterShaders.ts`, `ClearWater.ts`, `lighting.ts`, `layout.ts`, `state.ts`, `runtime.ts`는 수정 전후 SHA-256 해시가 같습니다. 팔레트 변경이 실내나 수조로 퍼지지 않았음을 확인했습니다.

[실행 서버 동쪽 창](screenshots/forest-background/forest-live-east.png) · [서쪽 창](screenshots/forest-background/forest-live-west.png) · [실내 전체](screenshots/forest-background/forest-live-room.png) · [이동 후 시차](screenshots/forest-background/forest-east-parallax.png) · [실서버 검사 기록](forest-background-live-browser.json)
