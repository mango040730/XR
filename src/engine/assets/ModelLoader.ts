import type { Group } from 'three';
import type { ModelConfig } from '../world/types';
import { disposeObject } from './disposeObject';

/** No asset cache: each world owns its loaded geometry/material/texture lifetime. */
export class ModelLoader {
  async load(config: ModelConfig, signal: AbortSignal, progress: (message: string) => void): Promise<Group> {
    signal.throwIfAborted();
    const { GLTFLoader } = await import('three/addons/loaders/GLTFLoader.js');
    signal.throwIfAborted();
    let model: Group;
    try {
      const loader = new GLTFLoader();
      // Avoid a dev server's HTML SPA fallback for a missing model URL.
      loader.setRequestHeader({ Accept: 'model/gltf-binary, model/gltf+json, application/octet-stream' });
      const gltf = await loader.loadAsync(config.url, event => {
        if (!signal.aborted) progress(event.total > 0
          ? `모델 다운로드 ${Math.round(event.loaded / event.total * 100)}%`
          : `모델 다운로드 ${Math.round(event.loaded / 1024)} KB (전체 크기 미제공)`);
      });
      model = gltf.scene;
    } catch (cause) {
      throw new Error(`모델 로딩 실패: ${config.url} — 파일 경로·형식·압축 설정을 확인하세요.`, { cause });
    }
    // GLTFLoader cannot cancel all dependent requests; discard late completion safely.
    if (signal.aborted) { disposeObject(model); signal.throwIfAborted(); }
    if (config.position) model.position.fromArray(config.position);
    if (config.rotation) model.rotation.set(...config.rotation);
    if (config.scale) model.scale.fromArray(config.scale);
    model.userData.assetUrl = config.url;
    return model;
  }
}
