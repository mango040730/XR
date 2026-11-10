# 숲속 목공방

사용자가 제공한 `목공방 디자인.zip`의 정적 공간을 기존 Three.js 엔진으로 옮겼습니다.

- 원본 ZIP SHA-256: `39787ac24001985416b9fae75a05abaa6fbc97c83cf24558ba104f65de500af9`
- `design/geometry.ts`, `palette.ts`, `layout.ts`, `renderConfig.ts`: 원본의 지오메트리·색상·충돌 배치·조명 수치.
- `design/architecture.ts`, `props.ts`, `primitives.ts`, `Lighting.ts`: 원본 TSX의 정적 장면을 네이티브 Three.js 생성 호출로 변환. `runtime.ts`는 생성에만 쓰이며 React를 실행하지 않습니다.
- 원본의 별도 플레이어·아바타·네트워크·음성·store·UI는 가져오지 않았습니다. 기존 공통 입력·PlayerController·충돌·1인칭·모드 UI를 사용합니다.
- 지오메트리와 재질 캐시는 생성 범위에만 존재합니다. 월드가 자원을 소유하고 퇴장할 때 해제합니다. 정적 메시를 재질·속성·그림자별로 병합합니다.
- 기존 렌더러의 ACES·약한 bloom·태양/창/작업등·안개를 사용합니다. 원본 React 전용 N8AO·ContactShadows·Sparkles는 추가하지 않았습니다. 조명은 원본 balanced 설정입니다.
- 목공 작업대와 도구는 현재 정적 배치입니다. 도구 조작·목공 게임은 이번 요청 범위에 포함하지 않았습니다.
