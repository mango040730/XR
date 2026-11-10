import { describe, expect, it, vi } from 'vitest';
import { detectXR } from '../src/engine/xr/support';

describe('XR support detection', () => {
  it('explains insecure connections', async () => {
    expect((await detectXR(false)).reason).toContain('HTTPS');
  });
  it('keeps PC fallback when the API or headset is absent', async () => {
    expect((await detectXR(true)).supported).toBe(false);
    expect((await detectXR(true, { isSessionSupported: vi.fn().mockResolvedValue(false) })).supported).toBe(false);
  });
  it('detects immersive-vr and handles rejected policy checks', async () => {
    const isSessionSupported = vi.fn().mockResolvedValue(true);
    expect((await detectXR(true, { isSessionSupported })).supported).toBe(true);
    expect(isSessionSupported).toHaveBeenCalledWith('immersive-vr');
    expect((await detectXR(true, { isSessionSupported: vi.fn().mockRejectedValue(new Error('policy')) })).reason).toContain('권한');
  });
});
