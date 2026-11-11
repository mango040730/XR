export type Vec3 = [number, number, number];
export type Motion = 'idle' | 'walk' | 'wave' | 'sit';
export interface PeerState {
  id: string; nickname: string; avatar: 'cub-scout-v6'; position: Vec3; yaw: number;
  moving: boolean; animation: Motion; seatId: string | null; updatedAt: number;
  wave: number; waveUntil: number; voice: boolean;
}
export interface Seat { id: string; position: Vec3; yaw: number; stand: Vec3; surfaceHeight: number }
export interface RoomLayout {
  id: string; name: string; spawn: {position: Vec3; yaw: number};
  player: {speed: number; radius: number; height: number; eyeHeight: number;maxStepHeight?:number};
  floors: Array<{minX:number;maxX:number;minZ:number;maxZ:number;y:number;polygon?:Array<[number,number]>}>;
  solids: Array<{min: Vec3; max: Vec3}>; seats: Seat[];
  teleport?:{areas:RoomLayout['floors'];maxDistance:number};
}
export interface RoomSnapshot { room: string; world: string; time: number; users: PeerState[] }
export interface ChatMessage { id: string; authorId: string; nickname: string; text: string; time: number }
export interface JoinRequest { world: string; room: string; nickname: string }
export interface JoinResult { error?: string; self?: PeerState; snapshot?: RoomSnapshot; messages?: ChatMessage[]; iceServers?: RTCIceServer[] }
export interface RtcSignal { to: string; description?: RTCSessionDescriptionInit; candidate?: RTCIceCandidateInit }
export interface IncomingRtc extends RtcSignal { from: string; room: string }
export const WAVE_SECONDS = 2.034;
export const cleanText = (value: unknown, max: number): string => typeof value === 'string'
  ? value.normalize('NFKC').replace(/\p{Cc}/gu, '').trim().slice(0, max) : '';
export function validPosition(value: unknown): value is Vec3 {
  return Array.isArray(value) && value.length === 3 && value.every(n => typeof n === 'number' && Number.isFinite(n));
}
