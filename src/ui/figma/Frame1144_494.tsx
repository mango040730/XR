// Adapted from Figma node 1144:494; original assets stored locally.
import { h } from '../../components/dom';

const imgAkarIconsArrowRight = `${import.meta.env.BASE_URL}assets/figma/c31195b7-9e80-4314-aca9-56491f5becad.svg`;
const imgGroup = `${import.meta.env.BASE_URL}assets/figma/68e1257f-6aac-4f16-98d7-1405519d571c.svg`;
const imgAkarIconsThreeLineHorizontal = `${import.meta.env.BASE_URL}assets/figma/57396272-1bf2-4fa1-a06b-af61a801e6c6.svg`;
const imgBiPeopleFill = `${import.meta.env.BASE_URL}assets/figma/344ac446-81a4-4cad-9e1b-d6798c55767b.svg`;
const imgAkarIconsArrowRight1 = `${import.meta.env.BASE_URL}assets/figma/b80892a0-aef0-4c9e-849d-57d9ba698b32.svg`;
const imgMajesticonsClose = `${import.meta.env.BASE_URL}assets/figma/6bb2fc8d-664c-4023-ae66-e25c3f764c19.svg`;

export default function Component() {
  return (
    <div className="bg-[rgba(255,255,255,0.1)] relative size-full" data-node-id="1144:494" data-name="콘텐츠, 인원수">
      <p className="-translate-x-1/2 [word-break:break-word] absolute font-['Pretendard:Bold'] leading-[normal] left-[calc(50%+6.5px)] not-italic text-[36px] text-center text-white top-[138px] whitespace-nowrap" data-node-id="1144:495">
        참여하고 싶은 서버를 선택하세요
      </p>
      <div className="absolute content-stretch flex items-center justify-between left-[48px] top-[40px] w-[1104px]" data-node-id="1144:496">
        <div className="bg-[rgba(255,255,255,0.1)] content-stretch flex gap-[10px] items-center justify-center px-[24px] py-[12px] relative rounded-[1000px] shrink-0" data-node-id="1144:497">
          <div className="flex items-center justify-center relative shrink-0" data-node-id="1144:498">
            <div className="flex-none rotate-180">
              <div className="relative size-[24px]" data-name="akar-icons:arrow-right">
                <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgAkarIconsArrowRight} />
              </div>
            </div>
          </div>
          <p className="[word-break:break-word] font-['Pretendard:Medium'] leading-[normal] not-italic relative shrink-0 text-[24px] text-center text-white whitespace-nowrap" data-node-id="1144:500">
            모드 선택
          </p>
        </div>
        <div className="bg-[rgba(255,255,255,0.1)] content-stretch flex gap-[16px] h-[53px] items-center justify-center px-[20px] py-[12px] relative rounded-[1000px] shrink-0" data-node-id="1144:501">
          <div className="overflow-clip relative shrink-0 size-[24px]" data-node-id="1144:502" data-name="akar-icons:bell">
            <div className="absolute inset-[8.33%_16.67%]" data-node-id="1144:503" data-name="Group">
              <div className="absolute inset-[-5%_-6.25%]">
                <img alt="" className="block max-w-none size-full" src={imgGroup} />
              </div>
            </div>
          </div>
          <div className="relative shrink-0 size-[24px]" data-node-id="1144:506" data-name="akar-icons:three-line-horizontal">
            <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgAkarIconsThreeLineHorizontal} />
          </div>
        </div>
      </div>
      <div className="absolute content-stretch flex flex-col gap-[24px] items-start left-[48px] top-[324px] w-[542px]" data-node-id="1144:508">
        <div className="bg-[rgba(255,255,255,0.1)] content-stretch flex items-center justify-between p-[12px] relative rounded-[1000px] shrink-0 w-full" data-node-id="1144:509">
          <div className="content-stretch flex h-[29px] items-center relative shrink-0 w-[172px]" data-node-id="1144:510">
            <div className="absolute content-stretch flex items-center left-[12px] top-0" data-node-id="1144:511">
              <p className="[word-break:break-word] font-['Pretendard:Bold'] leading-[normal] not-italic relative shrink-0 text-[22px] text-white whitespace-nowrap" data-node-id="1144:512">
                야르 낚시 즐겨요~
              </p>
            </div>
          </div>
          <div className="content-stretch flex gap-[24px] items-center relative shrink-0" data-node-id="1144:513">
            <div className="content-stretch flex gap-[8px] items-center relative shrink-0" data-node-id="1144:514">
              <div className="relative shrink-0 size-[16px]" data-node-id="1144:515" data-name="bi:people-fill">
                <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgBiPeopleFill} />
              </div>
              <p className="[word-break:break-word] font-['Pretendard:Medium'] leading-[normal] not-italic relative shrink-0 text-[18px] text-center text-white whitespace-nowrap" data-node-id="1144:517">
                4/10명 참가 중
              </p>
            </div>
            <div className="bg-[rgba(255,255,255,0.2)] border border-[rgba(255,255,255,0.4)] border-solid content-stretch flex gap-[10px] items-center justify-center px-[24px] py-[16px] relative rounded-[1000px] shrink-0" data-node-id="1144:518">
              <p className="[word-break:break-word] font-['Pretendard:Medium'] leading-[normal] not-italic relative shrink-0 text-[20px] text-center text-white whitespace-nowrap" data-node-id="1144:519">
                입장
              </p>
              <div className="flex items-center justify-center relative shrink-0" data-node-id="1144:520">
                <div className="flex-none rotate-180">
                  <div className="relative size-[24px]" data-name="akar-icons:arrow-right">
                    <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgAkarIconsArrowRight1} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="bg-[rgba(255,255,255,0.1)] content-stretch flex items-center justify-between p-[12px] relative rounded-[1000px] shrink-0 w-full" data-node-id="1144:522">
          <div className="content-stretch flex h-[29px] items-center relative shrink-0 w-[172px]" data-node-id="1144:523">
            <div className="absolute content-stretch flex items-center left-[12px] top-0" data-node-id="1144:524">
              <p className="[word-break:break-word] font-['Pretendard:Bold'] leading-[normal] not-italic relative shrink-0 text-[22px] text-white whitespace-nowrap" data-node-id="1144:525">
                배고프다
              </p>
            </div>
          </div>
          <div className="content-stretch flex gap-[24px] items-center relative shrink-0" data-node-id="1144:526">
            <div className="content-stretch flex gap-[8px] items-center relative shrink-0" data-node-id="1144:527">
              <div className="relative shrink-0 size-[16px]" data-node-id="1144:528" data-name="bi:people-fill">
                <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgBiPeopleFill} />
              </div>
              <p className="[word-break:break-word] font-['Pretendard:Medium'] leading-[normal] not-italic relative shrink-0 text-[18px] text-center text-white whitespace-nowrap" data-node-id="1144:530">
                15/30명 참가 중
              </p>
            </div>
            <div className="bg-[rgba(255,255,255,0.2)] border border-[rgba(255,255,255,0.4)] border-solid content-stretch flex gap-[10px] items-center justify-center px-[24px] py-[16px] relative rounded-[1000px] shrink-0" data-node-id="1144:531">
              <p className="[word-break:break-word] font-['Pretendard:Medium'] leading-[normal] not-italic relative shrink-0 text-[20px] text-center text-white whitespace-nowrap" data-node-id="1144:532">
                입장
              </p>
              <div className="flex items-center justify-center relative shrink-0" data-node-id="1144:533">
                <div className="flex-none rotate-180">
                  <div className="relative size-[24px]" data-name="akar-icons:arrow-right">
                    <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgAkarIconsArrowRight1} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="absolute bg-[rgba(255,255,255,0.1)] content-stretch flex items-center justify-between left-[calc(50%+10px)] p-[12px] rounded-[1000px] top-[324px] w-[542px]" data-node-id="1144:535">
        <div className="content-stretch flex h-[29px] items-center relative shrink-0 w-[172px]" data-node-id="1144:536">
          <div className="absolute content-stretch flex items-center left-[12px] top-0" data-node-id="1144:537">
            <p className="[word-break:break-word] font-['Pretendard:Bold'] leading-[normal] not-italic relative shrink-0 text-[22px] text-white whitespace-nowrap" data-node-id="1144:538">
              불멍팟
            </p>
          </div>
        </div>
        <div className="content-stretch flex gap-[24px] items-center relative shrink-0" data-node-id="1144:539">
          <div className="content-stretch flex gap-[8px] items-center relative shrink-0" data-node-id="1144:540">
            <div className="relative shrink-0 size-[16px]" data-node-id="1144:541" data-name="bi:people-fill">
              <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgBiPeopleFill} />
            </div>
            <p className="[word-break:break-word] font-['Pretendard:Medium'] leading-[normal] not-italic relative shrink-0 text-[18px] text-center text-white whitespace-nowrap" data-node-id="1144:543">
              2/10명 참가 중
            </p>
          </div>
          <div className="bg-[rgba(255,255,255,0.2)] border border-[rgba(255,255,255,0.4)] border-solid content-stretch flex gap-[10px] items-center justify-center px-[24px] py-[16px] relative rounded-[1000px] shrink-0" data-node-id="1144:544">
            <p className="[word-break:break-word] font-['Pretendard:Medium'] leading-[normal] not-italic relative shrink-0 text-[20px] text-center text-white whitespace-nowrap" data-node-id="1144:545">
              입장
            </p>
            <div className="flex items-center justify-center relative shrink-0" data-node-id="1144:546">
              <div className="flex-none rotate-180">
                <div className="relative size-[24px]" data-name="akar-icons:arrow-right">
                  <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgAkarIconsArrowRight1} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="-translate-x-1/2 -translate-y-1/2 absolute bg-[rgba(255,255,255,0.1)] content-stretch flex gap-[10px] items-center left-1/2 px-[24px] py-[12px] rounded-[1000px] top-[calc(50%-76px)]" data-node-id="1144:548">
        <p className="[word-break:break-word] font-['Pretendard:Medium'] leading-[normal] not-italic relative shrink-0 text-[18px] text-center text-white whitespace-nowrap" data-node-id="1144:549">
          직접 서버 만들기
        </p>
        <div className="relative shrink-0 size-[24px]" data-node-id="1144:550" data-name="majesticons:close">
          <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgMajesticonsClose} />
        </div>
      </div>
    </div>
  );
}
