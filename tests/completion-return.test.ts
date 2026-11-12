import {afterEach,describe,expect,it,vi} from 'vitest';
import {CompletionReturnTimer} from '../src/experience/CompletionReturnTimer';
import {firstFixRoute} from '../src/experience/firstFixNavigation';

afterEach(()=>vi.useRealTimers());
describe('completion return deadline',()=>{
 it('returns exactly once after ten seconds and does not restart on rerender',()=>{
  vi.useFakeTimers();const home=vi.fn(),timer=new CompletionReturnTimer(home);
  timer.setScreen('appointment-done');vi.advanceTimersByTime(5000);timer.setScreen('appointment-done');vi.advanceTimersByTime(4999);expect(home).not.toHaveBeenCalled();vi.advanceTimersByTime(1);expect(home).toHaveBeenCalledTimes(1);vi.advanceTimersByTime(20000);expect(home).toHaveBeenCalledTimes(1);timer.dispose();
 });
 it('cancels on leaving, and starts a fresh deadline for a new completion visit',()=>{
  vi.useFakeTimers();const home=vi.fn(),timer=new CompletionReturnTimer(home);
  timer.setScreen('appointment-done');vi.advanceTimersByTime(7000);timer.setScreen('appointment-date');vi.advanceTimersByTime(15000);expect(home).not.toHaveBeenCalled();timer.setScreen('appointment-done');vi.advanceTimersByTime(9999);expect(home).not.toHaveBeenCalled();vi.advanceTimersByTime(1);expect(home).toHaveBeenCalledTimes(1);timer.dispose();
 });
 it('releases its timeout on disposal and cannot be restarted afterwards',()=>{
  vi.useFakeTimers();const home=vi.fn(),timer=new CompletionReturnTimer(home);
  timer.setScreen('appointment-done');timer.dispose();timer.setScreen('appointment-done');vi.advanceTimersByTime(20000);expect(home).not.toHaveBeenCalled();expect(vi.getTimerCount()).toBe(0);
 });
 it('shows confirmation only when an appointment was actually saved in this session',()=>{
  expect(firstFixRoute('appointment-done',null)).toBe('modes');expect(firstFixRoute('appointment-done',null,true)).toBe('appointment-done');
 });
});
