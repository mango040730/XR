// Adapted from Figma node 1144:750; original assets stored locally.
import { h } from '../../components/dom';

const imgImage101 = `${import.meta.env.BASE_URL}assets/figma/4d2ca8fa-495a-4688-ab98-bbb62816399d.png`;

export default function Component() {
  return (
    <div className="bg-[#8c8c8c] relative size-full" data-node-id="1144:750" data-name="동네">
      <div className="absolute h-[811px] left-[-47px] top-[-58px] w-[1266px]" data-node-id="1144:753" data-name="image 101">
        <img alt="" className="absolute inset-0 max-w-none object-cover pointer-events-none size-full" src={imgImage101} />
      </div>
      <div className="absolute backdrop-blur-[1.75px] bg-[rgba(0,0,0,0.6)] h-[632px] left-[-18px] top-0 w-[1232px]" data-node-id="1144:754" />
      <div className="absolute backdrop-blur-[9.05px] bg-[rgba(255,255,255,0.2)] border border-[rgba(255,255,255,0.4)] border-solid content-stretch flex flex-col gap-[22px] items-start left-[306px] px-[32px] py-[28px] rounded-[20px] top-[203px] w-[560px]" data-node-id="1144:755">
        <div className="[word-break:break-word] content-stretch flex flex-col gap-[2px] items-start leading-[1.6] not-italic relative shrink-0 w-full" data-node-id="1144:756">
          <p className="font-['Pretendard:SemiBold'] relative shrink-0 text-[18px] text-white w-full" data-node-id="1144:757">
            동네를 설정해볼까요?
          </p>
          <p className="font-['Pretendard:Medium'] relative shrink-0 text-[#dadada] text-[16px] w-full" data-node-id="1144:758">
            현재 위치를 기반으로 1.7km를 설정할게요.
          </p>
        </div>
        <div className="content-stretch flex gap-[8px] items-start relative shrink-0 w-full" data-node-id="1144:759">
          <div className="bg-[rgba(255,255,255,0.2)] content-stretch flex flex-[1_0_0] h-[57.685px] items-center justify-center min-w-px p-[3.846px] relative rounded-[7.691px]" data-node-id="1144:760">
            <p className="[word-break:break-word] font-['Pretendard:Bold'] leading-[normal] not-italic relative shrink-0 text-[18px] text-center text-white whitespace-nowrap" data-node-id="1144:761">
              좋아요
            </p>
          </div>
          <div className="bg-[rgba(255,255,255,0.2)] content-stretch flex flex-[1_0_0] h-[57.685px] items-center justify-center min-w-px p-[3.846px] relative rounded-[7.691px]" data-node-id="1144:762">
            <p className="[word-break:break-word] font-['Pretendard:Bold'] leading-[normal] not-italic relative shrink-0 text-[18px] text-center text-white whitespace-nowrap" data-node-id="1144:763">
              이 위치가 아니에요
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
