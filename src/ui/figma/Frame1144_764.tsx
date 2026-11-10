// Adapted from Figma node 1144:764; original assets stored locally.
import { h } from '../../components/dom';

const imgMarkerPin04 = `${import.meta.env.BASE_URL}assets/figma/b289977c-2373-4d26-82bd-5fc6d5091d9e.svg`;
const imgUsers03 = `${import.meta.env.BASE_URL}assets/figma/e1a1af90-0eaa-44f8-b5fb-dd3c5df07694.svg`;
const imgImage101 = `${import.meta.env.BASE_URL}assets/figma/0a2cbb28-b54f-4cdb-a773-bb9e07e0f300.png`;

function MarkerPin04({ className }: { className?: string }) {
  return (
    <div className={className || "relative size-[24px]"} data-node-id="1072:653" data-name="marker-pin-04">
      <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgMarkerPin04} />
    </div>
  );
}

function Users03({ className }: { className?: string }) {
  return (
    <div className={className || "relative size-[24px]"} data-node-id="1072:643" data-name="users-03">
      <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgUsers03} />
    </div>
  );
}

export default function Component() {
  return (
    <div className="bg-[#8c8c8c] relative size-full" data-node-id="1144:764" data-name="동네">
      <div className="absolute h-[811px] left-[-47px] top-[-58px] w-[1266px]" data-node-id="1144:767" data-name="image 101">
        <img alt="" className="absolute inset-0 max-w-none object-cover pointer-events-none size-full" src={imgImage101} />
      </div>
      <div className="absolute backdrop-blur-[1.75px] bg-[rgba(0,0,0,0.6)] h-[632px] left-[-18px] top-0 w-[1232px]" data-node-id="1144:768" />
      <div className="absolute backdrop-blur-[9.05px] bg-[rgba(255,255,255,0.2)] border border-[rgba(255,255,255,0.4)] border-solid content-stretch flex flex-col gap-[22px] items-start left-[264px] px-[32px] py-[28px] rounded-[20px] top-[92px] w-[644px]" data-node-id="1144:769">
        <div className="[word-break:break-word] content-stretch flex flex-col gap-[2px] items-start leading-[1.6] not-italic relative shrink-0 w-full" data-node-id="1144:770">
          <p className="font-['Pretendard:SemiBold'] relative shrink-0 text-[18px] text-white w-full" data-node-id="1144:771">
            동네가 정해졌어요!
          </p>
          <p className="font-['Pretendard:Medium'] relative shrink-0 text-[#dadada] text-[16px] w-full" data-node-id="1144:772">
            00님의 1.7km 안에 있는 동네예요.
          </p>
        </div>
        <div className="content-stretch flex gap-[22px] items-start relative shrink-0 w-full" data-node-id="1144:773">
          <div className="content-stretch flex flex-[1_0_0] items-start min-w-px relative" data-node-id="1144:774">
            <div className="bg-[rgba(255,255,255,0.1)] content-stretch flex flex-[1_0_0] flex-col gap-[16px] items-center justify-center min-w-px p-[20px] relative rounded-[7.691px]" data-node-id="1144:775">
              <p className="[word-break:break-word] font-['Pretendard:SemiBold'] leading-[normal] not-italic relative shrink-0 text-[22px] text-center text-white whitespace-nowrap" data-node-id="1144:776">
                화양동
              </p>
              <div className="content-stretch flex flex-col gap-[2px] items-start relative shrink-0 w-full" data-node-id="1144:777">
                <div className="content-stretch flex gap-[8px] items-center relative shrink-0" data-node-id="1144:778">
                  <Users03 className="relative shrink-0 size-[24px]" />
                  <p className="[word-break:break-word] font-['Pretendard:Medium'] leading-[1.6] not-italic relative shrink-0 text-[#dadada] text-[16px] whitespace-nowrap" data-node-id="1144:780">
                    동네 인원 128명
                  </p>
                </div>
                <div className="content-stretch flex gap-[8px] items-center relative shrink-0" data-node-id="1144:781">
                  <MarkerPin04 className="relative shrink-0 size-[24px]" />
                  <p className="[word-break:break-word] font-['Pretendard:Medium'] leading-[1.6] not-italic relative shrink-0 text-[#dadada] text-[16px] whitespace-nowrap" data-node-id="1144:783">
                    제휴처 12곳
                  </p>
                </div>
              </div>
              <div className="bg-[rgba(255,255,255,0.2)] content-stretch flex items-center justify-center px-[3.846px] py-[12px] relative rounded-[7.691px] shrink-0 w-full" data-node-id="1144:784">
                <p className="[word-break:break-word] font-['Pretendard:SemiBold'] leading-[normal] not-italic relative shrink-0 text-[18px] text-center text-white whitespace-nowrap" data-node-id="1144:785">
                  선택
                </p>
              </div>
            </div>
          </div>
          <div className="content-stretch flex flex-[1_0_0] items-start min-w-px relative" data-node-id="1144:786">
            <div className="bg-[rgba(255,255,255,0.1)] content-stretch flex flex-[1_0_0] flex-col gap-[16px] items-center justify-center min-w-px p-[20px] relative rounded-[7.691px]" data-node-id="1144:787">
              <p className="[word-break:break-word] font-['Pretendard:SemiBold'] leading-[normal] not-italic relative shrink-0 text-[22px] text-center text-white whitespace-nowrap" data-node-id="1144:788">
                자양동
              </p>
              <div className="content-stretch flex flex-col gap-[2px] items-start relative shrink-0 w-full" data-node-id="1144:789">
                <div className="content-stretch flex gap-[8px] items-center relative shrink-0" data-node-id="1144:790">
                  <Users03 className="relative shrink-0 size-[24px]" />
                  <p className="[word-break:break-word] font-['Pretendard:Medium'] leading-[1.6] not-italic relative shrink-0 text-[#dadada] text-[16px] whitespace-nowrap" data-node-id="1144:792">
                    동네 인원 132명
                  </p>
                </div>
                <div className="content-stretch flex gap-[8px] items-center relative shrink-0" data-node-id="1144:793">
                  <MarkerPin04 className="relative shrink-0 size-[24px]" />
                  <p className="[word-break:break-word] font-['Pretendard:Medium'] leading-[1.6] not-italic relative shrink-0 text-[#dadada] text-[16px] whitespace-nowrap" data-node-id="1144:795">
                    제휴처 9곳
                  </p>
                </div>
              </div>
              <div className="bg-[rgba(255,255,255,0.2)] content-stretch flex items-center justify-center px-[3.846px] py-[12px] relative rounded-[7.691px] shrink-0 w-full" data-node-id="1144:796">
                <p className="[word-break:break-word] font-['Pretendard:SemiBold'] leading-[normal] not-italic relative shrink-0 text-[18px] text-center text-white whitespace-nowrap" data-node-id="1144:797">
                  선택
                </p>
              </div>
            </div>
          </div>
        </div>
        <p className="[word-break:break-word] font-['Pretendard:Medium'] leading-[1.6] not-italic relative shrink-0 text-[#dadada] text-[16px] w-full" data-node-id="1144:798">
          선택한 이후에도 언제든 바꿀 수 있어요.
        </p>
      </div>
    </div>
  );
}
