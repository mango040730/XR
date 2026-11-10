// Adapted from Figma node 1144:472; original assets stored locally.
import { h } from '../../components/dom';

const imgMail01 = `${import.meta.env.BASE_URL}assets/figma/3be9a260-4664-4a68-b86f-87189cedaffd.svg`;
const imgBiPeopleFill = `${import.meta.env.BASE_URL}assets/figma/3a533ec9-b334-4137-af62-a75c8e3df91d.svg`;
const imgAkarIconsArrowRight = `${import.meta.env.BASE_URL}assets/figma/93aad2fc-2e52-469e-bc75-25881dfe1789.svg`;
const imgAkarIconsArrowRight1 = `${import.meta.env.BASE_URL}assets/figma/d6851e05-f3d3-4880-8c3b-a489d2a30d51.svg`;
const imgGroup = `${import.meta.env.BASE_URL}assets/figma/8539d430-d5d7-4452-8c11-582242566215.svg`;
const imgAkarIconsThreeLineHorizontal = `${import.meta.env.BASE_URL}assets/figma/dfb95980-dc49-4103-8f99-f84873aa1d47.svg`;

function Mail01({ className }: { className?: string }) {
  return (
    <div className={className || "relative size-[24px]"} data-node-id="1082:516" data-name="mail-01">
      <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgMail01} />
    </div>
  );
}

