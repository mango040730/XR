// Adapted from Figma node 1144:715; original assets stored locally.
import { h } from '../../components/dom';

const imgImage102 = `${import.meta.env.BASE_URL}assets/figma/0e8e5365-cf65-4be6-bc6c-a600e57bff0e.png`;

export default function Component() {
  return (
    <div className="bg-[#353535] relative size-full" data-node-id="1144:715" data-name="아바타">
      <div className="[word-break:break-word] absolute bg-[rgba(255,255,255,0.2)] content-stretch flex flex-col gap-[4px] items-start leading-[1.6] left-[48px] not-italic px-[32px] py-[28px] rounded-[20px] top-[41px] w-[355px]" data-node-id="1144:718">
        <p className="font-['Pretendard:Bold'] relative shrink-0 text-[32px] text-white w-full" data-node-id="1144:719">
          환영합니다!
        </p>
        <p className="font-['Pretendard:Medium'] relative shrink-0 text-[#dadada] text-[18px] w-full" data-node-id="1144:720">
          이제 나의 아바타를 만들어 볼까요?
        </p>
      </div>
      <div className="absolute bg-[rgba(255,255,255,0.2)] content-stretch flex flex-col gap-[32px] h-[519px] items-center justify-center left-[calc(33.33%+23px)] px-[32px] py-[28px] rounded-[20px] top-[41px] w-[728px]" data-node-id="1144:721">
        <div className="content-stretch flex flex-col gap-[12px] items-start relative shrink-0 w-full" data-node-id="1144:722">
          <p className="[word-break:break-word] font-['Pretendard:Medium'] leading-[normal] not-italic relative shrink-0 text-[18px] text-white w-full" data-node-id="1144:723">
            닉네임을 알려주세요.
          </p>
          <div className="bg-[rgba(0,0,0,0.1)] content-stretch flex items-center justify-center px-[12px] py-[16px] relative rounded-[10px] shrink-0 w-full" data-node-id="1144:724">
            <p className="[word-break:break-word] flex-[1_0_0] font-['Pretendard:Medium'] leading-[normal] min-w-px not-italic relative text-[#bcbcbc] text-[16px]" data-node-id="1144:725">
              홍길동
            </p>
          </div>
        </div>
        <div className="content-stretch flex flex-col gap-[12px] items-start relative shrink-0 w-full" data-node-id="1144:726">
          <p className="[word-break:break-word] font-['Pretendard:Medium'] leading-[normal] not-italic relative shrink-0 text-[18px] text-white w-full" data-node-id="1144:727">
            성별을 알려주세요.
          </p>
          <div className="content-stretch flex gap-[12px] items-start relative shrink-0 w-full" data-node-id="1144:728">
            <div className="bg-[rgba(255,255,255,0.1)] content-stretch flex flex-[1_0_0] items-center justify-center min-w-px px-[3.846px] py-[20px] relative rounded-[7.691px]" data-node-id="1144:729">
              <p className="[word-break:break-word] font-['Pretendard:SemiBold'] leading-[normal] not-italic relative shrink-0 text-[16px] text-center text-white whitespace-nowrap" data-node-id="1144:730">
                여성
              </p>
            </div>
            <div className="bg-[rgba(255,255,255,0.1)] content-stretch flex flex-[1_0_0] items-center justify-center min-w-px px-[3.846px] py-[20px] relative rounded-[7.691px]" data-node-id="1144:731">
              <p className="[word-break:break-word] font-['Pretendard:SemiBold'] leading-[normal] not-italic relative shrink-0 text-[16px] text-center text-white whitespace-nowrap" data-node-id="1144:732">
                남성
              </p>
            </div>
            <div className="bg-[rgba(255,255,255,0.1)] content-stretch flex flex-[1_0_0] items-center justify-center min-w-px px-[3.846px] py-[20px] relative rounded-[7.691px]" data-node-id="1144:733">
              <p className="[word-break:break-word] font-['Pretendard:SemiBold'] leading-[normal] not-italic relative shrink-0 text-[16px] text-center text-white whitespace-nowrap" data-node-id="1144:734">
                기타
              </p>
            </div>
          </div>
        </div>
        <div className="content-stretch flex flex-col gap-[12px] items-start relative shrink-0 w-full" data-node-id="1144:735">
          <p className="[word-break:break-word] font-['Pretendard:Medium'] leading-[normal] not-italic relative shrink-0 text-[18px] text-white w-full" data-node-id="1144:736">
            생일을 알려주세요.
          </p>
          <div className="bg-[rgba(0,0,0,0.1)] content-stretch flex items-center justify-center px-[12px] py-[16px] relative rounded-[10px] shrink-0 w-full" data-node-id="1144:737">
            <p className="[word-break:break-word] flex-[1_0_0] font-['Pretendard:Medium'] leading-[normal] min-w-px not-italic relative text-[#bcbcbc] text-[16px]" data-node-id="1144:738">
              2000.01.01
            </p>
          </div>
        </div>
        <div className="bg-[rgba(255,255,255,0.1)] content-stretch flex items-center justify-center px-[3.846px] py-[24px] relative rounded-[7.691px] shrink-0 w-full" data-node-id="1144:739">
          <p className="[word-break:break-word] font-['Pretendard:Bold'] leading-[normal] not-italic relative shrink-0 text-[18px] text-center text-white whitespace-nowrap" data-node-id="1144:740">
            다음
          </p>
        </div>
      </div>
      <div className="absolute h-[368px] left-[39px] top-[192px] w-[349px]" data-node-id="1144:741" data-name="image 102">
        <img alt="" className="absolute inset-0 max-w-none object-bottom pointer-events-none size-full" src={imgImage102} />
      </div>
    </div>
  );
}
