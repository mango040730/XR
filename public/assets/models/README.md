향후 Blender GLB/glTF 자산을 이 폴더 아래에 저장합니다.

예: `my-world/scene.glb` → config URL: `${import.meta.env.BASE_URL}assets/models/my-world/scene.glb`

Test World A/B는 기본 Geometry를 사용하고 GLB Test Room은 `test-room/scene.glb`를 실제로 로딩합니다.

`test-room/scene.glb`는 `npm run generate:assets`로 재생성하는 절차적 테스트 자산입니다. 최종 Blender 모델은 `new-world/scene.glb`처럼 별도 폴더에 저장하세요. 자세한 절차는 `docs/adding-worlds.md`에 있습니다.
