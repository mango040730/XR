// Adapted from Figma node 1144:618; original assets stored locally.
import { h } from '../../components/dom';

const imgImage110 = `${import.meta.env.BASE_URL}assets/figma/73045822-37e7-487d-bab1-5e075e879ff0.png`;
const imgGroup = `${import.meta.env.BASE_URL}assets/figma/26755528-14b8-4579-accf-72dd5fc182b0.svg`;
const imgAkarIconsThreeLineHorizontal = `${import.meta.env.BASE_URL}assets/figma/a406f11f-6d95-466d-9e10-d44132b22dd0.svg`;

export default function Component() {
  return (
    <div className="bg-[rgba(255,255,255,0.1)] relative size-full" data-node-id="1144:618" data-name="약속잡기완료!">
      <div className="absolute bg-[rgba(255,255,255,0.1)] content-stretch flex gap-[12px] h-[53px] items-center justify-center left-[calc(83.33%+52px)] px-[20px] py-[12px] rounded-[1000px] top-[40px]" data-node-id="1144:619">
        <div className="overflow-clip relative shrink-0 size-[24px]" data-node-id="1144:620" data-name="akar-icons:bell">
          <div className="absolute inset-[8.33%_16.67%]" data-node-id="1144:621" data-name="Group">
            <div className="absolute inset-[-5%_-6.25%]">
              <img alt="" className="block max-w-none size-full" src={imgGroup} />
            </div>
          </div>
        </div>
        <div className="relative shrink-0 size-[24px]" data-node-id="1144:624" data-name="akar-icons:three-line-horizontal">
          <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgAkarIconsThreeLineHorizontal} />
        </div>
      </div>
      <p className="-translate-x-1/2 [word-break:break-word] absolute font-['Pretendard:Bold'] leading-[normal] left-[calc(50%-0.5px)] not-italic text-[36px] text-center text-white top-[40px] whitespace-nowrap" data-node-id="1144:626">
        [채영짱]과 작당모의 완료!
      </p>
      <div className="absolute bg-[rgba(255,255,255,0.1)] content-stretch flex flex-col gap-[20px] h-[334px] items-start justify-center left-[calc(33.33%+55px)] px-[24px] py-[28px] rounded-[20px] top-[128px]" data-node-id="1144:627">
        <div className="bg-[rgba(255,255,255,0.1)] flex-[1_0_0] min-h-px overflow-clip relative rounded-[16px] w-[241px]" data-node-id="1144:628" data-name="img">
          <div className="-translate-x-1/2 -translate-y-1/2 absolute h-[316px] left-[calc(50%+0.5px)] top-1/2 w-[394px]" data-node-id="1144:629" data-name="image 110">
            <img alt="" className="absolute inset-0 max-w-none object-cover pointer-events-none size-full" src={imgImage110} />
          </div>
        </div>
        <div className="[word-break:break-word] content-stretch flex flex-col font-['Pretendard:Bold'] gap-[4px] items-start leading-[0] not-italic relative shrink-0 text-[20px] text-white whitespace-nowrap" data-node-id="1144:630" data-name="t">
          <div className="flex flex-col justify-center relative shrink-0" data-node-id="1144:631">
            <p className="leading-[1.6]">우마이도 건대점</p>
          </div>
          <div className="flex flex-col justify-center relative shrink-0" data-node-id="1144:632">
            <p className="leading-[1.6]">2026.10.03.(화) 오후 17:00</p>
          </div>
        </div>
      </div>
      <div className="-translate-x-1/2 absolute bg-[rgba(255,255,255,0.1)] content-stretch flex items-center justify-center left-1/2 px-[24px] py-[12px] rounded-[1000px] top-[507px]" data-node-id="1144:633">
        <p className="[word-break:break-word] font-['Pretendard:Medium'] leading-[normal] not-italic relative shrink-0 text-[24px] text-center text-white whitespace-nowrap" data-node-id="1144:634">
          완료
        </p>
      </div>
    </div>
  );
}
