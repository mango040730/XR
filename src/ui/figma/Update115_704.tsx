// Figma 모드·시뮬레이션 변경 115-704; local original assets.
import { h } from '../../components/dom';

const imgImage110 = `${import.meta.env.BASE_URL}assets/figma-update/84a7bdd1-48aa-471f-ba61-cfe5588e9ccc.png`;
const imgAkarIconsArrowRight = `${import.meta.env.BASE_URL}assets/figma-update/2e6b5e64-634b-4f22-871b-33c806774e27.svg`;
const imgGroup = `${import.meta.env.BASE_URL}assets/figma-update/f41e83f6-e98e-40fb-b7aa-23fd839a6ad8.svg`;
const imgUsers03 = `${import.meta.env.BASE_URL}assets/figma-update/1a4ada1d-86e2-43cc-a6e4-84a536efbe8e.svg`;
const imgCalendarCheck01 = `${import.meta.env.BASE_URL}assets/figma-update/657240f1-9489-4629-8e13-4b4395d078ac.svg`;

export default function Component() {
  return (
    <div className="relative size-full" data-node-id="115:704" data-name="약속잡기 완료">
      <div className="absolute backdrop-blur-[10px] bg-[rgba(0,0,0,0.6)] content-stretch flex flex-col gap-[20px] h-[409px] items-start justify-center left-[calc(33.33%+23px)] px-[24px] py-[28px] right-[calc(33.33%+23px)] rounded-[20px] top-[149px]" data-node-id="115:707">
        <p className="[word-break:break-word] font-[family-name:var(--font-family,'Wanted_Sans:SemiBold')] leading-[var(--vr-heading-1-line-height,36px)] min-w-full not-italic relative shrink-0 text-[color:var(--color-gray-50,#efeeec)] text-[length:var(--vr-heading-1-font-size,28px)] text-center tracking-[var(--vr-heading-1-letter-spacing,0.04px)] w-[min-content]" data-node-id="115:708">
          [채영짱]과 작당모의 완료!
        </p>
        <div className="bg-[rgba(255,255,255,0.1)] flex-[1_0_0] min-h-px overflow-clip relative rounded-[16px] w-full" data-node-id="115:709" data-name="img">
          <div className="-translate-x-1/2 -translate-y-1/2 absolute h-[316px] left-1/2 top-[calc(50%+0.5px)] w-[394px]" data-node-id="115:710" data-name="image 110">
            <img alt="" className="absolute inset-0 max-w-none object-cover pointer-events-none size-full" src={imgImage110} />
          </div>
        </div>
        <div className="[word-break:break-word] content-stretch flex flex-col gap-[4px] items-start leading-[0] not-italic relative shrink-0 text-[color:var(--color-gray-50,#efeeec)] whitespace-nowrap" data-node-id="115:711" data-name="t">
          <div className="flex flex-col font-[family-name:var(--font-family,'Wanted_Sans:SemiBold')] justify-center relative shrink-0 text-[length:var(--vr-heading-2-font-size,22px)] tracking-[var(--vr-heading-2-letter-spacing,0.04px)]" data-node-id="115:712">
            <p className="leading-[var(--vr-heading-2-line-height,30px)]">우마이도 건대점</p>
          </div>
          <div className="flex flex-col font-[family-name:var(--font-family,'Wanted_Sans:Regular')] justify-center relative shrink-0 text-[length:var(--vr-body-font-size,18px)] tracking-[var(--vr-body-letter-spacing,0.04px)]" data-node-id="115:713">
            <p className="leading-[var(--vr-body-line-height,26px)]">2026.10.03.(화) 오후 17:00</p>
          </div>
        </div>
      </div>
      <div className="absolute content-stretch flex items-center justify-between left-[48px] top-[40px] w-[1103px]" data-node-id="115:714">
        <div className="backdrop-blur-[10px] bg-[rgba(0,0,0,0.6)] content-stretch flex gap-[8px] items-center justify-center px-[24px] py-[8px] relative rounded-[1000px] shrink-0" data-node-id="115:715">
          <div className="flex items-center justify-center relative shrink-0" data-node-id="115:716">
            <div className="flex-none rotate-180">
              <div className="relative size-[24px]" data-name="akar-icons:arrow-right">
                <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgAkarIconsArrowRight} />
              </div>
            </div>
          </div>
          <p className="[word-break:break-word] font-[family-name:var(--font-family,'Wanted_Sans:Medium')] leading-[var(--vr-button-line-height,26px)] not-italic relative shrink-0 text-[color:var(--color-gray-50,#efeeec)] text-[length:var(--vr-button-font-size,18px)] text-center tracking-[var(--vr-button-letter-spacing,0.04px)] whitespace-nowrap" data-node-id="115:718">
            마이룸
          </p>
        </div>
        <div className="backdrop-blur-[10px] bg-[rgba(0,0,0,0.6)] content-stretch flex gap-[16px] h-[53px] items-center justify-center px-[20px] py-[12px] relative rounded-[1000px] shrink-0" data-node-id="115:719">
          <div className="overflow-clip relative shrink-0 size-[24px]" data-node-id="115:720" data-name="akar-icons:bell">
            <div className="absolute inset-[8.33%_16.67%]" data-node-id="115:721" data-name="Group">
              <div className="absolute inset-[-5%_-6.25%]">
                <img alt="" className="block max-w-none size-full" src={imgGroup} />
              </div>
            </div>
          </div>
          <div className="relative shrink-0 size-[24px]" data-node-id="115:724" data-name="users-03">
            <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgUsers03} />
          </div>
          <div className="content-stretch flex items-center p-[8px] relative shrink-0" data-node-id="115:726" data-name="bar">
            <div className="relative shrink-0 size-[24px]" data-node-id="115:727" data-name="calendar-check-01">
              <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgCalendarCheck01} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
