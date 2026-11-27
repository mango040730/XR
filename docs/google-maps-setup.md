# 실제 동네 설정: Google Maps 설정과 검증

현재 사용자 요청에 따라 기본 화면은 외부 API·기기 위치를 사용하지 않는 데모다. 이 문서는 이후 Google Maps 도입을 선택할 때 사용하는 설정 안내이며 지금 데모 이용에는 필요하지 않다. 실제 모드로 전환하려면 로컬 환경 또는 GitHub Actions 변수에 `VITE_LOCATION_MODE=google`을 명시하고 재배포해야 한다. 기본값은 `demo`이므로 키 등록만으로 실제 모드가 활성화되지는 않는다.

현재 프로젝트는 Vite + JavaScript + Three.js이며 별도 계정 API/DB가 없다. 로그인 등 기존 화면은 UI 미리보기지만 동네 설정은 Google Maps JavaScript API·Geocoding Service와 브라우저 Geolocation API를 실제로 사용한다. 키가 없거나 위치/주소 조회에 실패하면 확정·입장을 막으며 데모 지도나 기본 좌표로 우회하지 않는다.

## 1. Google Cloud 설정

1. [Google Cloud Console](https://console.cloud.google.com/)에서 프로젝트를 만들고 결제 계정을 연결한다. 실제 운영용 표준 API 키를 사용한다. Google Maps 사용량에 따라 과금되므로 프로젝트의 할당량과 예산 알림도 설정한다.
2. API 및 서비스 → 라이브러리에서 **Maps JavaScript API**, **Geocoding API**를 활성화한다. 주소 검색도 Geocoding Service를 사용하므로 Places API는 필요하지 않다.
3. 사용자 인증 정보 → 사용자 인증 정보 만들기 → API 키를 생성한다.
4. 애플리케이션 제한을 **웹사이트**로 설정한다. 운영 키는 `https://mango040730.github.io/*`만 허용한다. `auth_referrer_policy=origin`을 사용하므로 경로가 아니라 이 도메인의 원본을 허용해야 한다.
5. API 제한은 **키 제한**을 선택하고 위 두 API만 허용한다. 브라우저 키는 앱 빌드·요청에서 보이므로 환경변수만으로 숨겨지는 비밀 키가 아니다. 서버용 키·서비스 계정 파일은 클라이언트에 넣지 않는다.
6. 개발에는 별도 키를 만들고 `http://127.0.0.1:4173/*`, 필요한 경우 `http://localhost:4173/*`만 허용한다. 운영 키의 제한을 해제해서 테스트하지 않는다.

공식 문서: [표준 키·결제 설정](https://developers.google.com/maps/documentation/javascript/get-api-key), [웹사이트/API 제한](https://developers.google.com/maps/api-security-best-practices), [클라이언트 주소 조회](https://developers.google.com/maps/documentation/javascript/geocoding).

## 2. GitHub Pages 배포

1. [저장소 Actions 변수](https://github.com/mango040730/XR/settings/variables/actions) → New repository variable을 연다.
2. 이름 `VITE_GOOGLE_MAPS_API_KEY`, 값에는 제한된 웹용 키를 저장한다. 같은 이름의 Actions Secret도 지원하지만 공개 클라이언트 키라는 성격은 동일하다. 둘 다 있으면 Variable이 우선한다.
3. Actions → Deploy VR space to GitHub Pages → Run workflow → main을 실행한다. **Vite는 빌드할 때 값을 읽으므로 변수만 저장하고 재배포하지 않으면 반영되지 않는다.**
4. 배포 성공 후 HTTPS 주소 `https://mango040730.github.io/XR/`에서 새로고침한다.

워크플로는 해당 값을 빌드 환경에 주입한다. 소스·문서·로그에 실제 키를 적지 않는다. 키 미설정 시 동네 화면은 지도 오류·재시도 상태가 되고 좋아요는 비활성화된다.

## 3. 로컬 개발과 기기 권한

`.env.example`을 `.env.local`로 복사하고 본인의 개발 키를 설정한다.

```dotenv
VITE_GOOGLE_MAPS_API_KEY=발급받은_개발용_키
VITE_LOCATION_MODE=google
```

```sh
npm ci
npm run dev -- --port 4173
VITE_BASE_PATH=/XR/ npm run check
```

`.env*` 실값 파일은 Git에서 제외된다. 설정 변경 후 Vite를 재시작한다. 위치 API는 HTTPS 또는 localhost 같은 보안 컨텍스트에서만 동작한다. GitHub Pages는 HTTPS로 접속한다. 사이트 권한과 운영체제의 브라우저 위치 권한을 모두 허용해야 한다. 임베드하는 경우 부모 iframe의 `allow="geolocation"`과 호스팅의 Permissions-Policy도 해당 원본을 허용해야 한다. Pages에서 임의 응답 헤더를 설정할 수 있다고 가정하지 않는다.

## 4. 동작과 저장 구조

- 위치 화면 진입 시 SDK를 로드한 뒤 `watchPosition`으로 현재 위치를 요청한다. 실제 기기 좌표만 지도 중심으로 사용하며, 지도가 없는 초기 상태에 임의 기본 좌표를 넣지 않는다.
- GPS가 변하면 중심을 갱신하고 주소를 디바운스 조회한다. 이전 비동기 응답은 버전 검사로 무시한다. 좌표·주소가 모두 준비되기 전까지 확정할 수 없다.
- 위치 재설정은 수동 모드로 전환하면서 추적을 해제한다. 중앙 아이콘은 고정이고 지도만 움직인다. 이동 중 이전 주소를 무효화하고 idle 후 새 중심 주소를 조회한다. 권한 거부·GPS 실패 시 주소 검색으로 시작할 수 있다. ‘현재 위치’는 사용자의 명시적 동작으로 추적을 다시 시작한다.
- `entrySession.profile.location`은 `{lat, lng, address, placeId, source, accuracy, confirmedAt}`이다. 좋아요를 누르면 실제 저장 성공 후 이 프로필을 확정하고 기존 3D 준비·입장 흐름으로 이동한다. 저장 실패는 성공으로 처리하지 않는다.
- 이 기기의 `localStorage['meet-join.location.v1']`에는 좌표·장소 ID·선택 방식·정확도·확정/만료 시각만 보관한다. 주소는 기존 메모리 프로필에 저장하고 영구 캐시하지 않는다. 좌표 캐시 유효기간은 최대 30일이며 복원 시 만료·형식 오류를 제거하고 주소를 다시 조회한다. 기기를 닫은 동안 백그라운드 삭제 프로세스가 실행되는 구조는 아니다.
- 계정 서버/DB가 없으므로 계정별 저장·기기 간 동기화는 제공하지 않는다. 나중에 서버가 생기면 저장 어댑터와 인증 사용자 연결을 교체해야 한다. 위치를 임의의 외부 DB에 전송하는 코드는 추가하지 않았다.
- 수동 전환·확정·페이지 이탈 시 추적을 정리하고, 해제 시 지도 이벤트·ResizeObserver·주소 타이머도 정리한다.

Google 주소 콘텐츠의 영구 보관을 일반 사용자 DB처럼 취급하지 않는다. [Geocoding 정책](https://developers.google.com/maps/documentation/geocoding/policies)과 [서비스별 조건](https://cloud.google.com/maps-platform/terms/maps-service-terms)을 참고한다. 공개 위치정보 안내/이용약관 링크는 모달 아래에 제공한다.

## 5. 디자인

Google의 네이티브 지도 스타일로 채도를 낮춘다. Google 로고 자체에 CSS 흑백 필터를 적용하지 않는다. 중앙 원형을 뚫은 어두운 블러 오버레이를 사용하되 지도 아래 40px의 로고·저작권 영역에는 적용하지 않는다. 중앙 아이콘·원형 마스크는 지도 컨테이너의 50% 지점을 기준으로 하여 리사이즈에도 정렬을 유지한다. 지도 이미지를 두 장 겹치거나 타일을 복사하지 않는다. 원형은 시각적인 동네 범위이며 GPS 오차나 법정동 경계를 뜻하지 않는다.

## 6. 테스트 구분

- `npm run check`: 공간 보존 검사와 위치 상태·권한 거부·GPS/SDK/주소/저장 오류·오래된 응답 무시·수동 모드·추적 해제 검사.
- `scripts/check-browser-entry.mjs <URL> --maps-fixture`: Chrome Geolocation 오버라이드와 테스트 전용 SDK 응답으로 기존 UI/입장 회귀 검사. 로컬 Vite에만 테스트용 환경 값을 주고 SDK 요청은 CDP에서 가로챈다. 앱에는 테스트 분기·더미 좌표·가짜 지도 대체가 없다.
- API 키가 없을 때는 인증된 실제 지도 타일/Geocoding 성공을 검증했다고 보고하지 않는다. 실제 연결 검증에는 위 설정을 완료하고, 실제 기기에서 권한 허용·이동·수동 드래그·주소 확인·좋아요·재접속을 확인해야 한다.

## 7. 문제 해결

- 지도 오류: 키 변수 이름·재배포 여부·결제 연결·두 API 활성화·허용 도메인/API 제한을 확인한다. 콘솔의 Google 오류를 확인하되 키가 담긴 요청 URL을 공유하지 않는다.
- 위치 거부: 브라우저/OS 권한을 다시 허용하거나 주소 검색을 사용한다. SDK가 불러와지지 않은 경우에는 수동 검색도 사용할 수 없다.
- 주소 오류: 해당 좌표의 결과 없음, 할당량 초과 또는 Geocoding API 설정 문제일 수 있다. 새 위치를 선택하거나 재시도한다.
- 저장 오류: 브라우저 사이트 데이터 차단·저장소 용량·프라이빗 브라우징 설정을 확인한다. 저장하지 않고 다음 단계로 넘어가지 않는다.
