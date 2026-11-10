// Adapted from Figma node 1144:450; original assets stored locally.
import { h } from '../../components/dom';

const imgGroup = `${import.meta.env.BASE_URL}assets/figma/ef164132-1987-4e71-9c4f-a1cbc0d108ca.svg`;
const imgAkarIconsThreeLineHorizontal = `${import.meta.env.BASE_URL}assets/figma/6369bc2b-2339-44d8-913b-2f85a9345ab0.svg`;
const imgUserCircle = `${import.meta.env.BASE_URL}assets/figma/7eb439a1-067f-4a27-8842-c9c712415c61.svg`;

export default function Component() {
  return (
    <div className="bg-[rgba(255,255,255,0.1)] relative size-full" data-node-id="1144:450" data-name="평가 완료">
      <div className="absolute bg-[rgba(255,255,255,0.1)] content-stretch flex gap-[16px] h-[53px] items-center justify-center left-[calc(83.33%+48px)] px-[20px] py-[12px] rounded-[1000px] top-[40px]" data-node-id="1144:451">
        <div className="overflow-clip relative shrink-0 size-[24px]" data-node-id="1144:452" data-name="akar-icons:bell">
          <div className="absolute inset-[8.33%_16.67%]" data-node-id="1144:453" data-name="Group">
            <div className="absolute inset-[-5%_-6.25%]">
              <img alt="" className="block max-w-none size-full" src={imgGroup} />
            </div>
          </div>
        </div>
        <div className="relative shrink-0 size-[24px]" data-node-id="1144:456" data-name="akar-icons:three-line-horizontal">
          <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgAkarIconsThreeLineHorizontal} />
        </div>
      </div>
      <div className="absolute bg-[rgba(255,255,255,0.1)] content-stretch flex items-center justify-center left-[calc(33.33%+124px)] px-[24px] py-[12px] rounded-[1000px] top-[455px]" data-node-id="1144:458">
        <p className="[word-break:break-word] font-['Pretendard:Medium'] leading-[normal] not-italic relative shrink-0 text-[24px] text-center text-white whitespace-nowrap" data-node-id="1144:459">
          마이룸으로
        </p>
      </div>
      <div className="absolute contents left-[calc(33.33%+4px)] top-[244px]" data-node-id="1144:460">
        <div className="absolute bg-[rgba(255,255,255,0.1)] content-stretch flex flex-col gap-[16px] items-center justify-center left-[calc(33.33%+4px)] p-[20px] rounded-[12px] top-[244px]" data-node-id="1144:461">
          <div className="relative shrink-0 size-[80px]" data-node-id="1144:462" data-name="user-circle">
            <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgUserCircle} />
          </div>
          <p className="[word-break:break-word] font-['Pretendard:Medium'] leading-[normal] not-italic relative shrink-0 text-[22px] text-center text-white whitespace-nowrap" data-node-id="1144:463">
            창용
          </p>
        </div>
        <div className="absolute bg-[rgba(255,255,255,0.1)] content-stretch flex flex-col gap-[16px] items-center justify-center left-[calc(33.33%+140px)] p-[20px] rounded-[12px] top-[244px]" data-node-id="1144:464">
          <div className="relative shrink-0 size-[80px]" data-node-id="1144:465" data-name="user-circle">
            <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgUserCircle} />
          </div>
          <p className="[word-break:break-word] font-['Pretendard:Medium'] leading-[normal] not-italic relative shrink-0 text-[22px] text-center text-white whitespace-nowrap" data-node-id="1144:466">
            료굥
          </p>
        </div>
        <div className="absolute bg-[rgba(255,255,255,0.1)] content-stretch flex flex-col gap-[16px] items-center justify-center left-[calc(50%+76px)] p-[20px] rounded-[12px] top-[244px]" data-node-id="1144:467">
          <div className="relative shrink-0 size-[80px]" data-node-id="1144:468" data-name="user-circle">
            <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgUserCircle} />
          </div>
          <p className="[word-break:break-word] font-['Pretendard:Medium'] leading-[normal] not-italic relative shrink-0 text-[22px] text-center text-white whitespace-nowrap" data-node-id="1144:469">
            707
          </p>
        </div>
      </div>
      <p className="-translate-x-1/2 [word-break:break-word] absolute font-['Pretendard:Bold'] leading-[normal] left-[calc(50%-0.5px)] not-italic text-[36px] text-center text-white top-[102px] whitespace-nowrap" data-node-id="1144:470">
        방금 함께한 사람들과 더 대화해볼까요?
      </p>
      <p className="-translate-x-1/2 [word-break:break-word] absolute font-['Pretendard:Medium'] leading-[1.6] left-[calc(50%-0.5px)] not-italic text-[18px] text-center text-white top-[157px] w-[575px]" data-node-id="1144:471">
        채팅을 통해 사람들과 이야기를 나눠요.
      </p>
    </div>
  );
}
