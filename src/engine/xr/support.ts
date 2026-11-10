export interface XRSupport { supported: boolean; reason: string }

export async function detectXR(secure: boolean, xr?: Pick<XRSystem, 'isSessionSupported'>): Promise<XRSupport> {
  if (!secure) return { supported: false, reason: 'VR에는 HTTPS 또는 localhost의 보안 연결이 필요합니다.' };
  if (!xr) return { supported: false, reason: '이 브라우저는 WebXR API를 제공하지 않습니다. PC 3D 모드를 사용하세요.' };
  try {
    return await xr.isSessionSupported('immersive-vr')
      ? { supported: true, reason: 'WebXR 사용 가능 · 월드 진입 후 VR을 시작하세요.' }
      : { supported: false, reason: '호환 VR 기기를 찾을 수 없습니다. PC 3D 모드를 사용하세요.' };
  } catch {
    return { supported: false, reason: '브라우저 권한 또는 정책으로 WebXR 지원 여부를 확인할 수 없습니다.' };
  }
}
