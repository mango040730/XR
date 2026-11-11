// Figma 모드·시뮬레이션 변경 115-855; local original assets.
import { h } from '../../components/dom';

const imgCodiconMicOffCompact = `${import.meta.env.BASE_URL}assets/figma-update/c9b20f3f-539f-4239-b0f0-10d1caa85d87.svg`;
const imgAkarIconsArrowRight = `${import.meta.env.BASE_URL}assets/figma-update/215080d3-8629-43c0-9d6a-d0b61d720dbc.svg`;
const imgAkarIconsArrowRight1 = `${import.meta.env.BASE_URL}assets/figma-update/fa756816-e2e8-45a0-831a-87b5ea5370f2.svg`;
const imgGroup = `${import.meta.env.BASE_URL}assets/figma-update/83a4c866-eebe-4b38-9df1-85ed71d5a8c7.svg`;

export default function Component() {
  return (
    <div className="relative size-full" data-node-id="115:855" data-name="시뮬레이션 화면">
      <div className="-translate-x-1/2 absolute backdrop-blur-[10px] bg-[rgba(0,0,0,0.6)] content-stretch flex items-center justify-center left-1/2 p-[20px] rounded-[1000px] top-[496px]" data-node-id="115:857">
        <div className="relative shrink-0 size-[24px]" data-node-id="115:858" data-name="codicon:mic-off-compact">
          <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgCodiconMicOffCompact} />
        </div>
      </div>
      <div className="absolute backdrop-blur-[10px] bg-[rgba(0,0,0,0.6)] content-stretch flex flex-col gap-[16px] items-start left-[48px] p-[16px] rounded-[8px] top-[340px] w-[267px]" data-node-id="115:860">
        <div className="[word-break:break-word] font-[family-name:var(--font-family,'Wanted_Sans:Medium')] leading-[0] not-italic relative shrink-0 text-[color:var(--color-gray-200,#c4c3c1)] text-[length:var(--vr-label-font-size,16px)] tracking-[var(--vr-label-letter-spacing,0.04px)] w-full" data-node-id="115:861">
          <p className="leading-[var(--vr-label-line-height,22px)] mb-0">[김개똥]: 아니 방금 개꿀잼</p>
          <p className="leading-[var(--vr-label-line-height,22px)] mb-0">[제주사랑]: ㄹㅇㅋㅋ 이따 한번 더 ㄱ?</p>
          <p className="leading-[var(--vr-label-line-height,22px)] mb-0">[화이트하임]: 탁센님 내일 찐으로 만나실?</p>
          <p className="leading-[var(--vr-label-line-height,22px)]">[탁센]: 낼은 쫌;; 학원 가야돼요</p>
        </div>
        <div className="bg-[rgba(255,255,255,0.2)] content-stretch flex items-center justify-between px-[12px] py-[8px] relative rounded-[5px] shrink-0 w-full" data-node-id="115:862">
          <p className="[word-break:break-word] font-[family-name:var(--font-family,'Wanted_Sans:Medium')] leading-[var(--vr-caption-line-height,20px)] not-italic relative shrink-0 text-[length:var(--vr-caption-font-size,14px)] text-[rgba(255,255,255,0.32)] tracking-[var(--vr-caption-letter-spacing,0.04px)] whitespace-nowrap" data-node-id="115:863">
            채팅 입력하기
          </p>
          <div className="flex items-center justify-center relative shrink-0 size-[24px]" data-node-id="115:864">
            <div className="flex-none rotate-90">
              <div className="relative size-[24px]" data-name="akar-icons:arrow-right">
                <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgAkarIconsArrowRight} />
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="absolute content-stretch flex items-center justify-between left-[48px] top-[40px] w-[1103px]" data-node-id="115:866">
        <div className="backdrop-blur-[10px] bg-[rgba(0,0,0,0.6)] content-stretch flex gap-[8px] items-center justify-center px-[24px] py-[8px] relative rounded-[1000px] shrink-0" data-node-id="115:867">
          <div className="flex items-center justify-center relative shrink-0" data-node-id="115:868">
            <div className="flex-none rotate-180">
              <div className="relative size-[24px]" data-name="akar-icons:arrow-right">
                <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgAkarIconsArrowRight1} />
              </div>
            </div>
          </div>
          <p className="[word-break:break-word] font-[family-name:var(--font-family,'Wanted_Sans:Medium')] leading-[var(--vr-button-line-height,26px)] not-italic relative shrink-0 text-[color:var(--color-gray-50,#efeeec)] text-[length:var(--vr-button-font-size,18px)] text-center tracking-[var(--vr-button-letter-spacing,0.04px)] whitespace-nowrap" data-node-id="115:870">
            마이룸
          </p>
        </div>
        <div className="flex flex-row items-center self-stretch" data-node-id="115:871">
          <div className="backdrop-blur-[10px] bg-[rgba(0,0,0,0.6)] content-stretch flex gap-[8px] h-full items-center justify-center px-[24px] py-[8px] relative rounded-[1000px] shrink-0">
            <div className="overflow-clip relative shrink-0 size-[24px]" data-node-id="115:872" data-name="akar-icons:bell">
              <div className="absolute inset-[8.33%_16.67%]" data-node-id="115:873" data-name="Group">
                <div className="absolute inset-[-5%_-6.25%]">
                  <img alt="" className="block max-w-none size-full" src={imgGroup} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