export default function Component() {
  return (
    <div className="bg-[rgba(255,255,255,0.1)] relative size-full" data-node-id="1144:472" data-name="모드 선택">
      <p className="-translate-x-1/2 [word-break:break-word] absolute font-['Pretendard:Bold'] leading-[normal] left-[calc(50%-0.5px)] not-italic text-[36px] text-center text-white top-[120px] whitespace-nowrap" data-node-id="1144:473">
        원하는 모드를 선택하세요
      </p>
      <div className="absolute content-stretch flex gap-[16px] h-[288px] items-center left-[48px] top-[272px] w-[1102px]" data-node-id="1144:474">
        <div className="bg-[rgba(255,255,255,0.1)] content-stretch flex flex-[1_0_0] flex-col h-full items-start justify-between min-w-px p-[32px] relative rounded-[24px]" data-node-id="1144:475">
          <div className="[word-break:break-word] content-stretch flex flex-col gap-[16px] items-start not-italic relative shrink-0 text-white w-full" data-node-id="I1144:475;1045:1137">
            <p className="font-['Pretendard:Bold'] leading-[normal] relative shrink-0 text-[22px] w-full" data-node-id="I1144:475;1045:1138">
              혼자 활동해요
            </p>
            <p className="font-['Pretendard:Medium'] leading-[1.6] relative shrink-0 text-[18px] w-full" data-node-id="I1144:475;1045:1139">
              다른 사람들과 같은 공간에서 혼자 활동하며 즐겨요.
            </p>
          </div>
          <div className="content-stretch flex items-center justify-between relative shrink-0 w-full" data-node-id="I1144:475;1045:1140">
            <div className="content-stretch flex gap-[8px] items-center relative shrink-0" data-node-id="I1144:475;1045:1141">
              <div className="relative shrink-0 size-[16px]" data-node-id="I1144:475;1045:1142" data-name="bi:people-fill">
                <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgBiPeopleFill} />
              </div>
              <p className="[word-break:break-word] font-['Pretendard:Medium'] leading-[normal] not-italic relative shrink-0 text-[16px] text-center text-white whitespace-nowrap" data-node-id="I1144:475;1045:1144">
                12명 참가 중
              </p>
            </div>
            <div className="bg-[rgba(255,255,255,0.2)] border border-[rgba(255,255,255,0.2)] border-solid content-stretch flex gap-[10px] items-center justify-center px-[24px] py-[12px] relative rounded-[1000px] shrink-0" data-node-id="I1144:475;1045:1145">
              <p className="[word-break:break-word] font-['Pretendard:Medium'] leading-[normal] not-italic relative shrink-0 text-[20px] text-center text-white whitespace-nowrap" data-node-id="I1144:475;1045:1146">
                입장
              </p>
              <div className="flex items-center justify-center relative shrink-0" data-node-id="I1144:475;1045:1147">
                <div className="flex-none rotate-180">
                  <div className="relative size-[24px]" data-name="akar-icons:arrow-right">
                    <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgAkarIconsArrowRight} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="bg-[rgba(255,255,255,0.1)] content-stretch flex flex-[1_0_0] flex-col h-full items-start justify-between min-w-px p-[32px] relative rounded-[24px]" data-node-id="1144:476">
          <div className="[word-break:break-word] content-stretch flex flex-col gap-[16px] items-start not-italic relative shrink-0 text-white w-full" data-node-id="I1144:476;1045:1137">
            <p className="font-['Pretendard:Bold'] leading-[normal] relative shrink-0 text-[22px] w-full" data-node-id="I1144:476;1045:1138">
              친목을 다져요
            </p>
            <p className="font-['Pretendard:Medium'] leading-[1.6] relative shrink-0 text-[18px] w-full" data-node-id="I1144:476;1045:1139">
              간단한 콘텐츠를 즐기며 사람들과 이야기를 나눠요.
            </p>
          </div>
          <div className="content-stretch flex items-center justify-between relative shrink-0 w-full" data-node-id="I1144:476;1045:1140">
            <div className="content-stretch flex gap-[8px] items-center relative shrink-0" data-node-id="I1144:476;1045:1141">
              <div className="relative shrink-0 size-[16px]" data-node-id="I1144:476;1045:1142" data-name="bi:people-fill">
                <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgBiPeopleFill} />
              </div>
              <p className="[word-break:break-word] font-['Pretendard:Medium'] leading-[normal] not-italic relative shrink-0 text-[16px] text-center text-white whitespace-nowrap" data-node-id="I1144:476;1045:1144">
                32명 참가 중
              </p>
            </div>
            <div className="bg-[rgba(255,255,255,0.2)] border border-[rgba(255,255,255,0.2)] border-solid content-stretch flex gap-[10px] items-center justify-center px-[24px] py-[12px] relative rounded-[1000px] shrink-0" data-node-id="I1144:476;1045:1145">
              <p className="[word-break:break-word] font-['Pretendard:Medium'] leading-[normal] not-italic relative shrink-0 text-[20px] text-center text-white whitespace-nowrap" data-node-id="I1144:476;1045:1146">
                입장
              </p>
              <div className="flex items-center justify-center relative shrink-0" data-node-id="I1144:476;1045:1147">
                <div className="flex-none rotate-180">
                  <div className="relative size-[24px]" data-name="akar-icons:arrow-right">
                    <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgAkarIconsArrowRight} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="bg-[rgba(255,255,255,0.1)] content-stretch flex flex-[1_0_0] flex-col h-full items-start justify-between min-w-px p-[32px] relative rounded-[24px]" data-node-id="1144:477">
          <div className="[word-break:break-word] content-stretch flex flex-col gap-[16px] items-start not-italic relative shrink-0 text-white w-full" data-node-id="I1144:477;1045:1137">
            <p className="font-['Pretendard:Bold'] leading-[normal] relative shrink-0 text-[22px] w-full" data-node-id="I1144:477;1045:1138">
              협력하며 즐겨요
            </p>
            <p className="font-['Pretendard:Medium'] leading-[1.6] relative shrink-0 text-[18px] w-full" data-node-id="I1144:477;1045:1139">
              사람들과 힘을 합쳐 재밌는 놀이를 즐겨요.
            </p>
          </div>
          <div className="content-stretch flex items-center justify-between relative shrink-0 w-full" data-node-id="I1144:477;1045:1140">
            <div className="content-stretch flex gap-[8px] items-center relative shrink-0" data-node-id="I1144:477;1045:1141">
              <div className="relative shrink-0 size-[16px]" data-node-id="I1144:477;1045:1142" data-name="bi:people-fill">
                <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgBiPeopleFill} />
              </div>
              <p className="[word-break:break-word] font-['Pretendard:Medium'] leading-[normal] not-italic relative shrink-0 text-[16px] text-center text-white whitespace-nowrap" data-node-id="I1144:477;1045:1144">
                21명 참가 중
              </p>
            </div>
            <div className="bg-[rgba(255,255,255,0.2)] border border-[rgba(255,255,255,0.2)] border-solid content-stretch flex gap-[10px] items-center justify-center px-[24px] py-[12px] relative rounded-[1000px] shrink-0" data-node-id="I1144:477;1045:1145">
              <p className="[word-break:break-word] font-['Pretendard:Medium'] leading-[normal] not-italic relative shrink-0 text-[20px] text-center text-white whitespace-nowrap" data-node-id="I1144:477;1045:1146">
                입장
              </p>
              <div className="flex items-center justify-center relative shrink-0" data-node-id="I1144:477;1045:1147">
                <div className="flex-none rotate-180">
                  <div className="relative size-[24px]" data-name="akar-icons:arrow-right">
                    <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgAkarIconsArrowRight} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="absolute content-stretch flex items-center justify-between left-[48px] top-[40px] w-[1104px]" data-node-id="1144:478">
        <div className="bg-[rgba(255,255,255,0.1)] content-stretch flex gap-[10px] items-center justify-center px-[24px] py-[12px] relative rounded-[1000px] shrink-0" data-node-id="1144:479">
          <div className="flex items-center justify-center relative shrink-0" data-node-id="1144:480">
            <div className="flex-none rotate-180">
              <div className="relative size-[24px]" data-name="akar-icons:arrow-right">
                <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgAkarIconsArrowRight1} />
              </div>
            </div>
          </div>
          <p className="[word-break:break-word] font-['Pretendard:Medium'] leading-[normal] not-italic relative shrink-0 text-[20px] text-center text-white whitespace-nowrap" data-node-id="1144:482">
            마이룸
          </p>
        </div>
        <div className="bg-[rgba(255,255,255,0.1)] content-stretch flex gap-[16px] h-[53px] items-center justify-center px-[20px] py-[12px] relative rounded-[1000px] shrink-0" data-node-id="1144:483">
          <div className="overflow-clip relative shrink-0 size-[24px]" data-node-id="1144:484" data-name="akar-icons:bell">
            <div className="absolute inset-[8.33%_16.67%]" data-node-id="1144:485" data-name="Group">
              <div className="absolute inset-[-5%_-6.25%]">
                <img alt="" className="block max-w-none size-full" src={imgGroup} />
              </div>
            </div>
          </div>
          <div className="relative shrink-0 size-[24px]" data-node-id="1144:488" data-name="akar-icons:three-line-horizontal">
            <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgAkarIconsThreeLineHorizontal} />
          </div>
        </div>
      </div>
      <div className="absolute bg-[rgba(255,255,255,0.1)] content-stretch flex flex-col items-start left-[calc(33.33%+111px)] px-[18px] py-[8px] rounded-[109px] top-[179px]" data-node-id="1144:490">
        <div className="content-stretch flex gap-[8px] items-center relative shrink-0" data-node-id="1144:491">
          <Mail01 className="relative shrink-0 size-[24px]" />
          <p className="[word-break:break-word] font-['Pretendard:SemiBold'] leading-[1.6] not-italic relative shrink-0 text-[18px] text-white whitespace-nowrap" data-node-id="1144:493">
            초대장 보내기
          </p>
        </div>
      </div>
    </div>
  );
}
