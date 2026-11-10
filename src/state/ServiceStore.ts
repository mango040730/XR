import { Signal } from '../engine/core/Signal';
import { avatars, modes, neighborhoods, participants, places } from '../data/demo';
import type { ModeId } from '../data/demo';
import type { Appointment, DemoData, Profile } from './types';
import type { LocalDemoRepository } from '../services/LocalDemoRepository';
export class ServiceStore {
    readonly changes = new Signal<DemoData>();
    private data: DemoData;
    constructor(readonly repository: LocalDemoRepository) { this.data = repository.load(); }
    get value(): DemoData { return structuredClone(this.data); }
    private commit(change: (data: DemoData) => void): void {
        const next = this.value;
        change(next);
        this.repository.save(next);
        this.data = next;
        this.changes.emit(this.value);
    }
    login(): void { this.commit(data => { data.signedIn = true; }); }
    logout(): void { this.commit(data => { data.signedIn = false; }); }
    profile(patch: Partial<Profile>): void {
        if (patch.nickname !== undefined && (!patch.nickname.trim() || patch.nickname.length > 20))
            throw new Error('닉네임을 1~20자로 입력하세요.');
        if (patch.avatar !== undefined && !avatars.some(a => a.id === patch.avatar))
            throw new Error('아바타를 선택하세요.');
        if (patch.birthday !== undefined && !/^\d{4}-\d{2}-\d{2}$/.test(patch.birthday))
            throw new Error('생년월일을 선택하세요.');
        this.commit(data => { Object.assign(data.profile, patch); });
    }
    neighborhood(id: string): void { if (!neighborhoods.some(n => n.id === id))
        throw new Error('동네를 선택하세요.'); this.commit(data => { data.profile.neighborhood = id; data.onboarded = true; }); }
    join(mode: ModeId, serverId: string): void {
        if (!modes.some(item => item.id === mode))
            throw new Error('선택한 모드가 없습니다.');
        this.commit(data => {
            const room = data.rooms.find(room => room.id === serverId);
            if (!room)
                throw new Error('서버를 찾을 수 없습니다. 다른 서버를 선택하세요.');
            if (room.current >= room.capacity)
                throw new Error('정원이 가득 찼습니다. 다른 서버를 선택하세요.');
            data.session = { id: crypto.randomUUID(), mode, serverId, serverName: room.name, participants: participants.map(p => p.id), startedAt: new Date().toISOString(), ended: false };
        });
    }
    finish(): void { this.commit(data => { if (data.session)
        data.session.ended = true; }); }
    rate(modeRating: number, peopleRating: number, participantRatings: Record<string, number>): void {
        if (![modeRating, peopleRating, ...Object.values(participantRatings)].every(n => Number.isInteger(n) && n >= 1 && n <= 5))
            throw new Error('모드와 참여자 별점을 1~5점으로 선택하세요.');
        this.commit(data => {
            const session = data.session;
            if (!session?.ended)
                throw new Error('종료한 시뮬레이션이 없습니다.');
            if (session.participants.some(id => !participantRatings[id]))
                throw new Error('함께한 사람들의 평가를 모두 선택하세요.');
            data.ratings = data.ratings.filter(rating => rating.sessionId !== session.id);
            data.ratings.push({ id: crypto.randomUUID(), sessionId: session.id, mode: session.mode, modeRating, peopleRating, participantRatings });
        });
    }
    chat(text: string): void {
        if (!text.trim() || text.length > 500)
            throw new Error('메시지를 1~500자로 입력하세요.');
        this.commit(data => { data.messages.push({ id: crypto.randomUUID(), author: data.profile.nickname, text: text.trim() }); data.messages = data.messages.slice(-100); });
    }
    invite(to: string, mode: ModeId): void {
        this.commit(data => { data.invitations.push({ id: crypto.randomUUID(), from: data.profile.nickname, to, mode, status: 'pending', direction: 'outgoing' }); });
    }
    respond(id: string, status: 'accepted' | 'declined'): void {
        this.commit(data => { const invitation = data.invitations.find(i => i.id === id); if (!invitation || invitation.direction !== 'incoming')
            throw new Error('초대장을 찾을 수 없습니다.'); invitation.status = status; });
    }
    appointment(value: Omit<Appointment, 'id' | 'createdAt'>): void {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(value.date) || !/^\d{2}:\d{2}$/.test(value.time) || !value.place || !value.participants.length)
            throw new Error('날짜·시간·장소·참여자를 모두 선택하세요.');
        if (!Number.isFinite(new Date(value.date + 'T' + value.time).getTime()) || new Date(value.date + 'T12:00:00Z').toISOString().slice(0, 10) !== value.date || !places.some(p => p.id === value.place) || value.participants.some(id => !participants.some(p => p.id === id)))
            throw new Error('날짜나 시간이 올바르지 않습니다.');
        this.commit(data => { data.appointments.push({ ...value, id: crypto.randomUUID(), createdAt: new Date().toISOString() }); });
    }
    createRoom(name: string): string {
        if (!name.trim())
            throw new Error('서버 이름을 입력하세요.');
        const id = crypto.randomUUID();
        this.commit(data => { data.rooms.push({ id, name: name.trim().slice(0, 30), current: 0, capacity: 8 }); });
        return id;
    }
}
