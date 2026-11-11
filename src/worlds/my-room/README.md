# 마이룸 디자인 2.7.1 통합

`마이룸 디자인.zip`의 완성 GLB와 재질·조명·접촉 그림자 코드를 기존 엔진으로 통합했습니다. ZIP의 독립 viewer/controls·메뉴·vendor Three.js·실행 스크립트는 설치하거나 실행하지 않습니다.

- GLB: `public/assets/models/my-room/myroom-v2-2.7.1.glb`, 5,415,376바이트.
- 원본 SHA-256: `69d7e8138a34947213a0f9c0e84a32db1f6433efb5b1830c36aac3a53cff62cc`.
- ZIP SHA-256: `ad0c0593d4f25e492502c31d072863a8f7c7bc5a855eb2ba76f7ec3c3b7c2ce9`.
- 실제 GLB: 메시 746개, 가구 충돌 그룹 17개, 실내 사용 면적 8.4×7.2m. 기존 GLTFLoader가 원본 계층/프린트 텍스처/재질을 읽고 표면 재질 이름에 맞춰 원본 wood/linen/plaster/rug shader만 복구합니다.
- 원본 조명·환경광·한 번 구운 접촉 그림자·정적 배칭·GTAO·노출 1.10·66/72/78도 반응형 시야각을 사용합니다. 매 프레임 접촉 그림자를 다시 굽지 않습니다.
- 원본 GLB extras의 originalName/renderFlags/collider/seatRole를 반영합니다. 바닥 0.02m, 팔각 플랫폼 0.18m에 맞춰 공통 충돌 경계의 선택적 18cm 단차를 사용합니다. 다른 월드는 기존 평면 이동을 유지합니다.
- 기존 1인칭/XR 카메라·PC/터치 입력·아바타·멀티플레이/음성 연결을 사용합니다. 클라이언트와 서버의 단차/충돌/좌석도 같은 배치를 사용합니다.
- 모드 선택·홈·약속 등 콘텐츠 실행 외 화면은 이 마이룸을 사용합니다. 콘텐츠 실행과 일시정지/종료 확인은 해당 콘텐츠 월드를 사용합니다. 평가는 종료한 콘텐츠의 마지막 모습을 유지합니다. 콘텐츠 로딩 중에는 이전 월드를 보존하며 실패·취소·퇴장 때 새 자원을 정리합니다.
- PMREM 환경 맵과 그림자 타깃은 해당 월드가 소유하고 해제합니다. shader의 userData.surfaceTexture도 자원 해제와 텍스처 준비에 포함합니다. 전역 GPU 자원 캐시는 없습니다.

`npm run inspect:my-room`은 실제 GLB의 geometry/extras·해시와 layout.json이 일치하는지 검사합니다. 의도적으로 GLB를 교체한 후에만 `npm run inspect:my-room -- --write`로 갱신합니다. Node 분석에서만 이미지/재질 로딩을 생략하며, 게시 GLB 및 브라우저 GLTFLoader는 원본 PNG와 재질을 그대로 사용합니다.

물리 헤드셋·실제 휴대폰 센서/성능은 별도 검증 대상입니다. Cardboard 드래그·시선 검사는 실제 VR 하드웨어 검증을 대신하지 않습니다.
