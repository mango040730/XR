# 개발 진행 및 검증 기록

## 방문 이동·문 앞 복귀·연결 준비 안내 제거 — 2026-11-11

모드 선택 시 현재 마이룸에서 실제 방문으로 걸어가 문을 열고 문턱을 지나 콘텐츠 공간으로 전환합니다. 기존 바닥/가구 충돌을 사용하는 경로 탐색으로 책장·플랫폼·좌석을 피하며, 원본 GLB의 문짝·장식·손잡이를 힌지에 유지했습니다. 움직이는 문만 정적 배칭에서 제외하고 월드별 자원 소유·해제를 유지합니다. 전환 중 이동 입력과 소셜 위치 전송을 잠시 멈추며 취소/브라우저 뒤로 가기는 기존 root·시점·착석 정책을 복구합니다. 늦은 로딩 완료는 최신 요청을 덮지 않습니다. 새 백엔드·계정·음성 기능은 추가하지 않았습니다.

첫 접속은 계속 책장 앞 주인용 의자에서 모드 카드가 바로 보입니다. 콘텐츠 종료 후 홈/약속으로 돌아오면 방문 앞 [2.23,.02,-2.85], yaw π에서 서서 방 안을 바라봅니다. 기존 서버 카탈로그의 마이룸 진입 위치도 같은 방문 앞 위치를 사용합니다. 평가는 콘텐츠 종료 순간의 화면을 유지합니다. 모션 감소 설정과 Cardboard/XR에서는 강제 카메라 이동을 생략하고 짧은 전환을 사용합니다. ‘입장 전’과 ‘실시간 연결을 준비 중입니다.’는 모든 화면에서 제거했고 공개 서버 미설정 시 빈 패널도 표시하지 않습니다. 기존 실제 연결용 닉네임/입장 기능은 유지합니다.

검사: 최종 `npm run check` 통과(린트·타입·Node 29개 파일/152개·원본 GLB/자산 검사·프론트/서버 빌드·프로덕션 진단 분리). 실제 Chromium/Apple M4의 첫 회귀 15개 중14개가 통과했고, 나머지1개는 콘텐츠 root 생성 직후 전환이 끝나기 전에 M을 누르던 검사 타이밍을 화면 전환 완료 기준으로 수정해 재검사했습니다. 방문 이동/문 열림/문 앞 복귀·취소·기존 단차·레거시 PC/터치/충돌·프로덕션4개를 포함한 재검사11개가 모두 통과했습니다. 최종 보완 후 방문 전환·취소/브라우저 뒤로 가기·모션 감소2개도 재검사해 통과했습니다. [최종 방문 검사](screenshots/door-journey-20261111/final-door-summary.json). 기존 소셜4개도 통과해 자기 아바타 숨김·두 사용자 이동/좌석/채팅·실패 복구/재접속·WebRTC 거리 감쇠/음소거를 확인했습니다. [실제 문 열림](screenshots/door-journey-20261111/door-opening.png) · [문 앞 복귀 시점](screenshots/door-journey-20261111/door-return-looking-in.png) · [첫 회귀 기록](screenshots/door-journey-20261111/initial-e2e-summary.json) · [재검사](screenshots/door-journey-20261111/retest-summary.json) · [소셜 검사](screenshots/door-journey-20261111/social-summary.json).

실행: 사용자의 재실행 요청에 따라 로컬 Vite를 http://127.0.0.1:5173/ 에서 다시 시작했고, 3001 실시간 서버도 현재 빌드로 갱신했습니다. 이 단락은 아래 이전 단계의 ‘콘텐츠 후에도 의자로 복귀’ 정책을 대체합니다. 실제 VR 기기·휴대폰 센서/멀미는 미검증입니다. 다음 단계는 같은 변경의 Pages 게시와 공개 사이트 확인입니다. 기존 번들 크기 경고와 공개 Socket.IO 서버 미설정 제한은 유지됩니다.

---

## 주인용 의자에서 시작하는 기본 홈 — 2026-11-11

첨부 이미지의 책장 앞 `Signature owner lounge chair`를 초기 착석 위치로 연결했습니다. 일반 앱에서 마이룸이 준비되면 [1.65,.02,2.05], 화면 yaw .5rad, 앉은 눈높이1.12m로 시작하며 자기 아바타는 기존처럼 보이지 않습니다. GLB의 +Z 가구 방향과 -Z 카메라 방향을 구분했습니다. 초기 화면의 모드 카드3개는 즉시 표시하고 `#my-room`도 `#modes` 홈으로 연결합니다. 홈의 M/Esc는 카드를 닫지 않으며, 마이룸 복귀와 로딩 취소도 홈으로 이동합니다. 홈 버튼은 이미 마이룸에 있을 때 모델을 다시 로드하지 않고 의자 시점으로 복귀합니다.

공통 PlayerController의 선택적 이동 종료 위치로, 화면용 착석 상태에서 WASD·방향키/터치 이동 의도가 들어오면 의자 앞 검증된 위치로 일어난 뒤 이동하도록 했습니다. 이동하지 않을 때는 착석을 유지하고 바라보는 방향도 유지합니다. 서버가 관리하는 기존 좌석은 이 옵션을 사용하지 않아 이동 키로 해제되지 않습니다. 좌석 예약·계정·백엔드 기능은 추가하지 않았고 기존 소셜 컨트롤의 홈 표시 경로만 새 홈 별칭에 맞췄습니다. 엔진의 월드 ID 분기·새 캐시·새 UI는 추가하지 않았습니다.

