import { demoMessages, initialRooms } from '../data/demo';
import type { DemoData } from '../state/types';
export const DEMO_STORAGE_KEY = 'xr-spatial-service-demo-v1';
export interface LocalStoragePort {
    getItem(key: string): string | null;
    setItem(key: string, value: string): void;
}
export function initialData(): DemoData {
    return { version: 1, signedIn: false, onboarded: false,
        profile: { nickname: '홍길동', gender: '', birthday: '2000-01-01', avatar: 'mint', neighborhood: '' },
        rooms: structuredClone(initialRooms), session: null, ratings: [], messages: structuredClone(demoMessages), appointments: [],
        invitations: [{ id: 'demo-incoming', from: '창용', to: '나', mode: 'social', status: 'pending', direction: 'incoming' }] };
}
/** Browser-local demo data only. No authentication, chat server or booking calls. */
export class LocalDemoRepository {
    error = '';
    constructor(private storage: LocalStoragePort) { }
    load(): DemoData {
        try {
            const text = this.storage.getItem(DEMO_STORAGE_KEY);
            if (!text)
                return initialData();
            const data = JSON.parse(text) as Partial<DemoData>;
            if (data.version !== 1 || typeof data.signedIn !== 'boolean' || typeof data.onboarded !== 'boolean'
                || !data.profile || typeof data.profile.nickname !== 'string' || typeof data.profile.avatar !== 'string'
                || !Array.isArray(data.rooms) || !data.rooms.every(room => typeof room.id === 'string' && Number.isFinite(room.current) && Number.isFinite(room.capacity))
                || !['gender','birthday','neighborhood'].every(key=>typeof data.profile?.[key as keyof typeof data.profile]==='string')
                || !Array.isArray(data.ratings) || !Array.isArray(data.messages) || !Array.isArray(data.invitations) || !Array.isArray(data.appointments))
                throw new Error('잘못된 저장 형식');
            if(!data.messages.every(m=>typeof m.id==='string'&&typeof m.author==='string'&&typeof m.text==='string')||!data.invitations.every(i=>typeof i.id==='string'&&typeof i.from==='string'&&typeof i.to==='string'&&['pending','accepted','declined'].includes(i.status)&&['incoming','outgoing'].includes(i.direction))||!data.appointments.every(a=>typeof a.id==='string'&&typeof a.date==='string'&&typeof a.time==='string'&&typeof a.place==='string'&&Array.isArray(a.participants))||!data.rooms.every(r=>typeof r.name==='string'&&r.capacity>0&&r.current>=0))throw new Error('잘못된 저장 내용');
            return { ...initialData(), ...data } as DemoData;
        }
        catch {
            this.error = '저장 데이터를 읽을 수 없어 데모 기본값으로 시작했습니다.';
            return initialData();
        }
    }
    save(data: DemoData): void {
        try {
            this.storage.setItem(DEMO_STORAGE_KEY, JSON.stringify(data));
            this.error = '';
        }
        catch {
            this.error = '브라우저 저장소를 사용할 수 없습니다. 현재 탭에서만 상태가 유지됩니다.';
        }
    }
}
