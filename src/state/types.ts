import type { ModeId } from '../data/demo';
export interface Profile {
    nickname: string;
    gender: string;
    birthday: string;
    avatar: string;
    neighborhood: string;
}
export interface DemoSession {
    id: string;
    mode: ModeId;
    serverId: string;
    serverName: string;
    participants: string[];
    startedAt: string;
    ended: boolean;
}
export interface Rating {
    id: string;
    sessionId: string;
    mode: ModeId;
    modeRating: number;
    peopleRating: number;
    participantRatings: Record<string, number>;
}
export interface Invitation {
    id: string;
    from: string;
    to: string;
    mode: ModeId;
    status: 'pending' | 'accepted' | 'declined';
    direction: 'incoming' | 'outgoing';
}
export interface Appointment {
    id: string;
    date: string;
    time: string;
    place: string;
    participants: string[];
    createdAt: string;
}
export interface DemoData {
    version: 1;
    signedIn: boolean;
    onboarded: boolean;
    profile: Profile;
    rooms: Array<{
        id: string;
        name: string;
        current: number;
        capacity: number;
    }>;
    session: DemoSession | null;
    ratings: Rating[];
    invitations: Invitation[];
    messages: Array<{
        id: string;
        author: string;
        text: string;
    }>;
    appointments: Appointment[];
}