검사 진행: typecheck·build와 착석/이동·차단된 일어서기 위치·서버 좌석 유지·홈 경로 단위 검사가 통과했습니다. 실제 Chromium/Apple M4에서 첫 URL과 `#my-room` 진입·착석 위치/낮은 눈높이·즉시 모드 카드·M/Esc 유지·첫 이동으로 일어서기·홈/콘텐츠/평가/재진입·모바일·기존 플랫폼 단차를 확인했습니다. 초기 관련16개 중15개 통과 후 기존 콘텐츠 검사에 남은 잘못된 모드 카드 개수 조건을 복구하여 해당1개를 재검사했고 통과했습니다. [첫 홈](screenshots/seated-home-20261111/seated-home-desktop.png) · [모바일 홈](screenshots/seated-home-20261111/seated-home-mobile.png) · [관련 검사](screenshots/seated-home-20261111/initial-e2e-summary.json) · [재검사](screenshots/seated-home-20261111/retest-summary.json). 기존 소셜/음성4개도 모두 통과해 첫 접속 눈높이·자기 모델 숨김·두 사용자 이동/좌석 권한·채팅/퇴장·방 격리/실패 복귀/재접속과 WebRTC 거리/음소거를 확인했습니다. 최종 npm run check도 통과했습니다(린트·Node28개 파일/149개 검사·자산 검사·프론트/서버 빌드·프로덕션 분리). [소셜 회귀](screenshots/seated-home-20261111/social-summary.json). 코드 커밋 `c0543939c2131f49e5bf46408a8078737f43f649`를 반영한 [Pages 실행 43019229890](https://github.com/mango040730/XR/actions/runs/43019229890)의 Linux check·빌드·게시가 모두 success로 완료됐습니다. 실제 공개 사이트와 로컬5173에서 `#my-room`의 홈 별칭·첫 착석 시점/즉시 카드 표시·M/Esc 유지·이동 입력/일어서기·홈 재중앙 정렬·모바일 홈·콘텐츠/평가 후 홈 복귀를 확인했습니다. 페이지/네트워크 오류0개이며 프로덕션의 진단 전역도 없습니다. [공개 홈](screenshots/seated-home-20261111/live-home-desktop.png) · [공개 모바일](screenshots/seated-home-20261111/live-home-mobile.png) · [공개 확인](screenshots/seated-home-20261111/live-verification.json) · [배포 기록](screenshots/seated-home-20261111/github-deployment.json). 실제 VR 기기는 미검증입니다.

---

## 볼링장 과도한 밝기와 전등 번짐 완화 — 2026-11-11

첨부 화면에서 바닥·테이블이 희게 날아가는 문제를 볼링장 좌석 시점에서 재현했습니다. 볼링장 전용 preset의 노출(1.12→.95), 좌석 주광(220→90)/면광원(1.55→.85), 레인/환경/패브릭 보조광을 낮췄습니다. 전등 발광을2.5→1.15, bloom 강도를.105→.035로 줄이고 적용 문턱을2.4로 높여 바닥의 번짐을 억제했습니다. 실제 GLB·색상·그림자·이동/충돌·다른 공간은 변경하지 않습니다.

typecheck와 build가 통과했으며 실제 Chromium/Apple M4에서 입장/좌석 화면을 전후 비교했습니다. 하단 바닥 영역(화면 X12~88%, Y72~97%)의 min(RGB)≥242 픽셀 비율이 수정 전30.97%에서 수정 후0%로 줄었고, 평균 표시 픽셀 밝기는229.7→177.9로 바뀌었습니다. 이는 해당 시점/화면 영역의 지표이며 전체 공간의 물리적 조도를 뜻하지 않습니다. 과도한 밝기를 재현하는 새 브라우저 검사와 실제 입장·키보드 이동·종료 순간 평가·재입장 검사2개가 모두 통과했습니다. [수정 전](screenshots/bowling-lighting-20261111/before-seating.png) · [수정 후](screenshots/bowling-lighting-20261111/after-seating.png) · [입장 후](screenshots/bowling-lighting-20261111/after-entry.png) · [이전 측정](screenshots/bowling-lighting-20261111/before-measurement.json) · [변경 후 측정](screenshots/bowling-lighting-20261111/after-measurement.json) · [브라우저 회귀](screenshots/bowling-lighting-20261111/e2e-summary.json). 최종 npm run check도 통과했습니다(린트·타입 검사·Node28개 파일/146개 검사·GLB 검사·프론트/서버 빌드·프로덕션 진단 분리). 코드 커밋 `e53c74e9e95bfff7a382c9a7f421590a34712ae4`를 반영한 [Pages 실행 43016036860](https://github.com/mango040730/XR/actions/runs/43016036860)의 Linux check·빌드·게시도 모두 success로 완료됐습니다. 실제 공개 사이트에서 v5 번들 적용·좌석 시점의 바닥 번짐 완화·키보드/드래그·평가 화면을 확인했고 페이지/네트워크 오류는0개입니다. 공개 하단 바닥 ROI의 밝은 픽셀 비율도0%였으며, 현재 로컬5173에서도 같은 흐름과 조명을 확인했습니다. [공개 좌석](screenshots/bowling-lighting-20261111/live-seating.png) · [공개 입장](screenshots/bowling-lighting-20261111/live-entry.png) · [공개 검사](screenshots/bowling-lighting-20261111/live-verification.json) · [배포 기록](screenshots/bowling-lighting-20261111/github-deployment.json). 실제 VR 기기는 미검증입니다.

---

## 협력 모드에 첨부 볼링장 공간 연결 — 2026-11-11

`볼링장 디자인.zip`의 실제 `retro_bowling_alley.glb`를 `public/assets/models/bowling/`에 배치하고 새 `bowling` 월드를 registry에 등록했습니다. `협력하며 즐겨요`를 누르면 기존 GLB 테스트 방 대신 4레인 볼링장으로 진입합니다. 기존 마이룸·목공방·낚시터는 유지합니다. 새 게임·투구·점수·UI·백엔드 기능은 추가하지 않았습니다.

원본 4개 레인·40개 핀·14개 공·8개 목재 트러스·27개 펜던트와 재질/환경광/면광원/그림자/bloom·천장 인스턴싱을 현재 렌더러와 월드 수명에 연결했습니다. 원본 좌표/크기·내장 이미지·UV를 유지하고, r180 vendor 대신 설치된 r187과 기존 1인칭 입력/충돌을 사용합니다. 시작 [0,0,-1], 눈높이1.65m, 클릭 없는 WASD/방향키·드래그 시점 조절을 유지합니다. 원본의 이동 영역 4개·충돌83개를 변환하고 공유 경계 안쪽에 연결 바닥을 만들어 통로 이동을 보장했습니다. 종료 시에는 볼링장 그 순간 모습을 평가 화면에 유지합니다. 기존 서버의 방 카탈로그도 새 월드를 포함하도록 내보냅니다. [원본 자산·통합 경계](../src/worlds/bowling/README.md).

검사 진행: typecheck·build와 실제 GLB 해시/GLTFLoader geometry/개체 수/바닥 검사 통과. Khronos 오류0·경고0. 신규 단위 검사 2개로 모드/평가 연결·진입 위치·가구/벽 충돌·인접 바닥 이동·레인 제외를 확인했습니다. 실제 Chromium/Apple M4의 관련 브라우저 15개 검사가 모두 통과해 볼링장 GLB 200·진입·실제 키보드로 대기실/옆 통로 경계 이동·평가 root/시점 유지·복귀/재진입·실패/취소·모바일·기존 1차 픽스 흐름·프로덕션 진단 분리를 확인했습니다. [브라우저 기록](screenshots/bowling-20261111/e2e-summary.json) · [입장 화면](screenshots/bowling-20261111/bowling-entry.png) · [통로 이동](screenshots/bowling-20261111/bowling-aisle.png) · [평가](screenshots/bowling-20261111/bowling-rating.png). 최종 npm run check도 통과했습니다(린트·Node 28개 파일/146개 검사·자산 검증·프론트/서버 빌드·프로덕션 분리). 기존 PC/모바일 서비스 진입·이동·평가 흐름 4개도 추가 확인하여 관련 브라우저 총19개가 통과했습니다. [추가 회귀](screenshots/bowling-20261111/legacy-e2e-summary.json). 코드 커밋 `9fedeb0ecd39360aaafe9840d383eda3e696032b`를 main에 반영했고 [Pages 실행 43013501990](https://github.com/mango040730/XR/actions/runs/43013501990)의 Linux check·빌드·게시가 모두 success로 완료됐습니다. 실제 공개 https://mango040730.github.io/XR/ 에서 협력 모드 클릭 → 볼링장 GLB 200·실제 WebGL·키보드/드래그·포인터 잠금 없음·볼링장 종료 순간 평가를 확인했습니다. 페이지/네트워크/HTTP 오류 0개이며 ZIP의 개발 진단/전역 장면 객체와 기존 E2E 진단 전역도 공개되지 않습니다. 로컬 5173에서도 같은 흐름을 확인하고 기존 3001 서버를 새 7개 공간 카탈로그로 갱신했습니다. [공개 볼링장](screenshots/bowling-20261111/live-bowling-entry.png) · [공개 평가](screenshots/bowling-20261111/live-bowling-rating.png) · [공개 검증](screenshots/bowling-20261111/live-verification.json) · [배포 기록](screenshots/bowling-20261111/github-deployment.json). 실제 VR 기기는 미검증이며 공개 Socket.IO 서버 미설정 제한은 기존과 같습니다.

---

## 즉시 이동·종료 순간 평가 배경·첨부 원본 목공방 적용 — 2026-11-11

공간 클릭/Pointer Lock 진입·해제 단계를 제거했습니다. WASD/방향키는 공간 로딩 후 바로 공통 PlayerController와 충돌을 사용하며, 마우스 드래그만 시점을 바꿉니다. 커서는 항상 자유롭고 UI 버튼은 즉시 클릭할 수 있습니다. 드래그 뒤 클릭으로 오브젝트가 선택되지 않도록 처리하고, 입력창 포커스·blur·취소·월드 전환 시 입력을 정리합니다. 모바일 제스처·Cardboard·기존 XR 입력 경계는 유지합니다.

평가 시 마이룸으로 전환하던 정책을 바꿔 종료한 콘텐츠의 root를 유지합니다. 종료 직전 실제 카메라/재질/빛/아바타가 렌더링된 PNG를 세션 동안만 보관하고 평가 배경으로 표시합니다. 배경 이미지 아래의 이동·콘텐츠 업데이트를 멈추고 별점 선택 때 다시 찍지 않습니다. 다음 약속 화면에서 마이룸으로 이동합니다. VR/Cardboard에서는 2D 이미지를 눈앞에 고정하지 않고 콘텐츠 세계를 멈춘 채 머리 추적과 평가 패널 입력을 유지합니다. 새로고침 후 종료 직전 이미지 복원은 지원하지 않으며, 저장된 종료 세션의 콘텐츠 진입 위치를 표시합니다.

최신 `목공방 디자인.zip`은 이전 같은 이름 ZIP과 다르며, 실제 GLB `forest-atelier-original.glb` 11.73MB·43 배치·108,934 삼각형·43 재질·내장 이미지 19개와 원본 조명 21개를 포함합니다. 이 GLB를 실제 solo 월드로 사용합니다. `useGLTF`/scene.clone(true), 월드별 geometry/material/texture 복제, extras의 원본 노멀/투명도/그림자 flag 복원, 원본 좌표와 미터 단위를 유지합니다. 숲을 포함한 bounds와 실제 실내 바닥 Y≈0을 별도로 검사합니다. 로딩 진행/실제 파일명·HTTP 오류와 재시도, 실패 시 이전 월드 보존을 연결했습니다. 이전 미완료 `목공방.glb`와 분석 파일은 로컬에 보존합니다.

원본 high 조명·ACES 노출1.12·77도 시야각·안개·N8AO·약한 bloom·구운 접촉 그림자·먼지35개를 기존 renderer/prepare/activate 수명에 연결했습니다. N8AO 2.0.1과 postprocessing 6.39.6의 공식 호환 범위를 확인한 뒤 정확한 버전으로 설치했습니다. 실제 브라우저에서 발견한 r187 MRT getter 호환 문제를 해당 N8AO 인스턴스에 보정했고 중복 gamma 변환과 후처리 자원 누수를 방지했습니다. 삭제된 PCFSoftShadowMap은 현재 PCFShadowMap을 사용하며 bloom도 기존 Three composer로 연결합니다. 좁은 화면/저품질/소프트웨어 GPU/XR의 직접 렌더링 경로에서는 AO·bloom을 생략합니다. [자산 출처·정확한 설정과 차이](../src/worlds/woodworking/README.md).

검사 진행: typecheck·build·최종 check 통과(린트, Node 27개 파일/144개 검사, 기존 GLB/아바타/마이룸 및 새 목공방 실제 자산 검사, 프론트/서버 빌드, 프로덕션 진단 분리). 새 GLB의 Khronos 오류는 0개이며 원본의 런타임 tangent 생성 경고 11개는 유지하고 검사에서 명시적으로 구분합니다. 실제 Chromium/Apple M4 전체 57개 브라우저 회귀 중 56개 통과 후, 실패 시 마이룸을 재생성하던 화면 정책을 수정하고 관련 14개를 재검사해 모두 통과했습니다. 클릭 없는 실제 WASD/방향키·드래그·가구/작업대 충돌·평가 root/시점/PNG 유지·별점 변경·약속 전환·원본 GLB 재진입·404 표시/기존 root 보존/재시도·터치·Cardboard·프로덕션 진단 분리를 확인했습니다. 소셜 4개도 모두 통과해 독립 브라우저 간 이동/아바타/좌석/채팅/퇴장/방 격리/재접속과 테스트 마이크의 실제 WebRTC 수신/거리 감쇠/음소거/정리를 확인했습니다. [전체 회귀](screenshots/atelier-unlocked-20261111/full-e2e-summary.json) · [관련 재검사](screenshots/atelier-unlocked-20261111/retest-summary.json) · [소셜/음성](screenshots/atelier-unlocked-20261111/social-summary.json) · [목공방](screenshots/atelier-unlocked-20261111/new-atelier-live.png) · [종료 순간 평가](screenshots/atelier-unlocked-20261111/new-atelier-frozen-rating.png). 실제 VR 기기와 휴대폰 센서/성능은 미검증입니다. Pages의 공개 Socket.IO 서버 미설정 제한은 기존과 같습니다. 현재 로컬 5173에서도 일반 모드의 실제 목공방 GLB 200·클릭 없는 이동/드래그·목공방과 낚시터 각각의 종료 순간 평가 화면을 확인했고, 페이지/네트워크/HTTP 오류 및 프로덕션용 진단 노출은 없습니다. 코드 커밋 `a0c31031c00b23c85e83ea9fcb26539b24247a00`를 main에 반영했으며 [Pages 실행 43011468823](https://github.com/mango040730/XR/actions/runs/43011468823)의 빌드/check는 success로 완료됐습니다. 같은 실행의 Pages 게시도 success로 완료됐습니다. 실제 공개 https://mango040730.github.io/XR/ 에서 Chromium으로 새 목공방 GLB 200·클릭 없는 WASD/드래그·자유로운 커서·목공방과 낚시터 각각의 종료 순간 평가 배경·별점 선택 시 프레임 유지·약속 화면 복귀를 확인했습니다. 페이지/네트워크/HTTP 오류 0개, 불필요한 소켓 요청 0개, 프로덕션 진단 전역 부재를 확인했습니다. [공개 목공방](screenshots/atelier-unlocked-20261111/live-atelier-entry.png) · [이동 후 평가](screenshots/atelier-unlocked-20261111/live-atelier-rating.png) · [낚시터 평가](screenshots/atelier-unlocked-20261111/live-fishing-rating.png) · [공개 검증](screenshots/atelier-unlocked-20261111/live-verification.json) · [배포 결과](screenshots/atelier-unlocked-20261111/github-deployment.json) · [최종 코드 검사](screenshots/atelier-unlocked-20261111/check-summary.json).

---

## 마이룸 디자인 2.7.1 및 콘텐츠 외 화면 적용 — 2026-11-11

사용자의 최신 요청에 따라 `마이룸 디자인.zip`에 포함된 완성 `myroom-v2-2.7.1.glb`를 기본 마이룸으로 적용했습니다. 홈·모드 선택·평가·약속과 기타 비콘텐츠 화면은 새 마이룸을 사용하며, 콘텐츠 실행/일시정지/종료 확인은 낚시터·목공방·협력 월드를 사용합니다. 라우터의 화면 정책과 월드 요청을 연결하고 최신 요청 적용·로딩 중 이전 월드 보존·취소/실패 정리를 유지했습니다. 기존 Figma UI와 1인칭·본인 모델 숨김은 유지합니다.

GLB 메시 746개·가구 충돌 그룹 17개·프린트 PNG와 원본 트리플래너 표면 shader·따뜻한 실내등·PMREM 환경·한 번 구운 접촉 그림자·GTAO·정적 배칭을 연결했습니다. 카메라는 기존 엔진을 사용하며 원본 66/72/78도 화면 비율을 반영합니다. 바닥 0.02m와 팔각 플랫폼 0.18m에 맞춘 공통 충돌/작은 단차 및 해당 서버 검증을 연결하고 새 좌석 위치를 내보냅니다. 월드 ID별 엔진 분기와 전역 GPU 캐시는 추가하지 않았습니다. prepare 자원 해제 경계와 shader 텍스처 준비/해제를 추가해 환경 맵과 그림자를 월드 종료 시 정리합니다. [원본 및 통합 범위](../src/worlds/my-room/README.md).

검사 진행: 타입·린트·프론트/서버 빌드·프로덕션 진단 분리·Node 27개 파일/142개 검사 통과. 실제 마이룸 GLB의 Khronos validator는 오류 0/경고 0이며 실제 GLB geometry/extras와 충돌 manifest 동기화 검사도 통과했습니다. 실제 Chromium/Apple M4에서 GLB·표면 재질·화면 전환·WASD·가구 충돌·16cm 단차 오르내리기를 확인했습니다. 전체 브라우저 회귀는 55개 중 52개 통과 후 새 진입 각도와 로딩 대기를 반영한 Cardboard 3개를 포함해 관련 9개를 재실행하여 모두 통과했습니다. 총 55개 시나리오를 최종 확인했으며 실제 단차 왕복·66/78도 데스크톱/모바일 시야각·콘텐츠/평가/약속 배경 분리·프로덕션 진단 분리를 포함합니다. [재검사](screenshots/my-room-20261111/targeted-e2e-summary.json) · [단차 이동](screenshots/my-room-20261111/my-room-platform-step.png) · [모바일](screenshots/my-room-20261111/my-room-mobile.png). 소셜 회귀는 3/4개 통과 후 실제 화분 충돌에 막힌 음성 거리 검사 경로를 화분 옆으로 보정하여 해당 1개도 통과했습니다. 두 독립 브라우저의 실제 GLB 원격 표시·자기 모델 숨김·걷기/인사/착석·좌석 독점·채팅·방 이동·실패 후 복귀·재접속·테스트 마이크 WebRTC 수신/거리 감쇠/음소거/정리를 확인했습니다. 실제 사람 마이크 청음 검사는 아닙니다. [소셜 회귀](screenshots/my-room-20261111/social-full-summary.json) · [음성 재검사](screenshots/my-room-20261111/social-voice-retest.json). [마이룸 화면](screenshots/my-room-20261111/my-room-glb-entry.png) · [원본 화면](screenshots/my-room-20261111/source-welcome.png) · [평가 화면](screenshots/my-room-20261111/my-room-rating.png) · [GLB 검사](screenshots/my-room-20261111/glb-validator.json) · [전체 회귀 기록](screenshots/my-room-20261111/full-e2e-summary.json).

제한·다음 단계: 실제 VR 기기와 휴대폰 센서/성능은 미검증입니다. Pages의 공개 Socket.IO 서버 미설정 제한은 기존과 같습니다. 이전에 제공된 목공방 GLB는 파일 확보/분석 및 미완료 작업 파일을 보존하며, 이번 최신 요청에서 제외한 콘텐츠 공간은 변경하지 않습니다. 코드 커밋 `8cde1c3d893ca981d2439c5787603af71c30cd14`를 main에 반영했고 [Actions 43006385798](https://github.com/mango040730/XR/actions/runs/43006385798)의 Linux/Node 22 전체 check·Vite 빌드·Pages 게시가 모두 success로 완료됐습니다. 실제 공개 https://mango040730.github.io/XR/ 에서 Chromium으로 새 GLB 200·홈/모드/평가/약속 배경·실제 포인터 잠금/WASD·콘텐츠 실행/복귀·모바일 화면을 확인했습니다. 페이지/네트워크/HTTP 오류 0개, 불필요한 소켓 요청 0개, 프로덕션 진단 전역 부재를 확인했습니다. 로컬 3001 서버도 새 시작 좌표 [3.45,0.02,-1.2]를 쓰는지 확인했습니다. 콘텐츠 설정/자산 소스는 이번 커밋에서 변경하지 않았습니다. [공개 마이룸](screenshots/my-room-20261111/live-my-room.png) · [공개 평가](screenshots/my-room-20261111/live-rating.png) · [공개 약속](screenshots/my-room-20261111/live-appointment-place.png) · [공개 모바일](screenshots/my-room-20261111/live-my-room-mobile.png) · [공개 검사](screenshots/my-room-20261111/live-verification.json) · [배포 결과](screenshots/my-room-20261111/github-deployment.json).

---

## 수정 목공방 ZIP·GLB 통합 사전 분석 — 2026-11-10

`목공방 수정 디자인.zip`을 안전하게 풀고 world/player/network/store·의존성·진입점과 현재 엔진/아바타/음성 구조를 분석했습니다. ZIP의 새 GlbSpace는 useGLTF/scene.clone(true)를 사용하지만 기본 경로만 지정하며 **실제 목공방 GLB는 ZIP·Downloads·첨부 폴더·현재 프로젝트에서 발견되지 않았습니다**. ZIP의 main도 아직 절차적 Scene에 연결되어 있습니다. 실제 GLB 파일명/노드/bounds/바닥/진입 위치는 미확정이며 사용자에게 실제 파일 경로를 요청했습니다.

현재 앱과 배포는 유지합니다. 재질 보존 요구와 충돌하는 ZIP의 roughness/envMapIntensity 강제 보정, 기존 시스템과 중복되는 React Canvas/PointerLock/Rapier 플레이어·별도 네트워크 프로토콜, clone의 공유 자원 수명 문제를 확인했습니다. [상세 분석과 후속 작업](woodworking-glb-integration-audit.md). 아직 GLB 통합·브라우저·VR 검증을 완료하지 않았으며, 문서만 변경했으므로 앱 검사와 재배포는 실행하지 않았습니다. 다음 단계는 실제 목공방 GLB 확보입니다.

---

## 목공방 추가 및 모드별 공간 연결 — 2026-11-10

사용자 제공 `목공방 디자인.zip`의 작업대 2개·공구·수납 선반·아치창·숲·조명·목재 재질을 네이티브 Three.js 월드로 옮겼습니다. **혼자 활동해요 → 숲속 목공방**, **친목을 다져요 → 기존 실내 낚시터**로 연결했으며 협력 모드는 기존 GLB 공간을 유지합니다. 새 월드는 config와 registry로 등록하고 엔진의 월드 ID 분기를 추가하지 않았습니다.

기존 1인칭 카메라·자기 아바타 숨김·입력·PlayerController·MovementCollision·1차 픽스 UI와 최소 전환 버튼을 사용합니다. ZIP의 별도 React 플레이어·아바타·네트워크·음성·UI는 가져오지 않았고 의존성도 추가하지 않았습니다. 원본 충돌 배치로 벽·작업대·가구를 막고 중앙 통로를 걸을 수 있습니다. 정적 메시를 병합하고 생성 범위의 캐시와 월드별 자원 소유권을 지킵니다. 공통 렌더링 프로필에 시야각·안개·작성된 그림자 유지 설정을 추가해 전환 때 해당 월드의 설정을 적용/해제합니다.

검사: npm run typecheck, npm run build, npm run check 통과(린트·Node 26개 파일/136개·GLB/아바타 검사·프론트/서버 빌드·프로덕션 진단 분리). 실제 Chromium/Apple M4의 전체 브라우저 실행 52/53개 통과 후, 기존 낚시 좌석 테스트가 긴 관찰 간격 때문에 목표 좌석을 지나치던 문제를 30ms 관찰로 보정하고 해당 1개를 재검사해 통과했습니다. 총 53개 시나리오를 확인했습니다. 새 목공방의 포인터 잠금/WASD·작업대 충돌·친목 모드 낚시터 전환·시야각/안개 초기화·자원 해제·목공방 재진입을 실제 입력으로 검증했습니다. 기존 소셜 통합 4개도 통과해 1인칭 눈높이·자기 모델 숨김·원격 표시·방 이동과 기존 기능을 확인했습니다. 브라우저와 Node 검사를 겹쳐 실행한 중간 check에서는 CPU 부하로 기존 낚시 단위 검사 4개가 5초 제한을 넘겼으며 브라우저 종료 후 최종 check를 별도로 재실행해 136개 모두 통과했습니다. [목공방 화면](screenshots/woodworking-pages/woodworking-entry.png) · [이동/충돌 화면](screenshots/woodworking-pages/woodworking-workbench.png) · [브라우저 진단](screenshots/woodworking-pages/woodworking-browser.json) · [전체 회귀](screenshots/woodworking-pages/full-e2e-summary.json) · [낚시 재검사](screenshots/woodworking-pages/fishing-retest-summary.json) · [1인칭 회귀](screenshots/woodworking-pages/social-e2e-summary.json). 코드 커밋 `74217db799c83bc08bacece30140a5e0a1e2c878`를 GitHub main에 반영했습니다. [Pages 실행 42810562281](https://github.com/mango040730/XR/actions/runs/42810562281)의 Linux/Node 22 check와 빌드는 성공했지만 첫 Pages 게시는 600초 시간 초과로 종료됐습니다. 실패한 게시만 재시도했으나 같은 배포 ID에 대해 Pages API가 빈 status를 반환해 새 커밋으로 새 배포를 실행합니다. 새 커밋 `8ead0f32bc5905a453ad911865cb8e959432fd95`의 [Pages 실행 42812953009](https://github.com/mango040730/XR/actions/runs/42812953009)은 빌드와 게시 모두 success로 완료됐습니다. 공개 https://mango040730.github.io/XR/ 에서 실제 Chromium으로 혼자 → 목공방·포인터 잠금/WASD 이동·친목 → 낚시터를 확인했습니다. 페이지/네트워크/HTTP 오류 0개, GLB 200, 불필요한 소켓 요청 0개, 프로덕션 진단 전역 부재를 확인했습니다. [공개 목공방](screenshots/woodworking-pages/live-woodworking-entry.png) · [공개 낚시터](screenshots/woodworking-pages/live-social-fishing.png) · [공개 검증](screenshots/woodworking-pages/live-verification.json) · [배포 결과](screenshots/woodworking-pages/github-deployment.json). 로컬 3001 서버도 갱신했으며, 현재 5173 사이트에서 혼자 모드 → 목공방 → 실제 입장(시작 위치 [0,0,5.6])을 확인했습니다. 페이지 오류 0개이며 일반 개발 모드의 진단 전역도 없습니다. [현재 로컬 화면](screenshots/woodworking-pages/local-5173-woodworking.png) · [로컬 확인](screenshots/woodworking-pages/local-5173-verification.json).

제한·다음 단계: 도구는 정적 배치이며 목공 게임 동작은 이번 범위에 포함하지 않습니다. 원본 React 전용 N8AO·ContactShadows·Sparkles 대신 기존 렌더러의 ACES·약한 bloom·태양/창/작업등과 balanced 그림자를 사용합니다. 실제 VR 기기·휴대폰 성능은 별도 확인이 필요합니다. 공개 Socket.IO 서버 미설정이라는 기존 Pages 제한은 유지됩니다. [원본 및 포팅 범위](../src/worlds/woodworking/README.md).

---

## 1인칭·자기 아바타 숨김 및 XR 저장소 교체 — 2026-11-10

사용자 요청에 따라 일반 소셜 시점을 1인칭으로 변경했습니다. 자기 아바타는 생성 직후부터 visible=false이며 이동·인사·착석·VR 여부와 관계없이 본인 시야에 표시하지 않습니다. 원격 복제는 계속 표시하고 기존 애니메이션/스켈레톤·위치·좌석 동기화를 유지합니다. 일반 눈높이 1.65m와 착석 눈높이 1.12m를 실제 브라우저에서 확인했습니다.

GitHub mango040730/XR의 기존 main(7d556d7)을 별도 작업 폴더와 Git 이력에 보존한 뒤 현재 프로젝트의 소스·필수 자산·검사·문서로 교체합니다. 로컬 원본 작업 폴더는 삭제하지 않습니다. node_modules, 빌드 출력, 캐시, 실제 환경 파일/인증 정보는 업로드에서 제외합니다. 현재 저장소의 기존 배포는 main 루트의 정적 Pages이므로 Vite 빌드 결과 dist를 게시하는 GitHub Actions로 전환합니다. /XR/ 모델/폰트/화면 복귀 경로를 반영하고 README를 현재 구현에 맞춰 갱신했습니다. 이전 로컬 README는 docs/archive에 보존했습니다.

검사: 최종 npm run check 통과(Node 25개 파일/132개, 린트·타입·모델/원본 아바타 검사·프론트/서버 빌드·프로덕션 진단 분리). npm run test:e2e:social 4개 통과: 본인 모델이 보이지 않는 1인칭 이동/눈높이, 두 브라우저의 원격 표시·걷기/인사/앉기·채팅·좌석 독점·방 이동·실패 보존·재접속, 테스트 마이크의 실제 WebRTC 전송/거리 감쇠/종료를 포함합니다. [원격 아바타 표시](screenshots/first-person-pages/remote-avatar-visible.png) · [검사 결과](screenshots/first-person-pages/social-e2e-summary.json). VITE_BASE_PATH=/XR/ 및 VITE_STATIC_HOST=github-pages 빌드도 통과했습니다. 실제 Chromium에서 /XR/ 모델·폰트·4개 화면·낚시터 메뉴 복귀를 검사해 페이지 오류/HTTP 오류 0개, 서버 미설정 시 소켓 요청 0개와 진단 전역 부재를 확인했습니다. [Pages 경로 검사](screenshots/first-person-pages/pages-path-preview.json) · [Pages 화면](screenshots/first-person-pages/pages-path-preview.png). 원격 코드 교체 커밋 df8ac05fcf24e873988b4bbeb00f50b61cbfa5cc를 main에 정상 push했고 기존 app.js/styles.css/three-world.js와 assets 및 기존 워크플로를 현재 프로젝트로 교체했습니다. Git 이력은 유지했습니다. Pages를 workflow 방식으로 전환했으며 [Actions 실행 42805963308](https://github.com/mango040730/XR/actions/runs/42805963308)의 Linux/Node 22 설치·전체 check·빌드·Pages 게시가 모두 success로 완료됐습니다. 기존 https://mango040730.github.io/XR/ 주소에서 실제 Chromium으로 HTTP 200, 제공 GLB/공간 GLB 200, 1인칭 공간·포인터 잠금/이동·평가/종료 알림 자동 숨김을 확인했습니다. 페이지 오류/HTTP 오류 0개, 불필요한 소켓 요청 0개, 진단 전역 부재를 확인했습니다. [공개 1인칭 화면](screenshots/first-person-pages/live-pages-first-person.png) · [공개 주소 검사](screenshots/first-person-pages/live-pages-verification.json) · [배포 결과](screenshots/first-person-pages/github-deployment.json).

제한·다음 단계: GitHub Pages는 정적 프론트 호스팅이며 Node.js 서버를 실행하지 않습니다. 기존 저장소에는 공개 Socket.IO 서버 주소가 없고 사용자가 회신한 주소도 코드 저장소 주소여서 서버 주소로 사용할 수 없습니다. 서버 코드는 함께 제공하며 Pages에서는 공간 탐색과 실시간 연결 준비 상태를 표시합니다. 나중에 운영 HTTPS 서버를 준비해 저장소 변수 SOCIAL_SERVER_URL과 서버 ALLOWED_ORIGINS를 연결하고 재배포합니다. 외부망 음성은 STUN/TURN도 필요합니다. 실제 VR 기기/사람 마이크 음질은 미검증입니다.

---

## 실제 접속자 소셜 멀티플레이어 — 2026-11-10

첨부 요청서와 ZIP을 기준으로 기존 Three.js 0.187.0/TypeScript/Vite 구조를 분석하고 로컬 데모 위에 별도 소셜 계층을 main.ts에서 조립했습니다. 기존 4개 Figma 화면·실제 3D 월드·조명/셰이딩·가구 위치를 유지하며, 기본 카메라는 공통 PlayerController/MovementCollision의 3인칭 카메라 충돌을 사용합니다. 기존 1인칭 검수 높이·XR 카메라를 덮지 않습니다. 카메라가 몸 안으로 당겨지면 자기 모델만 숨깁니다. 혼자 있는 공간에는 다른 사용자를 만들지 않습니다. 마이룸 데모 인물/일반 낚시터 샘플 NPC와 임의의 모드 접속 숫자를 제외했고, 자기 아바타는 자기 위치의 로컬 프리뷰입니다. 기존 샘플은 DEV + e2e 검수 전용으로 보존했습니다.

ZIP의 Repair_v6/CubScout_v6_Rigged.glb를 public/assets/avatars/cub-scout-v6.glb에 원본 그대로 복사했습니다. 실제 GLTFLoader 검사로 19관절·16개 SkinnedMesh·5개 내장 클립을 확인했습니다. Idle/Walk/Wave/Sit 및 crossFade, Wave 종료 뒤 현재 이동 상태 복귀를 사용하고 Shoulder_Check는 제외합니다. +Z 얼굴을 -Z 전방으로 맞추고 약 1.899m 모델을 1.75m로 정규화했습니다. 방마다 한 번 읽는 풀에서 SkeletonUtils.clone과 독립 Mixer를 쓰며 스켈레톤/GPU 자원 수명과 늦은 로딩 정리를 분리했습니다. 원본 validator는 오류 0/스킨 노드 위치 경고 16개이며 상세 수치와 좌표는 social-avatar-report.json에 기록했습니다.

Node + Socket.IO 4.8.4 서버는 실제 소켓의 입장/퇴장, 월드+Room 격리, 고유 ID·닉네임·모델·위치/회전·모션·좌석·갱신 시각을 관리합니다. 클라이언트/서버 15Hz, 원격 표본 보간/평활, 속도/바닥/충돌 검증과 보정, VR 순간이동 별도 거리/경로/착지/쿨다운 검증, 원자적인 좌석 점유/해제를 추가했습니다. 기존 마이룸 소파 형태 블록 2자리·낚시터 12자리의 위치를 바꾸지 않고 표면 높이/골반/방향/통로 앵커로 맞춥니다. 기본 E/1 및 버튼, 머리 위 닉네임, 500자·빈도 제한과 text node 기반 방 채팅, 재접속 및 방 전환 정리를 연결했습니다. 원래 로컬 예약 기능과 계정 없는 데모 범위는 유지합니다.

텍스트 검증 뒤 WebRTC mesh 음성과 분리된 signaling/ICE 환경 설정을 연결했습니다. 사용자가 음성 버튼을 눌러야 마이크를 요청하고, 양쪽이 켠 같은 방 사용자 사이에만 연결합니다. HRTF 방향과 부드러운 거리 gain, 12m 밖 무음, 송출 음소거, 통화 종료/퇴장/방 전환/연결 손실 때 트랙/오디오 노드/peer 정리를 구현했습니다. 회색 UI에 활성 상태의 제한적인 #E04D08만 사용했습니다. 허용 Origin, 패킷/이벤트/채팅 제한을 적용하며 운영 계정/DB/SFU는 추가하지 않았습니다.

검사: 최종 `npm run check` 통과(린트·타입·Node 25개 파일/132개·공간/실제 아바타 validator·프론트/서버 빌드·프로덕션 분리 포함). `npm run test:e2e:social` 실제 서버/Chromium 통합 4개 통과: 두 독립 브라우저 프로세스의 실제 GLB 1회 다운로드/이동/Walk/Wave/Sit/좌석 중복 거부/채팅 text 렌더링/퇴장과 좌석 해제, 방 격리·월드 전환·실제 연결 단절/재접속, 카메라 벽 충돌, 명시적 마이크·실제 RTP 양방향 수신·거리 gain·음소거·통화 정리를 확인했습니다. 음성은 테스트용 마이크를 사용했으며 사람의 실제 음성을 청음한 검사가 아닙니다. 일반 사이트 `npm run test:e2e -- --config=playwright.water.config.ts` 전체 실행은 52개 중 50개 통과했습니다. 샘플 NPC가 없어 늘어난 빈 좌석에서 오래 유지된 이동 입력 때문에 목적 좌석이 달라진 기존 착석 검사 2개는 이동 종료 관찰 간격을 보정했고, `space-only.spec.ts production.spec.ts` 8개를 재실행해 모두 통과했습니다. 최종 소셜 4개도 재실행 통과했으며 새 월드 404 실패 뒤 이전 방의 실제 이동 동기화 유지까지 포함합니다. 원본 화면·PC/터치·낚시·Cardboard·물/숲/수영·실제 GLB 실패/취소/자원 정리·프로덕션 분리를 검증했습니다. 런타임 의존성 `npm audit --omit=dev` 결과는 취약점 0개입니다. 기존 개발 도구의 경고를 강제 업데이트로 숨기지 않았습니다. GLB 원본 스킨 경고와 기존 Three.js 청크 크기 경고는 유지합니다. 현재 5173 development 사이트/최신 3001 서버에서도 두 독립 세션의 제공 GLB 로드·2명 표시·실제 채팅 전달, Apple M4 실제 GPU, 일반 개발 모드의 진단 전역 부재와 브라우저 오류 0개를 확인했습니다. 서버는 로컬 사용을 위해 실행 상태로 두었습니다. [실제 5173 화면](screenshots/social/live-5173.png) · [라이브 검사](screenshots/social/live-5173.json) · [두 접속자 캡처](screenshots/social/two-users.png) · [소셜 검사 결과](screenshots/social/e2e-summary.json) · [전체 회귀 기록](screenshots/social/regression-full-summary.json) · [보정 후 관련 검사](screenshots/social/regression-targeted-summary.json) · [런타임 audit](screenshots/social/runtime-audit.json). 사용/환경/배포 설정과 주요 파일은 [실행 문서](social-multiplayer.md)에 정리했습니다.

제한·다음 단계: 외부 HTTPS 호스팅과 운영 STUN/TURN 자격증명은 제공되지 않아 외부 인터넷 배포/서로 다른 NAT에서의 통화는 미검증입니다. 실제 사람 마이크 음질·VR 헤드셋·스마트폰 센서·Safari·다인원 부하도 미검증입니다. 원본 Sit은 골반 평행 이동이 없고 캐릭터 비율에 따라 발이 바닥에 닿지 않을 수 있어 새 가구마다 표면/골반 오프셋 시각 검수가 필요합니다. 현재 서버는 단일 프로세스의 휘발성 방이며 재시작하면 대화/점유가 초기화됩니다. 다음 단계는 운영 HTTPS/TURN 제공 후 외부망·실기기·부하 검사입니다. 확인 주소: http://127.0.0.1:5173/?room=demo#my-room.

---

## 종료 알림 자동 닫힘·공간 최소 전환 버튼 — 2026-11-10

‘시뮬레이션이 종료되었습니다’도 모드 선택 알림과 동일하게 진입 시 표시되고 3.2초 후 사라집니다. 별점 선택으로 패널이 다시 생성돼도 최초 진입 시간을 기준으로 남은 시간만 적용하여 알림이 되살아나지 않습니다. 새 평가 진입에는 다시 표시하며, 움직임 줄이기 설정에서는 페이드 없이 같은 시간 뒤 숨깁니다. 원본 알림 위치·모양과 role=status 안내를 유지합니다.

UI가 비었던 공간에는 Figma 1차 픽스의 평가 완료 버튼(50:1678)을 재사용해 하단 중앙에 버튼 하나만 넣었습니다. 마이룸은 ‘모드 선택’, 시뮬레이션은 ‘종료하고 평가하기’, 로딩은 ‘취소’입니다. 별도 낚시터 주소도 ‘모드 선택’으로 돌아갈 수 있습니다. 반투명 검정 배경·둥근 모서리·Wanted Sans·18px 글자·24px/8px 여백을 유지하고, 작은 화면에서는 버튼이 지나치게 축소되지 않도록 보정합니다. 기존 키보드·터치 이동은 유지하며 전환 시 입력과 낚시 세션을 정리합니다. Cardboard에도 같은 최소 버튼을 전달합니다. 기존 시뮬레이션의 전체 화면 배치와 낚시터 UI 숨김 CSS는 이전 UI에만 적용해 새 버튼을 가리지 않도록 했습니다. 새 라이브러리·백엔드는 추가하지 않았습니다.

검사: `npm run typecheck`, `npm run build`, 최종 `npm run check` 통과(린트·Node 23개 파일/117개·glTF validator·프로덕션 진단/기존 UI 청크 분리 포함). 실제 GPU Chromium에서 모드/평가/약속 전체 흐름, 알림 자동 닫힘·별점 갱신 후 숨김·재진입·움직임 줄이기, PC 실제 이동, 세로형 터치의 42px 버튼/화면 내 배치/전환, 로딩 취소·늦은 실제 GLTF 응답, 낚시터 키 조작·모드 복귀, 프로덕션 최소 UI 등 관련 15개 통과(`npm run test:e2e -- --config=playwright.water.config.ts first-fix-only.spec.ts space-only.spec.ts production.spec.ts`). 추가 Cardboard 실제 시선 hit/dwell로 종료·평가 전환 및 기존 스타일 회귀 4개 통과(`npm run test:e2e -- --config=playwright.water.config.ts minimal-navigation.spec.ts neumorphic.spec.ts`). 최초 대상 실행에서 원본 4개 프레임·모드 알림/호버·낚시터 시각/입력 7개도 통과했습니다. 모바일 캡처에서 발견한 기존 시뮬레이션 CSS의 위치 간섭을 수정 후 화면 경계·크기 검사를 추가했고, 5173 서버가 최신 코드를 제공하는 것도 확인했습니다. 전체 51개 회귀를 이번에 한 번에 실행한 결과는 아니며 변경 관련 검사를 수행했습니다. PC·세로형 모바일·양안 및 알림 숨김 캡처를 직접 확인했습니다. 기존 Three.js 번들 크기 경고는 유지합니다. [PC 최소 버튼](screenshots/minimal-navigation/first-fix-minimal-simulation.png) · [모바일 최소 버튼](screenshots/minimal-navigation/first-fix-minimal-mobile.png) · [종료 알림 숨김](screenshots/minimal-navigation/first-fix-rating-notice-dismissed.png) · [양안 시선 선택](screenshots/minimal-navigation/first-fix-minimal-cardboard.png) · [전환 검사 결과](screenshots/minimal-navigation/navigation-e2e-summary.json) · [양안/스타일 검사 결과](screenshots/minimal-navigation/cardboard-e2e-summary.json).

제한·다음 단계: 실제 VR 헤드셋·스마트폰 센서·Safari는 미검증입니다. 실제 기기에서 버튼 선택과 공간 이동을 후속 확인합니다. 확인 주소: `http://127.0.0.1:5173/`.

---

## ‘1차 픽스’ 4개 UI만 유지 — 2026-11-10

일반 진입 화면을 모드 선택·평가·약속 날짜·약속 장소의 원본 4개 화면으로 제한했습니다. 별도 로그인/프로필/온보딩·서버 선택·완료/오류 화면과 공통 헤더·도구 모음·모바일 이동 버튼을 생성하지 않습니다. 평가에 추가했던 개인별 행과 장소 선택 목록도 제외했습니다. 원본의 카드·별점·달력·지도·자동 사라지는 안내만 유지하며, 배경은 이동 가능한 실제 3D 월드입니다. 모드를 선택하면 로컬 데모 모임에 바로 입장하고, 평가는 원본의 두 별점 그룹으로 저장합니다. 장소는 원본 지도 검색 영역을 눌러 로컬 데모 후보를 순환합니다. 백엔드·계정·멀티플레이·음성은 추가하지 않았습니다.

공간만 보는 화면에는 UI 자식을 생성하지 않습니다. PC는 WASD/마우스, M 모드 메뉴, B 약속, V VR 전환, Esc 메뉴 닫기/공간 종료를 사용합니다. 포인터 잠금 중 첫 Esc는 잠금만 해제하고 다음 Esc로 종료합니다. 터치는 한 손가락으로 시점, 두 손가락을 밀어 유지하면 이동, 빈 공간 두 번 탭으로 모드 메뉴를 엽니다. 입력은 공통 PlayerController와 충돌 경계를 사용하며 취소·포커스 상실·화면 전환에 초기화합니다. Cardboard도 별도 도구 모음·조준점을 생성하지 않습니다.

기존 소스와 회귀용 화면은 보존하되 DEV + e2e + legacyServiceReview=1에서만 연결했습니다. 일반 development/프로덕션은 과거 주소·옵션으로도 복구되지 않습니다. 프로덕션 분리 검사는 구 ServiceExperience/startLab 청크 및 검수/진단 플래그 누출을 거부합니다. 로딩 실패 시 기존 월드를 유지하고, 취소된 요청의 늦은 응답은 화면에 적용하지 않고 자원을 정리합니다.

검사: 최종 `npm run check` 통과(린트·타입·Node 23개 파일/117개·glTF 자산 validator·빌드·프로덕션 분리 포함). `npm run test:e2e -- --config=playwright.water.config.ts` 전체 48개 중 47개 통과 후, 신규 취소 테스트가 커밋된 root만 관찰하는 dispose 카운터에 잘못 의존한 것을 수정했습니다. 실제 GLTFLoader 응답 완료 후 렌더 자원 수·월드 소유권·경로 불변을 검사하도록 보정하고, `npm run test:e2e -- --config=playwright.water.config.ts first-fix-only.spec.ts` 관련 6개를 재실행하여 모두 통과했습니다. PC 포인터 잠금/충돌·터치 시점/이동/취소·4화면 전체 저장 흐름·실패/취소·Cardboard 양안·프로덕션의 이전 UI 복구 차단을 확인했습니다. 4개 화면 및 모바일/양안 캡처를 직접 확인했고 5173 development 서버의 최신 진입 코드도 확인했습니다. 기존 Three.js 번들 크기 경고는 유지합니다. [모드](screenshots/first-fix-only/modes.png) · [평가](screenshots/first-fix-only/rating.png) · [날짜](screenshots/first-fix-only/date.png) · [장소](screenshots/first-fix-only/place.png) · [모바일](screenshots/first-fix-only/mobile.png) · [양안](screenshots/first-fix-only/cardboard.png) · [전체 실행 결과](screenshots/first-fix-only/e2e-full-summary.json) · [수정 후 관련 검사 결과](screenshots/first-fix-only/e2e-targeted-summary.json).

제한·다음 단계: 실제 VR 헤드셋·스마트폰 센서·Safari는 미검증입니다. 장소 검색은 로컬 데모 후보 순환이며 외부 검색은 없습니다. 실제 기기에서 이동·VR 입력을 후속 확인합니다. 확인 주소: `http://127.0.0.1:5173/`.

---

## 낚시터 UI 완전 제거·ui=1 복구 경로 차단 — 2026-11-10

일반 개발 서버와 프로덕션의 낚시터에서 `ui=1` 유무에 관계없이 헤더·브랜드·안내·조준점·정보/상태 카드·낚시/이동/VR 버튼 등 HUD DOM을 생성하지 않습니다. 낚시터 입장 중에는 서비스 메뉴/배너와 모바일 이동 조작도 숨기고, 서비스 시뮬레이션 프레임과 메뉴에는 조작 자식을 생성하지 않습니다. 공간 안의 3D 착석 조작 패널·입구 제어판도 생성하지 않습니다. Cardboard에서는 서비스 평면과 조준점을 표시하지 않고 양안 월드와 센서/드래그·공간 시선 상호작용을 유지합니다.

WASD·마우스 이동, E 착석/F 투입·회수/Q 일어나기, 터치 시점, 기존 낚싯대·의자 상호작용은 유지합니다. 마이룸과 다른 모드의 UI·이동 정책은 유지합니다. 낚시터에서 브라우저 뒤로가기로 메뉴에 돌아오면 서비스 UI가 다시 표시됩니다. 건물 간판·가구·인물·숲·수조 등 실제 공간 오브젝트는 UI 제거 대상에서 제외합니다.

기존 UI/광학 회귀에 필요한 검수 UI는 **DEV + e2e 모드 + fishingUiReview=1** 조건으로만 분리했습니다. 일반 개발/프로덕션에서는 같은 옵션도 무시합니다. 프로덕션 분리 검사에 `fishingUiReview` 문자열 누출 검사도 추가해 이 경로가 빌드에 남지 않는 것을 확인합니다. 기존 DEV 진단은 읽기 전용 가드 그대로 유지합니다.

검사: `npm run typecheck`, `npm run build`, `npm run check` 통과(Node 22개 파일/112개 및 자산 validator·프로덕션 분리 포함). 실제 GPU Chromium의 UI 제거 검사 **7개 통과**: 기본/기존 ui=1 주소, PC·모바일, 실제 WASD·착석·투입/회수·일어나기, 서비스 메뉴 복귀, 실제 시선으로 Cardboard 낚시터 입장, 프로덕션에서 모든 UI 플래그 무시 및 HUD DOM 부재를 확인했습니다. 일반 화면과 양안 화면 캡처도 직접 확인했습니다. `npm run test:e2e -- --config=playwright.water.config.ts` 실제 GPU Chromium 전체 회귀 **42개 통과**: 낚시/이동/광학·서비스·Cardboard·실제 GLTFLoader 실패/취소/정리·프로덕션 분리를 포함합니다. 실행 중인 5173 서버가 새 설정과 일반 development 모드를 제공하는 것도 확인했습니다. 기존 Three.js 번들 크기 경고는 유지합니다.

제한·다음 단계: 실제 VR 헤드셋·스마트폰 센서·Safari는 미검증입니다. 실제 기기에서 공간 상호작용을 추가 확인합니다. 확인 주소: `http://127.0.0.1:5173/?fishing` 또는 기존 서비스 `/?ui=1`에서 낚시터 입장. [UI 없는 공간](screenshots/fishing-ui-removed/space-only-service.png) · [UI 없는 양안 화면](screenshots/fishing-ui-removed/space-only-cardboard.png) · [전체 검사 결과](screenshots/fishing-ui-removed/e2e-summary.json).

---

## 서비스 공간 안에서 이동·시점 조절 — 2026-11-10

마이룸, 모드 선택, 평가, 날짜·장소 선택 화면에서도 공간을 클릭해 마우스 시점을 잡고 WASD로 이동할 수 있도록 연결했습니다. Esc를 누르면 커서를 돌려 UI 버튼을 선택할 수 있습니다. UI의 빈 영역은 실제 WebGL 캔버스로 클릭을 통과시키고, 버튼·입력·달력·반투명 패널은 자신의 클릭 영역을 유지합니다. 마이룸의 전체 불투명 배경도 제거해 공간과 이동 결과가 보입니다. 메뉴를 열 때 현재 플레이어 위치·방향을 보존합니다.

모바일은 하단 ‘이동 조작’으로 방향 버튼을 열어 누르는 동안 이동하고, 빈 공간을 드래그해 시점을 돌립니다. 터치 입력은 이동 의도만 제공하고 기존 PlayerController와 MovementCollision이 실제 이동·속도·대각선 정규화·충돌을 처리합니다. 낚시터의 기존 터치 입력과 일반 서비스의 터치 입력이 동시에 시점을 바꾸지 않도록 입력 소유권을 구분했습니다. 일반 GLB/Geometry 시뮬레이션도 터치 시점을 유지합니다.

화면 전환, 텍스트 입력 포커스, 일시정지/로딩/오류 화면, Cardboard/WebXR 진입·대기 때 이동을 중지하고 입력을 초기화합니다. 손 떼기·터치 취소·포인터 캡처 상실·창 포커스 상실·탭 숨김에도 터치 의도를 정리합니다. 새 입력 이벤트는 AbortController와 dispose로 해제합니다. 로그인/프로필 입력 화면과 원본 디자인 검수 화면은 이동 대상으로 확장하지 않습니다.

검사: `npm run typecheck`, `npm run build`, 최종 `npm run check` 통과(린트·타입·프로덕션 진단 분리·자산 validator 포함). Node 단위 검사 22개 파일/112개 통과. 새 실제 GPU Chromium 이동 검사 3개 통과(마이룸 벽 충돌, 실제 Pointer Lock/WASD/마우스, Esc 뒤 UI 조작·포즈 보존, 평가/약속 화면 이동, 입력란 타이핑, 모바일 이동/시점/취소/포커스·화면 전환 정지). `npm run test:e2e -- --config=playwright.water.config.ts` 실제 GPU Chromium 전체 회귀 **39개 통과**. 일반 GLB 시뮬레이션·낚시터에서 터치 드래그가 각각 정확히 한 번만 적용되는 것을 확인했고, 기존 이동/낚시·원본 4/13화면·PC/모바일 서비스·Cardboard 전체 흐름·실제 GLTFLoader의 실패/취소/자원 정리·프로덕션 분리를 포함합니다. 현재 5173 개발 서버의 HTML 응답도 확인했습니다. 기존 Three.js 번들 크기 경고는 유지합니다.

제한·다음 단계: 3D 마이룸은 현재의 임시 Geometry 월드입니다. 기존 Cardboard 시선 선택과 WebXR 컨트롤러 이동 정책을 유지하며, 이번 PC·Chromium 터치 에뮬레이션 결과를 실제 VR/스마트폰 센서·Safari 검증으로 간주하지 않습니다. 실제 기기에서 이동 조작과 메뉴 선택을 후속 확인합니다. 사용 주소는 `http://127.0.0.1:5173/?ui=1`입니다. [이동한 모드 선택 화면](screenshots/service-navigation/service-space-walking-modes.png) · [모바일 이동 조작](screenshots/service-navigation/service-space-mobile-controls.png) · [전체 브라우저 결과](screenshots/service-navigation/e2e-summary.json).

---

## 모드 안내 자동 닫힘·실제 3D 배경 — 2026-11-10

‘원하는 모드를 선택하세요’를 모드 선택 진입 시 나타났다가 3.2초 후 사라지는 상태 알림으로 바꿨습니다. 호버로 다시 나타나지 않으며, 다른 화면을 거쳐 재진입하면 새로 표시됩니다. 움직임 줄이기 설정에서는 페이드 없이 같은 시간 뒤 닫힙니다. 알림은 클릭을 가로채지 않고 `role=status`와 정중한 라이브 안내를 사용합니다. CSS 애니메이션이 DOM 수명에 묶여 별도 전역 타이머나 퇴장 후 콜백이 남지 않습니다.

실제 서비스의 모드 선택·평가·약속잡기1·2에서 화면 전체를 덮던 Figma 배경 이미지 레이어를 제거하고 루트를 투명하게 만들었습니다. 기존 엔진이 렌더링하는 현재 월드의 WebGL 장면이 UI 뒤에 바로 보입니다. 마이룸에서 연 화면은 실제 마이룸, 시뮬레이션 종료 평가는 해당 시뮬레이션의 월드를 보여줍니다. 카드 썸네일·지도/콘텐츠 이미지와 공통 호버 상태를 유지합니다. 원본 비교용 `designReview` 프레임은 기록용으로 보존합니다. 엔진·월드 config·입력·자원 생명주기 변경이나 새 라이브러리 도입은 없습니다.

검사: `npm run typecheck`, `npm run build`, `npm run check` 통과(21개 파일 / Node 109개, 자산 validator 및 프로덕션 분리 포함). `npm run test:e2e -- --config=playwright.water.config.ts figma-fix.spec.ts service.spec.ts production.spec.ts` 실제 GPU Chromium 회귀 **12개 통과**. 알림 표시/자동 닫힘/호버 후 숨김/재진입/움직임 줄이기, 투명 UI와 배경 이미지 부재 및 실제 WebGL 렌더링, PC·모바일·Cardboard 전체 시선 선택·프로덕션 분리를 확인했습니다. 캡처에서 마이룸/시뮬레이션 월드가 패널 뒤에 보이고 원래 배경 사진이 사라진 것을 직접 확인했습니다. 개발 서버는 `http://127.0.0.1:5173/?ui=1`로 다시 시작했습니다. 기존 Three.js 번들 크기 경고는 유지됩니다.

제한·다음 단계: 일반 서비스 UI 화면에서는 기존 정책대로 이동 입력을 잠그고 3D 장면을 배경으로 렌더링합니다. 실제 VR 기기·스마트폰 센서·Safari에서 알림과 배경을 후속 확인해야 합니다. [3D 배경 모드 선택](screenshots/live-world-ui/hover-solo.png) · [알림 표시](screenshots/live-world-ui/modes-notice-visible.png) · [실제 월드 위 평가](screenshots/live-world-ui/pc-rating.png) · [날짜 선택](screenshots/live-world-ui/pc-date.png) · [검사 결과](screenshots/live-world-ui/e2e-summary.json).

---

## Figma ‘1차 픽스’ 4개 화면 반영 — 2026-11-10

Figma `50:1624` 섹션의 모드 선택(`51:919`), 시뮬레이션 평가(`50:1645`), 약속잡기1(`49:807`), 약속잡기2(`49:1070`)를 서비스 경로에 적용했습니다. 원본의 어두운 반투명 패널·4px 배경 블러·간격·모서리·타이포그래피와 이미지 슬롯을 반영했습니다. 원본 코드와 로컬 이미지/SVG 자산, 공식 Wanted Sans v1.0.3 및 OFL 라이선스를 보관합니다. 기존 13개 원본 검수 화면과 다른 서비스 화면, 낚시 HUD 스타일은 유지합니다.

모드 카드는 친목·혼자·협력 순서이며 기본 상태에서는 모두 접힙니다. 호버한 카드만 542×400으로 확장하고 다른 카드는 261×200으로 접습니다. 키보드 포커스와 Cardboard 시선 강조도 같은 스타일을 사용하며, 마우스 호버가 다른 입력보다 우선하여 두 카드가 동시에 확장되지 않습니다. 터치 탭으로 바로 입장할 수 있고, 모드별 기존 월드/서버 연결을 유지합니다. 날짜·시간 선택과 월 변경, 장소 3곳 선택, 이전/다음/완료, 별점과 개별 참여자 평가·저장 기능을 유지합니다. 정적인 과거 캘린더 이미지는 실제 선택 가능한 현재 월 캘린더로 대체합니다.

제한: 지도·제휴 장소 검색은 기존 로컬 데모이며 실제 지도 검색/예약 API는 연결하지 않습니다. 참여자별 평가 버튼과 데모 장소 선택은 기능 유지를 위해 원본에 없는 보조 영역에 배치합니다. Cardboard 캔버스의 배경 블러와 그라데이션 재현은 기존 painter의 제한을 따릅니다. 실제 VR 헤드셋·스마트폰 센서·Safari는 검증하지 않았습니다.

검사: `npm run typecheck`, `npm run build`, `npm run check` 통과(21개 파일 / Node 테스트 109개, GLTF 자산 validator 및 프로덕션 진단 분리 검사 포함). Chromium에서 원본 4화면의 이미지 다운로드·슬롯·실제 크기와 글꼴을 기록하고 스크린샷을 대조했습니다. 세 모드 호버/해제/키보드 입장과 PC·모바일 전체 서비스 흐름 4개 검사를 통과했습니다. 터치 탭으로 세 모드에 입장하는 검사도 통과했습니다. `npm run test:e2e -- --config=playwright.water.config.ts`의 실제 GPU 전체 회귀 **35개 통과**: 실제 GLTFLoader/입력/충돌·월드 취소/실패 보존·Cardboard 전체 시선 선택·프로덕션 분리 검사를 포함합니다. 기본 SwiftShader 전체 실행은 기존 낚시·광학/이동 검사 6개의 시간 초과로 중단했으므로 해당 설정의 전체 통과를 주장하지 않습니다. 최종 캡처에서 발견한 달력 마지막 주 잘림은 날짜 버튼의 최소 높이와 grid 행 크기를 조정해 수정했습니다. 모든 날짜가 달력 안에 표시되는 PC·모바일 검사 및 호버/포커스 동시 입력·터치/원본 자산 검사를 포함한 최종 UI 회귀 5개를 추가 통과했고, 수정 후 `npm run check`도 다시 통과했습니다. 기존 Three.js 번들 크기 경고는 유지됩니다.

다음 단계: 실제 VR 기기의 시선 선택·가독성·센서와 Safari에서 검수합니다. 원본 검수는 `/?designReview=51:919`, `/?designReview=50:1645`, `/?designReview=49:807`, `/?designReview=49:1070`에서 열 수 있습니다. 서비스는 기존 `/?ui=1` 경로의 모드 선택/평가/작당모의에서 확인합니다. [모드 호버 화면](screenshots/figma-fix/hover-solo.png) · [평가 원본 비교](screenshots/figma-fix/reference-50-1645.png) · [날짜 화면](screenshots/figma-fix/reference-49-807.png) · [장소 화면](screenshots/figma-fix/reference-49-1070.png) · [이미지 슬롯·크기·글꼴 기록](screenshots/figma-fix/asset-geometry.json) · [전체 E2E 결과](screenshots/figma-fix/full-e2e-summary.json) · [최종 UI 회귀 결과](screenshots/figma-fix/final-ui-e2e-summary.json) · [선택 가능한 현재 달력](screenshots/figma-fix/live-pc-date.png).

---

## 낚시터 UI 없는 공간 보기 — 2026-11-09

기본 낚시터 화면에서 헤더·브랜드·정보 카드·조준점·도움말·하단 상태/버튼·터치 이동 버튼·VR 시작 버튼을 숨겼습니다. 서비스 경로로 입장한 경우에는 낚시터 이용 중의 서비스 배너와 하단 메뉴도 숨깁니다. 착석 조작 패널과 입구의 3D 제어판은 기본 화면에 생성하지 않습니다. 건물의 실제 간판과 가구·인물·숲·수조는 유지합니다. HUD의 세션 연결과 입력 바인딩은 남겨 WASD·마우스, E 착석/F 투입·회수/Q 일어나기, 터치 시점 회전을 유지합니다. 모바일 화면의 이동 버튼은 요청대로 숨깁니다.

화면의 UI를 다시 검수할 때만 `/?fishing&ui=1` 또는 서비스의 `/?ui=1`로 명시적으로 표시할 수 있습니다. 화면에 복구 버튼은 추가하지 않았습니다. 기존 UI 회귀 검사는 이 선택 표시 경로를 사용하며, 새 브라우저 검사는 기본 경로에서 UI가 없고 실제 이동/낚시 입력이 작동하는지 검사합니다.

전체 21개 파일/109개 단위 검사·린트·타입·자산·빌드 통과. Chromium / Apple M4에서 기본 PC·모바일 화면/서비스 진입/실제 키보드 낚시와 선택 표시 UI 회귀 5개, 현재 5174 서버 반영·전체 새로고침 1개 통과. 런타임·콘솔 오류 없음. Safari·실제 헤드셋은 미검증입니다. Three.js의 기존 번들 크기 경고는 남습니다. 물 셰이더·어종·자유 유영·포획 시간·팔레트·조명·엔진의 소스 해시는 수정 전과 같습니다.

[현재 공간](screenshots/space-only/space-only-live-entry.png) · [수조 화면](screenshots/space-only/space-only-live-pool.png) · [착석 화면](screenshots/space-only/space-only-seated.png).

---

## 고정 원형 경로를 독립적인 자유 유영으로 변경 — 2026-11-09

물고기마다 수조 안의 서로 다른 목표와 깊이를 고르고, 천천히 회전·감속·가속하며 이동하도록 변경했습니다. 벽 예측 회피와 개체 간 거리 조절, 실제 메시 크기에 맞춘 수면/바닥 여유, 진행 방향과 몸·꼬리 애니메이션 연결을 적용했습니다. 고정 시간 간격 계산과 긴 프레임 제한으로 탭 복귀 시 순간 이동을 방지합니다.

전체 21개 파일 109개 단위 검사·린트·타입·자산·빌드 통과. 실제 GPU Chromium에서 자유 유영/수면/이동·낚시 회귀 3개, 현재 5174 서버의 반영·12초 유영·전체 갱신 1개를 통과했습니다. 기존 물/팔레트/UI/모델/포획 시간 30~120초는 유지했습니다. Safari·실제 헤드셋은 미검증입니다. [구현과 검증](free-swimming.md) · [현재 유영 영상](screenshots/free-swimming/free-swimming-live.webm).

---

## 수조 바닥 통일·병어/고등어/숭어·30~120초 포획 — 2026-11-09

수조 바닥 타일을 벽과 같은 #F4EEE6로 통일했습니다. 얕은 줄눈과 타일 상판으로 정리해 밝은 바닥의 점선 형태 번쩍임을 제거했습니다. 병어·고등어·숭어를 각 두 마리씩 넣고 몸통 단면·눈·아가미·지느러미·은빛 재질·무늬·유영 애니메이션을 개선했습니다. 포획 결과에 어종 ID를 포함해 같은 물고기 모델을 표시하며, 매 투입 30~120초 사이의 새 기한을 뽑습니다. 도움말과 투입 문구도 갱신했습니다.

20개 파일 105개 단위 검사·린트·타입·자산·빌드 통과. 실제 GPU Chromium에서 물/이동/낚시 회귀 통과 후, 현재 5174 서버에서 수조·어종·안내·착석·포획·전체 갱신 검사 2개를 통과했습니다. 은빛 고등어 포획 모델과 결과 문구의 일치를 직접 확인했습니다. 실내·숲 팔레트/구조, 물 셰이더와 광학 계수, 뉴모피즘 CSS, 조명·카메라는 유지했습니다. Safari·실제 헤드셋은 미검증입니다. [변경과 검사](fish-species-update.md) · [현재 수조](screenshots/fish-species/species-live-pool.png) · [고등어 포획](screenshots/fish-species/species-live-caught.png).

---


## 밝은 회색 뉴모피즘 UI 적용 — 2026-11-09

첨부 이미지를 참고해 회색 표면·돌출/눌림 그림자·둥근 카드·입력·스위치·선택/포커스/비활성 상태를 낚시 HUD와 서비스 화면에 적용했습니다. 기존 기능·한국어 문구·액션 경로를 유지하고 모바일에서 낚시 조작부와 서비스 메뉴를 분리했습니다. Cardboard 캔버스 패널도 같은 그림자와 테두리를 그립니다. 전체 낚시터 TS 및 Renderer 파일의 해시가 같아 3D 공간·숲·수조·조명·이동·낚시는 변경되지 않았습니다.

19개 파일 101개 단위 검사·린트·타입·자산·빌드 통과. 실제 GPU Chromium에서 UI 상태/PC·모바일 서비스/낚시 동작/전체 Cardboard 시선 선택 흐름을 통과했고, 현재 5174 서버에서도 낚시·로그인·모바일 검사 3개를 통과했습니다. Safari·실제 헤드셋은 미검증입니다. [적용과 검사 범위](neumorphic-ui.md) · [현재 서버 화면](screenshots/neumorphic-ui/neumorphic-live-desktop.png).

---


## 창밖 배경을 둥근 로우폴리 숲으로 변경 — 2026-11-08

첨부 화면을 참고해 외부의 원뿔형 나무를 둥근 수관의 활엽수·후방 침엽수·관목·낮은 바위와 올리브색 지면으로 바꿨습니다. 새 8색은 `forestPalette.ts`에 분리해 숲에만 적용했습니다. 실내 팔레트·조명·물·낚시·카메라·UI 파일은 유지했고 수정 전후 해시로 대조했습니다. 외부 지면 아래에 건물과 수조를 위한 실제 구멍을 두어 면 겹침을 방지했습니다.

18개 파일 98개 단위 검사와 린트·타입·자산·빌드 통과. 실제 GPU Chromium에서 숲·이동·낚시·물 회귀 3개와 최종 숲 재검사 통과. 실행 중인 5174 서버에서도 양쪽 창·실내·기존 탭 전체 갱신을 검수했습니다. Safari·실제 헤드셋은 미검증입니다. [구현과 검증](forest-background.md) · [현재 서버 창밖 화면](screenshots/forest-background/forest-live-east.png).

---


## PNW Breeze · Field Notes · Trail Dust 적용 — 2026-11-08

새 3색 팔레트로 교체했습니다. #443B1C는 짙은 목재·프레임, #F4EEE6는 벽·천장·밝은 표면, #C8B38B는 바닥·밝은 목재·선반에 적용했습니다. 같은 색이라도 목재와 타일 재질은 따로 지정해 나뭇결과 거칠기를 구분합니다. 구조·카메라·이동·낚시·물 셰이더는 유지했습니다.

17개 파일 95개 단위 검사와 린트·타입·자산·빌드 통과. 실행 중인 5174 서버에서 실제 GPU Chromium 브라우저 검사 1개 통과: 팔레트 응답·양쪽 시점·모바일·기존 탭 전체 갱신. 캡처를 직접 확인했습니다. Safari·실제 헤드셋은 미검증입니다. [적용과 검증](pnw-palette.md) · [현재 서버 렌더링](screenshots/pnw-palette/pnw-live-overview.png).

---


## 빈티지 틸·월넛 컬러와 라이팅 — 2026-11-08

사용자가 지정한 #6F918D / #426864 / #A27A48 / #39271E / #D1C7AD / #30312D / #EBC48A를 공통 팔레트로 만들었습니다. 벽·수조·통로는 저채도 틸, 가구와 창틀은 다크 월넛, 천장은 허니 브라운, 줄눈·테두리는 아이보리로 조정했습니다. 월드 좌표 나뭇결·도장 표면 변화·거칠기/금속성, 4096² 오후 햇살 그림자, 기존 펜던트 6곳의 앰버 국소광, 정적 버텍스 AO와 부드러운 접촉 음영을 적용했습니다. 그늘의 원색이 사라지지 않도록 약한 창가/바닥 보조광으로 균형을 맞추고 Bloom을 낮췄습니다. 구조·카메라·이동·물 셰이더·낚시·UI는 유지합니다.

단위 17개 파일 95개와 린트·타입·자산·빌드가 통과했습니다. Chromium 158 / Apple M4 / ANGLE Metal에서 실제 GPU E2E 4개를 통과하고 입구·전체·양쪽 수조·착석·모바일 화면을 직접 확인했습니다. 1440×1000 기본 품질 60개 rAF 관측 중앙값 16.7ms, 95백분위 17.6ms이며 VR 성능 보장은 아닙니다. SwiftShader WebGL 물 렌더링 회귀 1개도 통과했습니다. Safari·실제 헤드셋은 미검증입니다. [변경과 검증 범위](vintage-style.md) · [렌더링 화면](screenshots/vintage/vintage-overview.png).

---


## 수조 안쪽 면 겹침 제거 — 2026-11-08

수조 벽의 윗부분이 테두리의 안쪽 수직 면과 15.5cm 높이로 겹쳐 있었습니다. 또한 통로 바닥판의 옆면이 수조 내부 벽과 같은 위치에 있어 물 아래에 베이지색 띠가 드러났습니다. 벽 몸체를 테두리 하단에서 끝내고, 표시용 통로 바닥판의 구멍을 수조 외벽까지 넓혀 두 중복 면을 제거했습니다. 벽 모서리의 숨은 1cm 돌출부도 외벽 경계에 맞췄습니다. 수면·타일·물 셰이더·카메라·충돌용 바닥·낚시/UI는 유지했습니다.

실제 메시 레이 검사에서 수정 전에는 서로 다른 면의 거리가 약 6e-10m로 겹침을 재현했습니다. 수정 후 네 방향의 바닥/테두리 높이 24개 레이가 중복 없이 통과합니다. `npm run check`: 16개 파일 / 92개 단위 검사와 린트·타입·자산·빌드 통과. Chromium / Apple M4 / ANGLE Metal 브라우저 E2E 3개(이동·시점 회전·양쪽 수조/물 품질 변경/낚시 상호작용)를 통과하고 전후 화면을 직접 비교했습니다. Safari와 실제 VR 헤드셋은 미검증입니다. [수정 전](screenshots/pool-seams-before/pool-seams-near.png) · [수정 후](screenshots/pool-seams-after/pool-seams-near.png) · [브라우저 기록](pool-seams-browser.json).

---


## 맑은 수면·실제 수중 타일·반사/굴절 — 2026-11-08

사용자의 맑은 물/적갈색 타일 레퍼런스와 기존 공간 스크린샷에 맞춰 물만 교체했습니다. 수중 바닥을 실제 타일 240개 인스턴스와 줄눈 받침으로 구성하고, 별도 수면 ShaderMaterial에서 실제 장면의 굴절·평면 반사·미세 파동·깊이별 흡수를 합성합니다. 기존 반복 빛무늬를 제거하고 약한 비주기 바닥 빛만 남겼습니다. 물결 높이는 최대 약 1.8mm이고 찌 주변에만 작은 링이 남습니다. 타일층 높이는 -0.65m, 수면은 기존 0.385m로 약 1.035m 깊이입니다. 기존 수조 벽·테두리, 건물·가구·사람·UI·이동·낚시 상태 코드는 보존했습니다.

단위 16개 파일 90개와 린트·타입·GLB·빌드를 통과했습니다. 실제 Chromium 158 / Apple M4 / ANGLE Metal에서 물 검수와 걷기·충돌·착석·투입·가상 시계 포획·회수·일어나기 E2E 2개를 통과했습니다. 내려다본 시점/반대편/모바일 스크린샷을 직접 확인했습니다. SwiftShader의 HDR 번짐은 소프트웨어 GPU에서 후처리를 건너뛰도록 보완했으며, 실제 GPU의 기존 조명·후처리는 유지합니다. Safari 및 실제 헤드셋은 미검증입니다. [구현·설정·검증 기록](clear-water.md).

---


## 전체 공간 베벨 세그먼트 2 — 2026-11-08

Blender의 Bevel Segments=2 기준으로 기둥·보·창틀·벽·바닥 부재·수조·의자·선반·도구함 등의 사각 부재 1,024개에 모서리 두 단계 단면을 적용했습니다. 평평한 큰 면은 단일 사각형으로 유지하며, 두께는 최단변의 12% 이하/최대 1.5cm입니다. 동일 크기의 지오메트리 81종을 공유하고 병합 후 남는 캐시를 정리합니다. 실제 웹 메시를 수정한 것이며 별도 원본 .blend 파일은 변경하지 않았습니다.

15개 파일 86개 테스트와 린트·타입·GLB·빌드 검사가 통과했습니다. 베벨 단면 0°/45°/90°, 닫힌 메시와 바깥 방향의 면, 외곽 치수 유지, 공유 지오메트리 정리와 기존 면 겹침 회귀를 검사했습니다. 전체 준비 메시의 삼각형 수는 102,398개(숨긴 요소 포함)입니다. 실제 GPU FPS/브라우저 시각 검수는 하지 못했습니다. [설정·적용 기록](bevel-segments-two.md).

---


## 이동 중 면 깨짐 수정 — 2026-11-08

첨부 Safari 화면에서 확인된 창틀/벽의 깜박임 원인을 찾았습니다. 두께가 같은 창틀과 벽의 앞·뒷면이 같은 평면에 있었으며, 바닥판도 네 모서리에서 겹쳤습니다. 창틀을 벽보다 4cm 앞으로 돌출시키고 표시용 바닥판을 겹치지 않는 네 영역으로 분리했습니다. 충돌 바닥의 연결 범위는 유지했습니다. 간판의 회전 방향에 맞춰 받침판을 뒤로 옮겼습니다. 그림자 해상도와 바이어스, 낚시터 카메라의 깊이 범위도 보정했습니다.

14개 파일 83개 테스트와 린트·타입·GLB 검사·프로덕션 빌드가 통과했습니다. 창틀/벽 깊이 분리, 표시 바닥판 면적/겹침, 회전 간판 앞면을 실제 메시 경계와 레이로 검사했습니다. Safari 화면의 실제 이동 후 시각 재검수는 하지 못했습니다. [원인·변경 기록](surface-artifacts.md).

---


## 셰이더 그래픽 · 무작위 낚시 · WASD 개선 — 2026-11-08

낚시터의 필름 톤·그림자·약한 발광, GPU 수면/바닥 빛무늬와 반사 하이라이트를 추가했습니다. 매 투입 60~300초 후 자동 포획, 결과와 재투입, 회수/이동/퇴장 취소를 구현했습니다. 빈 공간 시점에서 전체 장면 레이 검사를 생략하며, 실제 장면의 Node CPU 측정은 약 0.634ms → 0.076ms였습니다. 전체 FPS 측정은 아닙니다. 13개 파일 80개 테스트가 통과했고 브라우저/헤드셋은 실행 권한 제한으로 미검증입니다. 작업 중 프로젝트가 `공간 실험` 폴더로 이동됐으며 소스가 그 위치에 보존돼 있습니다. [상세 변경·검증 기록](rendering-fishing-update.md)을 확인하세요.

---


## 실내 낚시터 추가 — 2026-11-08

현재 `낚시터` 폴더에 기존 플랫폼의 사본을 만들고 코드 기반 목조 낚시터를 등록했습니다. 원본 플랫폼은 보존했습니다. 직접 입장 `/?fishing`, 기존 서비스의 혼자 활동해요, 기존 `/?lab=1` 월드 목록에서 이용할 수 있습니다.

15×11m 실내, 깊이 있는 8×4.5m 수조, 12개 좌석, 샘플 NPC 5명, 장비와 창밖 나무를 만들었습니다. 공통 입력 행동으로 착석·찌 투입/회수·일어남, 충돌과 XR 리그 착석을 연결했습니다. 개별 월드를 엔진에서 import하지 않고 config 행동 수명주기를 추가했습니다. 의존성은 변경하지 않았습니다.

현재 린트·타입·빌드·프로덕션 진단 분리·GLB 검사와 12개 파일/74개 테스트가 통과합니다. 실제 메시를 대상으로 한 레이 상호작용과 자원 해제를 포함합니다. **이번 변경의 브라우저 E2E·스크린샷·GPU 성능·실제 헤드셋은 미검증**입니다. 소켓 제한과 브라우저 테스트 확장 실행 미승인으로 시각 검수를 완료하지 못했습니다. 아래의 v0.4.0 브라우저 성공 기록은 이전 작업 결과입니다.

첨부 참고 이미지에 맞춰 목재·벽·바닥·수조 색상, 두꺼운 보/기둥/창틀, 인물의 각진 옷·머리·손 위치·작은 팔 움직임을 추가 보정했습니다. 보정 뒤 `npm run check`도 통과했습니다. 화면 비교 검수는 아직 하지 못했습니다.

구조, 조작, 주요 변경 파일, 검증 환경과 남은 절차는 [실내 낚시터 구현 기록](indoor-fishing.md)에 정리했습니다. 다음 단계는 `npm run test:e2e`로 작성된 낚시터/기존 서비스 시나리오를 실행해 이미지 3종과 성능 측정치를 수집하고, 실제 헤드셋에서 검증하는 것입니다.

---


## 4단계 최종 결과 — Figma 9주차 통합 서비스 v0.4.0

작업일 **2026-11-07 (Asia/Seoul)**. 기존 프로젝트를 유지해 기본 `/`에 통합 서비스를 연결했습니다. 이전 엔진 UI는 `/?lab=1`입니다. [수정 파일 전체 목록](changes-v0.4.md), [원본 노드/신규 화면 감사](design-audit.md), [모바일 실기기 절차](cardboard-testing.md)를 함께 확인하세요.

### 실제 최종 검사

| 명령/검사 | 실제 결과 |
| --- | --- |
| `npm run typecheck` | 통과 |
| `npm run lint` | 통과 |
| `npm test` | **11개 파일 / 68개 통과**, 기존 55개 유지 + 서비스/VR 입력 순수 로직 13개 |
| `npm run build` | 통과, production E2E 진단 제거 검사 통과 |
| `npm run check` | 최종 lint → 단위 → GLB → 타입/빌드 전체 통과 |
| 로컬 HTTP | 네트워크 허용 실행에서 **200**, 임시 서버 종료 |
| `npm run validate:assets` | 포함 GLB glTF 2.0 Validator **오류 0 / 경고 0** |
| `npm run test:e2e` | **19개 통과**, 97.5초. 실패/skip/flaky/retry 0 |
| `npm run compare:figma` | 원본 13개 비교 이미지/차이/metrics 생성 |
| `npm audit --omit=dev` | **0건** |
| 전체 `npm audit` | 기존 **moderate 10건**, 기능과 무관한 강제 업그레이드 없음 |

PC 전체 흐름과 모바일 Chromium(844×390, touch/isMobile, DPR 2) 전체 흐름이 통과했습니다. 실제 GLB 월드 ID와 저장된 아바타/생활권/평가/채팅/참여자/약속을 확인했습니다. 정상 서비스 시나리오의 pageerror/requestfailed 0건입니다. production 서비스 온보딩과 기존 GLB/개발 진단 제거도 통과했습니다.

**Cardboard 전체 흐름**은 DOM click으로 선택을 대신하지 않고, 실제 pointer drag로 카메라를 돌린 뒤 렌더된 평면의 Ray hit와 1.2초 dwell을 사용했습니다. 로그인 → 동네 → 홈 → A → 전진 후 실제 플레이어 좌표 변화 → 종료/별점 → 홈 → 데모 채팅 → 약속 → VR 종료가 통과했습니다. 별도 로그인 시선 검사도 통과했습니다. 이 결과는 데스크톱 Chromium의 드래그 체험이며 실제 휴대폰 센서 추적 검증은 아닙니다.

기존 엔진 회귀 12개는 A/B/GLB, 실제 WASD·Pointer Lock·충돌·클릭 색 변경, 월드/모델 정리, 실제 404·잘못된 GLB·지연 응답 취소, production을 계속 검증합니다. 모델 로딩을 가짜 성공으로 처리하지 않았습니다.

### 원본과 직접 비교한 범위

13개 원본-구현 나란히 보기 이미지를 직접 열어 배치/문구/아이콘/사진을 확인했습니다. 원본 기준 리뷰 모드는 기본 상태를 비교하며, 실제 서비스는 이름·선택·평가·현재 달력 데이터가 바뀝니다. 전체 화면 이미지를 앱 UI로 사용하지 않았습니다.

RGB 채널 평균 절대 차이는 **0.12~2.39 / 255**, 최대 채널 차이 20 초과 픽셀은 **0.16~3.11%**입니다. 이 수치는 화면의 배경 비중과 래스터화에 영향을 받으며 디자인 품질 점수/완전 동일성을 뜻하지 않습니다. 남은 차이는 글꼴 안티앨리어싱, Figma glass의 반사·굴절, 지도 흐림/반투명 표면입니다. Canvas VR의 backdrop blur는 별도 근사입니다.

직접 연 실제 서비스 이미지는 PC 마이룸, 모바일 약속 완료, Cardboard 로그인과 약속 완료입니다. 양안에 같은 내용의 공간 패널이 렌더링된 것을 확인했습니다. 실제 광학 장치에서 중앙 잘림/시차/가독성이 통과했다는 의미는 아닙니다.

스크린샷은 `test-results/screenshots/`의 기존 5장, `figma-*.png` 13장, `service-{pc,mobile}-{my-room,simulation,appointment}.png` 6장, `service-mobile-cardboard-{login,avatar}.png` 2장, `service-cardboard-appointment.png`입니다. 비교는 `test-results/design-comparison/`, 테스트 결과는 `test-results/e2e-results.json`과 `playwright-report/`입니다.

### 발견·해결한 문제

- 로그인 전 VR 안내 접근이 차단되던 route guard를 수정했습니다.
- 같은 데모 로그인 동작을 가진 두 원본 버튼 때문에 E2E strict locator가 실패하여 명시적 첫 버튼을 선택했습니다. 실제 기능 성공 처리를 바꾸지 않았습니다.
- 작은 모바일 화면에서 하단 시스템 버튼이 계속하기 버튼을 가리던 문제를 패널 가용 높이와 전용 하단 영역으로 해결했습니다. 강제 click으로 우회하지 않았습니다.
- `display:contents` 스타일 누락으로 평가 완료 사용자 카드에 좌표가 두 번 적용되던 문제를 CSS 변환과 VR painter에서 수정했습니다.
- 동적 완료 문구 교체 시 원본 line-height 자식 요소가 제거되어 줄이 겹치던 문제를 자식 문단을 보존하도록 수정했습니다.
- 원본 SVG의 foreignObject backdrop 효과가 img 밖 지도에 적용되지 않아 별도 DOM mask/blur로 보완했습니다. 단순 버튼에 불필요하게 붙던 glass 테두리도 제거했습니다.
- 불가능한 날짜/잘못된 장소·참여자, 손상된 localStorage 내용 검증을 추가했습니다.
- 제한된 실행에서 별도 localhost curl 요청이 연결 코드 000/exit 7로 실패했습니다. 타입/린트/테스트/빌드는 그 전에 모두 통과했으며, 네트워크 접근 가능한 실행으로 임시 서버에 재요청하여 HTTP 200을 확인한 뒤 종료했습니다. Chromium E2E도 로컬 서버를 정상 사용했습니다.

### 남은 제한과 실제/데모 구분

실제 구현: 3D 렌더·월드 이동/충돌/리소스 정리·GLTFLoader·화면 입력과 전환·별점 검증·로컬 저장·양안·시선 Ray/dwell·센서 API 연결.

데모: 로그인 상태, 친구/서버 인원, 채팅/초대 내역, 약속 데이터. 메시지 발송·실시간 접속·외부 예약은 없습니다. 지도는 Figma 원본 예시이며 장소 좌표/API와 연동하지 않습니다. 최종 아바타 대신 선택 색상을 반영한 capsule/구체가 홈에 보입니다.

미검증: 실제 iPhone Safari/Android Chrome 센서 허용·거절과 축/추적, VR 박스 렌즈·왜곡/IPD·가독성·발열/성능, WebXR 헤드셋/컨트롤러, 최종 Blender 자산. 광학 왜곡 보정·viewer profile·6DoF 휴대폰 위치 추적은 미구현입니다. 신뢰된 HTTPS 실기기 접속 환경은 별도 준비해야 합니다.

Three.js 번들 **578.05KB / gzip 143.34KB**의 500KB 경고와 개발 도구 보안 경고 10건을 유지·기록했습니다. 외부 배포/인증서 설치는 하지 않았습니다. 별도 임시 QA 서버는 검사 후 종료하며 사용자 실행 서버는 건드리지 않습니다.

---

## 3단계 완료 — PC·VR 공통 조작 코드와 자동 검증

작업일: **2026-11-07 (Asia/Seoul)**, **v0.3.0**. 기존 엔진/월드 A/B/GLB fixture를 유지하고 부족했던 XR 입력과 공통 상호작용만 확장했습니다. 회원가입·최종 UI/공간/아바타·멀티플레이·마이룸·음성·DB는 추가하지 않았습니다.

### 사전 점검과 기준 결과

[구현 수준 점검](implementation-status.md)에 구현 완료/부분 구현/미구현/실기기 미검증을 구분했습니다. 변경 전 `npm run check`에서 타입·린트·28개 단위 테스트·GLB 검증·빌드가 통과했고, 기존 Chromium E2E **10개가 36.0초에 통과**했습니다. 기존 월드/로더/정리 로직은 재개발하지 않았습니다.

### 추가한 코드

- PC와 분리된 native XRInput 및 순수 XRInputMapper: inputSources 상태, xr-standard thumbstick axes[2,3], deadzone, 중립 재무장, 연결/분리/포커스 처리, 표준 select 이벤트
- 기본 teleport/snap 편의 설정과 선택식 smooth 이동/회전. 기본 30도 snap은 중립 후 한 번만 실행하며 연속 회전과 설정을 분리
- 같은 PlayerController.update/CollisionSystem으로 PC 이동과 VR 스틱/실제 머리 tracking delta를 처리. 가상 발 feet와 tracking origin rig를 구분하고 머리 중심 snap 피벗, 리센터 흡수, 종료 시 PC 위치/최종 수평 시선 복구
- TeleportSystem: 직선 Ray 바닥 후보, 유한 좌표/거리/영역/같은 높이/몸 반경·현재 머리 높이/장애물·벽·바닥 틈/시야 검증. release 프레임 재검사 후에만 확정
- XRControllerSystem 조립 및 XRVisuals Ray·목적지·head-locked 안내/선택 결과·경계/추적 이상 암전. 알 수 없는 매핑은 이동을 추측하지 않고 Ray만 사용
- PC/XR 공통 InteractionSystem: 입력별 hover/BoxHelper 강조, 머리/관찰자와 컨트롤러 양쪽의 가림 검사, 같은 action/messages, 색 변경/원상 복원
- world.interactions 이름 바인딩과 고유 재질 분리. A/B 버튼과 실제 GLB Pedestal 연결, world.teleport/xr 설정
- 월드/세션 전환에서 hover helper·선택 메시지·입력 제스처·참조 이벤트·설정을 초기화. Engine.enterWorld가 VR 중 요청되면 먼저 세션 종료를 기다림

### 최종 실행 결과

| 검사 | 실제 결과 |
| --- | --- |
| `npm run typecheck` | 통과 (독립 실행 및 build 내부) |
| `npm run lint` | 통과 |
| `npm test` | **10개 파일 / 55개 통과**. 기존 28개 + 신규 27개 |
| `npm run validate:assets` | GLB Validator 오류 **0**, 경고 **0** |
| `npm run build` | 통과. 앱 약 48.09KB, GLTFLoader 46.42KB, Three.js 573.51KB |
| `npm run check` | 위 린트·단위·GLB·타입/빌드 전체 통과 |
| `npm run test:e2e` | **12개 통과, 실패/skip/flaky/retry 0**, 최종 약 **45.1초** |
| 런타임 예외 | 기록된 Chromium pageerror **0건** |
| 예상하지 않은 console/network/HTTP 오류 | **0건**, 의도한 누락 GLB URL 404만 별도 허용/수집 |
| 프로덕션 분리 | 개발 진단/오류 fixture 미포함 검사 및 실제 production GLB 로딩 통과 |
| 실제 VR 헤드셋·컨트롤러 | **미검증** |

환경: macOS arm64, Node 26.13.0/npm 11.20.0, Three.js 0.187.0, Playwright 1.65.0 / Chromium 158.0.8127.18 / SwiftShader WebGL2. 새 의존성을 설치하거나 기존 라이브러리를 업데이트하지 않았습니다. package/lock 버전만 0.3.0으로 맞췄습니다. Three.js 번들 크기 경고는 그대로 남아 있고 경고 기준을 높여 숨기지 않았습니다. 기존 개발 도구 minimatch 경고는 이번 무의존성 변경으로 해결하지 않았습니다.

### 무엇을 실제로 테스트했는지

- Chromium: 기존 WASD 좌표 변화·마우스 yaw·Esc·충돌·월드 전환·GLB 로딩/자원 정리·오류 복구를 유지했습니다. 새 강조/선택 UI, GLB Pedestal 노드 접근·마우스 선택·색 변경, VR 편의 설정 기본값/초기화도 실제 페이지로 검사했습니다.
- 순수 XR 로직 **19개**: 표준 입력·deadzone·단발 snap·smooth delta 제한·제스처 취소·추적 원점/머리 피벗·공통 충돌·PC 복귀·텔레포트 영역/벽/틈/머리 높이 경로 검사 등입니다.
- 합성 native 경계 **5개**: EventTarget 세션·합성 XRFrame 포즈·시각 sink로 select 소비/hidden 차단, 공통 액션 dispatch, 실제 TeleportSystem을 통한 release 확정, 추적 손실/리센터 정리를 연결 검사했습니다.
- 공통 상호작용 추가 **3개**: PC/XR 동일 논리 ID 액션, 강조/정리, 공유 GLB 재질 격리·이름 오류, 가상 벽 너머 물리 컨트롤러 선택 차단입니다.
- 합성 XRFrame/입력 테스트는 실제 WebXR 드라이버, 양안, 컨트롤러 추적이나 실제 움직임의 증거가 아닙니다. VR HUD의 기기 내 가독성과 보정의 편안함도 미검증입니다.

### 산출물과 변경 파일

추가:

- `src/engine/input/XRInput.ts`
- `src/engine/player/TeleportSystem.ts`
- `src/engine/interaction/bindInteractions.ts`
- `src/engine/xr/settings.ts`, `XRControllerSystem.ts`, `XRVisuals.ts`
- `tests/xr-locomotion.test.ts`, `tests/xr-runtime.test.ts`
- `docs/implementation-status.md`, `docs/blender-workflow.md`, `docs/vr-device-checklist.md`

수정:

- `src/engine/core/Engine.ts`, `src/engine/player/PlayerController.ts`, `src/engine/interaction/InteractionSystem.ts`, `src/engine/xr/XRManager.ts`
- `src/engine/world/types.ts`, `createWorld.ts`
- `src/worlds/test-world-a/config.ts`, `test-world-b/config.ts`, `glb-test-room/config.ts`
- `src/ui/AppUI.ts`, `styles.css`, `src/dev/engineDiagnostics.ts`
- `tests/interaction.test.ts`, `tests/glb-world.test.ts`, `tests/e2e/worlds.spec.ts`
- `package.json`, `package-lock.json` (버전만 변경, 의존성 변경 없음)
- README / architecture / adding-worlds / testing / next-steps / progress

WorldManager·ModelLoader·CollisionSystem·World Registry·기존 GLB 바이너리는 변경 없이 재사용했습니다.

스크린샷은 `test-results/screenshots/`에 기존 A/B/GLB/오류 4장과 새 **glb-interaction.png**를 저장했습니다. 최신 `glb-interaction.png`와 A 이미지는 직접 열어 GLB 메시·선택 강조/문구·색 변경과 A 렌더링을 확인했습니다. VR 스크린샷은 생성/확인하지 않았습니다. JSON/HTML/console/network 결과는 `test-results/e2e-results.json`, `playwright-report/`, `test-results/browser-logs/`에 있습니다. E2E가 실행한 서버는 종료되며 기존 일반 개발 서버는 건드리지 않았습니다.

### 설계상 제한과 다음 단계

충돌은 같은 높이의 평면/정적 AABB입니다. 높이 변화/계단/경사/triangle collision은 미구현입니다. 실제 몸을 물리적으로 막을 수 없으므로 **가상 발 clamp + rig 보정 + 경계/추적 이상 암전** 정책을 구현했고 편의성은 장치 테스트가 필요합니다. 스틱 없는/비표준 매핑의 자동 추정, 컨트롤러 자체 모델, 포물선 teleport, 고급 VR 메뉴/내부 월드 전환은 아직 없습니다.

[VR 체크리스트](vr-device-checklist.md)는 전 항목 미수행입니다. 실제 기기로 양안/local-floor/연결/매핑/gesture/머리 충돌 보정/리센터/세션 종료를 확인한 뒤 정책을 조정하고, 최종 Blender 자산은 [내보내기 규격](blender-workflow.md)에 맞춰 별도 검증합니다.

공식 확인: [WebXR Device API](https://www.w3.org/TR/webxr/)와 [Gamepads Module](https://www.w3.org/TR/webxr-gamepads-module-1/), [Three.js WebXRManager](https://threejs.org/docs/pages/WebXRManager.html). 설치된 r187 소스/타입의 카메라 갱신과 프레임/세션 API를 확인했으며 Meta SDK 등 추가 XR 라이브러리는 사용하지 않았습니다.

## 2단계 완료 — 실제 브라우저 및 GLB 검증

작업일: **2026-11-07 (Asia/Seoul)**, 프로젝트 **v0.2.0**. 기존 프로젝트와 핵심 클래스 구조를 유지했으며 A/B를 삭제하거나 엔진을 재작성하지 않았습니다.

### 기준 상태

수정 전에 README, AGENTS, architecture/progress/next-steps/adding-worlds, engine/worlds, package.json을 읽고 `npm run check`를 실행했습니다. **기존 7개 파일·25개 테스트, lint, 타입 검사와 빌드가 통과**했습니다. 기존 Three.js 번들 크기 경고와 개발 의존성 보안 경고도 확인했습니다.

### 새 구현과 보강

- Playwright **1.65.0**, 공식 Chromium **158.0.8127.18** 기반 실제 E2E 10개와 production preview 검사를 추가했습니다.
- 정상적인 glTF 2.0 GLB 방을 생성해 포함했습니다. **2,880 bytes**, 방/벽/기둥/받침대 **8개 mesh**, 외부 파일·텍스처·압축 없음.
- Khronos `gltf-validator 2.0.0-dev.3.10`을 개발 도구로 사용했습니다. 생성/검증 명령과 실제 GLTFLoader 파싱 검사를 추가했습니다.
- GLB Test Room을 registry에 추가하고 위치 `[2,0,-1]`, Y 회전 `π/2`, scale `[1.2,1,1.2]` 및 실제 world bounds를 검증했습니다.
- floors/boxes의 `visible:false`로 시각 GLB와 충돌 프록시를 분리했습니다. 기존 CollisionSystem의 평면/AABB 방식과 A/B 기본값은 유지합니다.
- 로딩 중 UI에서 다른 월드로 전환할 수 있게 했습니다. WorldManager의 최신 요청 우선·이전 월드 보존/정리 로직은 기존 구현을 재사용했습니다.
- GLTFLoader에 모델 MIME Accept 헤더와 원본 Error.cause 보존을 추가해 누락 파일의 실제 404 및 파싱 실패를 처리했습니다.
- 읽기 전용 진단과 오류 fixture는 DEV + e2e 모드에만 동적 import합니다. production bundle 및 production Chromium에서 노출되지 않음을 확인했습니다.
- 실제 브라우저에서 발견한 Pointer Lock 직후 첫 이동키 유실 경쟁 조건을 수정했습니다. 획득 때 키를 지우지 않고 상실 때만 초기화합니다. Escape 키에서 명시적으로 잠금을 해제합니다.

### 최종 실제 실행 결과

최종 코드를 저장한 후 `npm run typecheck` → `npm run check`(내부 lint → test → validate:assets → build/typecheck) → 경로 인자를 준 validate:assets → `npm run test:e2e`를 순서대로 실행했습니다.

| 요청 명령/검사 | 실제 최종 결과 |
| --- | --- |
| `npm run typecheck` | **통과** (독립 실행 및 build 내부 실행) |
| `npm run lint` | **통과** (check 내부 실제 실행) |
| `npm test` | **8개 파일·28개 통과**: 기존 25개 + 신규 3개 |
| `npm run validate:assets` | **오류 0 / 경고 0 / info 0 / hint 0** |
| `npm run validate:assets -- public/assets/models/test-room/scene.glb` | **통과** (사용자 파일 경로 인자도 검사) |
| `npm run build` | **통과**. 앱 약 29.99KB, GLTFLoader 약 46.42KB, Three.js 약 571.45KB |
| production 분리 스크립트 | **통과**: JS 번들에 개발 진단/음성 테스트 fixture 문자열 없음 |
| 개발 서버 4173 / production preview 4174 | **양쪽 HTTP 200** 터미널 및 브라우저 확인 |
| `npm run test:e2e` | **10개 통과, 실패 0, skip 0, flaky 0, retry 0**, 약 **36.6초** |
| 브라우저 JavaScript pageerror | **10개 테스트 모두 0건** |
| 예상하지 않은 console/network/HTTP 오류 | **0건**. 누락 모델 테스트의 해당 URL 404만 예상 오류로 수집 |
| 온라인 `npm audit --omit=dev` | **0건** |
| 온라인 전체 `npm audit` | 기존과 같은 **moderate 10건**, 개발 의존성 minimatch 계열 |

검사 OS는 macOS arm64, Node 26.13.0 / npm 11.20.0입니다. 기존 Three.js/Vite/TypeScript/ESLint 버전은 바꾸지 않았습니다. Playwright·Khronos validator·Node 타입만 개발 의존성으로 추가했습니다. 물리 GPU 대신 **실제 Chromium WebGL2 + ANGLE SwiftShader**를 사용했습니다.

반복 모델 교체에서 매번 활성 모델/root 1개와 새로운 UUID를 확인했습니다. GLB/A 5회 왕복 후 실제 관찰한 dispose 이벤트는 geometry **51회**, material **69회**였고 퇴장 후 renderer geometry counter는 **0**, 내부 texture counter는 **1**이었습니다. 이는 Three.js 관리 수치이며 실제 GPU 바이트/브라우저 전체 메모리 또는 모든 내부 텍스처의 0 회수를 주장하지 않습니다. fixture에는 텍스처가 없어 최종 Blender 텍스처 수명 검증은 별도로 해야 합니다.

### 브라우저 검사 내용

1. 정상 페이지/실제 WebGL2 canvas 생성, 자연스러운 VR 미지원 및 PC fallback
2. A/B 입장·전환·퇴장·재진입, 월드별 spawn, 이전 root 제거
3. 실제 Pointer Lock과 키보드 W/A/S/D에 따른 플레이어 좌표 변화, 마우스 yaw, Escape 해제
4. 큐브를 계속 밀어도 충돌 경계를 넘지 않음, 가까이서 실제 클릭해 색 변경
5. 실제 파일의 HTTP 200·GLB magic/version·GLTFLoader decode·8개 mesh·transform/bounds
6. 반복 모델 교체 시 자원 dispose, 모델 중복 방지와 renderer geometry 수 안정성
7. 실제 누락 모델의 404 후 이전 월드/위치 유지, B로 복구
8. 잘못된 binary를 주는 명시적 음성 fixture의 파싱 실패 후 실제 GLB로 복구
9. 실제 GLB 요청을 지연한 동안 UI로 다른 월드 전환/취소하고 늦은 결과 무시
10. 실제 production 빌드의 정상 GLB 로딩, 정상 월드 3개만 존재, 개발 진단 전역 없음

테스트 상태를 가짜 성공으로 만들지 않았습니다. 진단 전역은 관찰만 하며 위치 변경/로딩 완료/XR 지원 강제 설정 API가 없습니다. 잘못된 bytes와 지연 응답은 실패·경쟁 조건 재현을 위한 명시적인 route 처리이고 정상 경로의 renderer·입력·loader는 실제 구현입니다.

### 스크린샷과 로그

요청한 4장을 **최종 E2E 실행에서 생성했고 로컬 이미지 도구로 모두 직접 열어 시각적으로 확인**했습니다. 기준 이미지와 자동 픽셀 비교하는 visual regression은 아직 없습니다.

- `test-results/screenshots/test-world-a.png`: 민트색 큐브·회색 장애물·바닥 격자와 A 준비 완료 UI
- `test-results/screenshots/test-world-b.png`: 갈색 계열의 중앙 파티션·장애물과 B 준비 완료 UI
- `test-results/screenshots/glb-test-room.png`: GLB 바닥/벽·민트색 기둥·주황 받침대와 GLB 준비 완료 UI
- `test-results/screenshots/model-loading-error.png`: 기존 A 화면 유지와 누락 모델 경로의 오류 메시지

결과 JSON: `test-results/e2e-results.json`. 실제 console/network/최종 snapshot/renderer 정보: `test-results/browser-logs/`. Validator: `test-results/gltf-validation.json`. HTML 보고서: `playwright-report/index.html` (`npx playwright show-report`). 산출물/브라우저 캐시는 Git 및 ESLint 대상에서 제외합니다. E2E가 실행한 4173/4174 서버는 실행 후 종료했습니다. 별도 사용자의 5173 개발 서버는 건드리지 않았습니다.

### 발견한 실패와 수정

- **Headless Shell GPU 프로세스 종료**: `icudtl.dat not found in bundle` / `Invalid file descriptor to ICU data received`가 발생했습니다. 파일은 패키지에 있었지만 해당 실행 모드에서 자원을 찾지 못했습니다. 바이너리를 패치하거나 테스트를 건너뛰지 않고 Playwright 공식 `channel:'chromium'` 새 headless 모드로 변경해 실제 WebGL을 실행했습니다.
- **favicon 404**: console error 수집이 실제 누락을 발견했습니다. 로컬 SVG favicon과 index의 링크를 추가해 해결했습니다. 허용 목록으로 숨기지 않았습니다.
- **브라우저 캐시까지 lint됨**: `.playwright-browsers/` 아래 Chromium 배포 파일에 린트가 적용되었습니다. 제3자 브라우저 캐시만 ESLint ignore에 추가했습니다.
- **잠금 직후 이동키 유실**: 비동기 pointerlockchange 획득 이벤트가 keydown 후 실행되며 키를 지웠습니다. 잠금 상실 때만 초기화하도록 바꾸고 실제 이동/충돌 E2E로 재검증했습니다.
- **Escape 해제**: 자동 입력에서 브라우저 기본 Escape 처리만으로는 잠금 해제가 일어나지 않았습니다. 앱 입력 계층에 명시적인 Escape 해제를 추가했고 실제 document.pointerLockElement가 null이 되는지 검사했습니다.
- **테스트 자체의 입력 방법**: range는 fill 대신 실제 ArrowRight 키로 조작하고, collision 기대값은 실제 큐브 위치/폭과 플레이어 반경으로 계산한 경계에 맞췄습니다. 기능 값을 변경해서 테스트를 통과시키지 않았습니다.
- **최초 회귀 실행**에서는 환경/입력 문제로 실패했으나 수정 후 전체 10개가 스킵 없이 통과했습니다. 후속 정상 실행만을 기준으로 최종 결과를 기록하며 초기 실패 원인도 남깁니다.

### 수정/추가한 파일 목록

| 구분 | 파일 |
| --- | --- |
| GLB 월드/자산 (추가) | `src/worlds/glb-test-room/config.ts`, `layout.json`, `public/assets/models/test-room/scene.glb` |
| 개발 전용 관찰/오류 fixture (추가) | `src/dev/engineDiagnostics.ts`, `src/dev/e2eWorlds.ts` |
| 자동화 설정/스크립트 (추가) | `playwright.config.ts`, `vitest.config.ts`, `scripts/generate-test-glb.mjs`, `scripts/validate-assets.mjs`, `scripts/check-production.mjs` |
| 테스트 (추가) | `tests/glb-world.test.ts`, `tests/e2e/fixtures.ts`, `tests/e2e/worlds.spec.ts`, `tests/e2e/production.spec.ts` |
| 엔진 소규모 수정 | `src/engine/world/types.ts`, `createWorld.ts`, `src/engine/assets/ModelLoader.ts`, `src/engine/input/DesktopInput.ts` |
| 앱 조립/UI/등록 수정 | `src/main.ts`, `src/ui/AppUI.ts`, `src/worlds/registry.ts` |
| 테스트 mock 호환 수정 | `tests/model-loader.test.ts` (실제 loader의 Accept 헤더 메서드 반영; 기존 검사 의도 유지) |
| 설정 수정 | `package.json`, `package-lock.json`, `tsconfig.json`, `eslint.config.js`, `.gitignore`, `index.html`, `AGENTS.md` |
| favicon (추가) | `public/favicon.svg` |
| 문서 갱신 | `README.md`, `docs/architecture.md`, `docs/progress.md`, `docs/adding-worlds.md`, `docs/testing.md`, `docs/next-steps.md`, `public/assets/models/README.md` |

WorldManager, PlayerController, CollisionSystem, InteractionSystem, XRManager와 A/B config는 그대로 유지했습니다. 엔진이 UI나 개별 월드 모듈을 import하지 않는 경계도 유지했습니다.

### 남은 검증/다음 단계

- 실제 Safari 및 다양한 PC GPU에서 화면/입력/성능/모바일 레이아웃을 별도 확인합니다. 이번에는 Safari를 열거나 제어하지 않았습니다.
- 실제 헤드셋의 WebXR 세션·추적·local-floor·종료/재진입은 **미검증**입니다. Chromium 통과를 VR 기기 검증으로 취급하지 않습니다.
- 최종 Blender 모델의 텍스처/애니메이션/압축/규모/재질과 충돌 프록시는 개별 검증이 필요합니다. 이번 fixture의 호환성만 확인했습니다.
- 평면/AABB 충돌은 유지했고 물리 엔진/triangle 충돌, 아바타, 계정, 마이룸, 멀티플레이, 음성을 추가하지 않았습니다.
- 다음 VR 컨트롤러 단계는 InputSource → PlayerController → MovementCollision 및 interaction action 경계에 어댑터를 연결할 수 있는 상태입니다. 스틱/레이/VR 내부 UI는 아직 구현하지 않았습니다.
- 기존 개발 의존성 moderate 10건과 Three.js 번들 크기 경고는 남아 있습니다. 이번 기능과 무관한 메이저 업그레이드/force override는 하지 않았습니다.

## 1단계 기록 (이전 시점의 결과)

아래는 2단계 이전 기록입니다. 당시 미검증이었던 Chromium/임시 GLB 항목은 위 2단계 결과로 갱신되었습니다. VR 실기기는 계속 미검증입니다.

작업일: **2026-11-07 (Asia/Seoul)**. 이번 범위는 첫 번째 공통 엔진 프로토타입입니다.

## 작업 폴더 확인

사용자가 지정한 `VR 서비스` 폴더는 비어 있었습니다. `xr-spatial-platform/` 하위 폴더를 새로 만들었으며 기존 파일 삭제/덮어쓰기는 없었습니다. 상위/작업 폴더에서 기존 AGENTS.md를 찾지 못해 프로젝트 개발 규칙을 새로 작성했습니다.

## 단계별 구현

1. Vite/TypeScript/Three.js, strict 타입 설정, ESLint, Vitest, 검사 스크립트를 구성했습니다. 공식 npm 버전과 peer dependency를 확인했습니다.
2. 월드 타입/registry, 비동기 생명주기, 자원 해제, ModelLoader 어댑터, 평면/AABB 충돌을 구현했습니다. 초기 타입 검사에서 Vite 번들 옵션 오류를 발견해 수정했습니다.
3. A/B 월드와 PC 입력/공통 이동/renderer, 공식 VRButton과 지원 감지, DOM UI를 연결했습니다. 타입 검사 및 빌드를 실행하고 컴파일 오류·CSS 경고를 수정했습니다.
4. 핵심 로직 자동 테스트 25개를 작성하고 전체 검사를 통과했습니다. 로컬 개발 서버의 HTTP 응답을 확인했습니다.
5. 설계, 모델 연결, 테스트 절차, 다음 개발 단계 문서를 작성했습니다.

## 구현 완료

- 월드 config와 엔진 분리, A/B Geometry 월드
- PC WASD/Pointer Lock, 속도 변경, 시작 위치, frame delta 제한과 입력 초기화
- 평면 바닥과 박스 장애물/벽, 바닥 경계 이탈 방지, 축별 sliding과 substep
- 월드 로딩·전환·퇴장·취소·오류·재진입, 기존 월드 보존, 최신 요청 우선 적용
- root와 Geometry/Material/Texture 자원 정리
- 지원 미검출 사유와 공식 VR 진입 버튼, XR 이벤트와 PC 카메라 복구 코드
- PC 큐브 클릭 샘플, interaction action/hint 이벤트
- 선택 가능한 GLB/glTF 로더 어댑터 (실제 자산 미포함)
- UI와 README/AGENTS/설계·검증·확장 문서

## 실제 실행/검사 결과

환경: macOS, Node **26.13.0**, npm **11.20.0**. 설치 버전: Three.js **0.187.0**, Vite **8.3.6**, TypeScript **6.0.3**, Vitest **5.1.0**, ESLint **10.14.0**, typescript-eslint **8.72.1**.

| 검사 | 결과 | 근거/범위 |
| --- | --- | --- |
| npm 의존성 설치 | 완료 | package-lock.json 생성, peer 충돌 해결 |
| `npm run lint` | 통과 | ESLint |
| `npm test` | **7개 파일 / 25개 테스트 통과** | Node 로직 검사 |
| `npm run typecheck` | 통과 | strict TypeScript |
| `npm run build` | 통과, 크기 경고 있음 | dist 생성, Three.js 번들 약 571.45KB / gzip 141.21KB |
| `npm run dev` | 시작 확인 | Vite localhost:5173 ready |
| HTTP 루트/모듈 요청 | 통과 | 루트 HTTP 200, main.ts 변환 응답 확인 |
| `npm audit --omit=dev` | **0건** | 실행용 의존성 검사 |
| 전체 `npm audit` | **moderate 10건** | 개발 도구 minimatch 전이 의존성, 아래 설명 |
| 브라우저 실제 렌더링/PC 입력 | **미검증** | 브라우저 접근 호스트 없음, 컴퓨터 제어 권한 미허용 |
| 실제 GLB/텍스처 다운로드·디코딩 | **미검증** | 실제 Blender 자산 없음; 어댑터 모의 테스트만 통과 |
| 실제 GPU 메모리 안정성 | **미검증** | dispose 호출/scene root 개수만 자동 검사 |
| VR 기기 세션/추적/복귀 | **미검증** | 호환 헤드셋 없음 |

로컬 서버는 HTTP 검사 후 종료합니다. 사용자는 README의 `npm run dev`로 다시 실행할 수 있습니다. 배포/외부 공개는 수행하지 않았습니다.

## 자동 테스트 범위

- 충돌 6개: 자유 이동, 얇은 벽, sliding, 바닥 경계, 바닥 틈/높이, 머리 위 장애물
- 플레이어 5개: 대각선 속도, 긴 frame 제한, yaw/pitch 분리, XR 눈높이 복구 로직, 속도/퇴장
- 월드 생명주기 6개: 실제 A/B 생성·정리, 실패 보존/복구, 완료 순서 역전, 로딩 중 퇴장·부분 자원 해제, 중복/알 수 없는 ID, 잘못된 spawn/20회 전환
- 자원 해제 1개: 공유 geometry/material/texture 중복 dispose 방지
- 모델 어댑터 3개: transform/불확정 진행량, 파일 실패, 취소 후 완료 정리 (모의 GLTFLoader)
- 상호작용 1개: 근거리 선택, 색 변경/action, 벽 가림, 거리 제한
- XR 지원 3개: 보안 연결, API/기기 부재, 지원/정책 오류 분기 (모의 지원 응답)

## 발생한 오류와 해결

- **npm DNS 실패:** 제한된 샌드박스에서 레지스트리를 찾지 못했습니다. 네트워크 권한이 있는 실행으로 의존성을 설치했습니다.
- **TypeScript 7 peer 충돌:** typescript-eslint 8.72.1이 `>=4.8.4 <6.1.0`을 요구해 설치가 실패했습니다. 지원되는 TypeScript 6.0.3을 선택했고 강제 설치는 사용하지 않았습니다.
- **Vite 번들 옵션 타입 오류:** Vite 8의 Rolldown은 이전 manualChunks 객체 형식을 받지 않았습니다. 현재 공식 `build.rolldownOptions.output.codeSplitting` 형식으로 변경했습니다.
- **미사용 생성자 속성 타입 오류:** 이벤트 콜백으로만 쓰는 입력 인자를 불필요한 인스턴스 속성으로 선언한 부분을 제거했습니다.
- **빈 CSS import 경고:** 초기 스타일의 빈 `@import`를 제거했습니다. 외부 폰트/이미지 요청은 없습니다.
- **localhost 바인딩 EPERM:** 제한된 실행에서는 포트 바인딩이 막혔습니다. 승인된 로컬 서버 실행에서 시작·HTTP 응답을 확인했습니다.
- **브라우저 QA 제한:** 브라우저 접근 호스트를 사용할 수 없었고 Safari 컴퓨터 제어도 권한이 거부되었습니다. UI 테스트를 통과로 보고하지 않고 수동 절차를 남겼습니다.

## 남은 제한과 관리 사항

- Three.js 기반 번들에 500KB 초과 경고가 있습니다. 앱 코드와 Three 코어, 지연 로딩 GLTFLoader를 분리했으며 경고 기준을 높여 숨기지는 않았습니다. 초기 엔진 기능은 빌드되지만 실제 기기 로딩/프레임 예산은 후속 측정이 필요합니다.
- 개발 의존성에서 [minimatch glob 패턴 처리 취약점](https://github.com/advisories/GHSA-g3hv-75wg-m249)이 보고되었습니다. ESLint/typescript-eslint가 요구하는 minimatch 10.2.6이 원인입니다. 실행용 Three.js에는 해당하지 않습니다. 임의의 메이저 override/강제 downgrade를 하지 않았습니다. 공식 호환 업데이트를 확인하고 lint/타입/빌드를 함께 재검사해야 합니다.
- r187 공식 VRButton의 requestSession 거절에 대한 UI 보완 코드는 구현했으나 거절/재시도와 offerSession 경로는 실기기로 확인하지 않았습니다.
- 평면/AABB 충돌은 Blender triangle collision, 경사/계단/중력, 복합 바닥 연결을 대신하지 않습니다.
- 실제 몸 이동의 가상 벽 충돌, VR 컨트롤러 입력, VR 내부 UI는 구현하지 않았습니다.
- GLTF 내부 요청은 취소 즉시 모두 중단되지 않을 수 있습니다. 늦은 결과는 적용하지 않고 정리하며, 대형 자산의 시간 제한과 요청 중단은 후속 작업입니다.

다음 순서는 [next-steps.md](next-steps.md), 실제 PC/VR 검증 절차는 [testing.md](testing.md)를 따릅니다.

## 4단계 진행 — Figma 9주차 통합 서비스 (2026-11-07)

- 감사: 기존 55개 단위 검사/타입/린트/빌드 baseline 통과. 엔진과 A/B/GLB/XR 구조 보존. Figma 1144:282 원본의 13개 프레임 및 53개 SVG/PNG 확보.
- 디자인 시스템: 원본 native TSX 컴포넌트·정적 scoped CSS, Pretendard 로컬 폰트, 공통 신규 화면 컴포넌트 추가. 전체 프레임 이미지 배경 방식은 사용하지 않음.
- 상태/내비게이션: ServiceStore·LocalDemoRepository·ServiceRouter 추가. 로컬 로그인/프로필/동네/서버/평가/채팅/초대/약속 상태 연결. 운영 인증·실시간 서버·예약 API 아님.
- 서비스 연결: 마이룸을 실제 홈 월드로 추가. 모드 3개를 기존 A/B/GLB에 연결. 기존 엔진 실험 UI는 `/?lab=1`로 보존. 로딩·정원 오류·취소·평가·복귀 처리.
- VR 박스: StereoCamera 양안, live UI CanvasTexture 공간 평면, DeviceOrientation 권한/대기/드래그 대안, 1.2초 시선 선택과 VR 대체 입력 추가. 실제 센서/렌즈/기기 검증은 미실시.
- 중간 정적 검사: 단위 66개/타입/린트/GLB validator/빌드 통과. 최초 lint는 TSX factory 사용 인식 문제였으며 해당 파일 범위 규칙으로 해결.
- 중간 브라우저 검사: 기존 12개 회귀 통과. 서비스 PC 전체 흐름, 정원 오류·초대 거절, Cardboard 드래그→실제 Ray/dwell 로그인 통과. 모바일 하단 시스템 버튼이 계속하기 버튼을 가린 문제를 발견하여 패널 가용 높이에 하단 여백을 반영. 이후 최종 재검사에서 전체 19개 통과(문서 상단 결과).
- 원본 비교에서 `display:contents` 누락으로 평가 완료 사용자 카드가 중복 offset 된 문제를 발견하여 정적 CSS 변환과 VR painter 모두 수정. 회색 배경 합성값도 원본에 맞춤. 최종 비교 수치는 문서 상단에 기록.


## 실행 중인 개발 서버 팔레트 갱신 확인 — 2026-11-08

사용자의 미반영 보고 후, 실행 중인 Vite PID 21774의 경로가 `공간 실험`, 실제 포트가 5174임을 확인했습니다. 5174 HTTP 응답의 layout 모듈은 공통 style 모듈을 참조하며 새 HEX 팔레트를 제공합니다. 별도 테스트 서버 대신 현재 5174 서버에 Chromium / Apple M4로 직접 접속해 입구·전체 구도·새로고침 화면을 확인했습니다. HTML 내용은 바꾸지 않고 수정 시각만 갱신해 연결된 개발 탭에 전체 새로고침 신호를 보냈고, 기존 탭의 performance.timeOrigin 변경과 월드 재생성을 브라우저 검사로 확인했습니다. 실서버 검사 2개 통과. 사용자가 보고 있던 실제 Safari 탭의 주소와 갱신 결과는 아직 확인되지 않았으므로, 미반영 원인을 캐시나 포트 차이로 확정하지 않습니다. [현재 서버 화면](screenshots/live-vintage/live-vintage-overview.png) · [갱신 검사 기록](live-vintage-browser.json).
