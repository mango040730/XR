# PNW Breeze · Field Notes · Trail Dust

2026-11-08. 사용자가 새로 지정한 3색을 `style.ts`의 `interiorPalette`로 정의하고 기존 틸·월넛 인테리어 팔레트를 교체했습니다.

| 색상 | HEX | 적용 |
| --- | --- | --- |
| PNW Breeze | #443B1C | 기둥·보·문·창틀·의자 골조·어두운 부품 |
| Field Notes | #F4EEE6 | 벽·천장·수조 벽과 테두리·줄눈·밝은 표면 |
| Trail Dust | #C8B38B | 통로 타일·밝은 목재·선반·의자 판재 |

인물·외부 수목·물고기의 보조색과 앰버 조명은 유지했습니다. 물 셰이더·물결·굴절/반사 설정·낚시 상태·카메라·이동·공간 치수는 수정하지 않았습니다.

같은 색의 타일과 목재가 구분되도록 `vintageMaterial`과 `Kit.box`에서 재질 역할을 선택할 수 있게 했습니다. Trail Dust 타일은 거친 석재, 선반은 나뭇결이 있는 목재로 표시됩니다. Field Notes 천장과 벽은 도장 표면으로 처리해 목재 셰이더가 잘못 적용되지 않도록 했습니다. 기존 AO·접촉 음영·햇빛과 펜던트 조명은 유지합니다.

`npm run check` 통과: 17개 파일 / 95개 단위 검사, 린트·타입·GLB 검사·프로덕션 빌드. 같은 색으로 만든 목재/타일의 서로 다른 재질도 검사했습니다. 현재 실행 중인 5174 서버에 Chromium / Apple M4 / ANGLE Metal로 직접 접속해 새 HEX 응답, 입구·전체·반대편·모바일 렌더링, 기존 탭의 전체 갱신을 확인했습니다. 실서버 브라우저 검사 1개 통과. HTML 내용은 그대로 두고 수정 시각만 갱신해 연결된 개발 탭에 전체 페이지 갱신을 알렸습니다. Safari와 실제 헤드셋은 미검증입니다.

[전체 화면](screenshots/pnw-palette/pnw-live-overview.png) · [반대편](screenshots/pnw-palette/pnw-live-opposite.png) · [모바일](screenshots/pnw-palette/pnw-live-mobile.png) · [브라우저 기록](pnw-palette-browser.json)
