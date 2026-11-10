// Adapted from Figma node 1144:552; original assets stored locally.
import { h } from '../../components/dom';

const imgHome05 = `${import.meta.env.BASE_URL}assets/figma/2d79e5d7-ac01-44aa-bcff-f9f51af76b4a.svg`;
const imgMenu01 = `${import.meta.env.BASE_URL}assets/figma/4dc85638-f6bb-4f2d-a5ed-86d5f3496037.svg`;
const imgCalendarCheck01 = `${import.meta.env.BASE_URL}assets/figma/428e4d25-6309-468c-bae0-ecde1ddb0e9a.svg`;
const imgUsers03 = `${import.meta.env.BASE_URL}assets/figma/8493035b-c7db-4934-8604-5335d21c01bb.svg`;
const imgBell01 = `${import.meta.env.BASE_URL}assets/figma/430a06c3-0a11-42a2-ab6d-2b6182c43f53.svg`;
const imgAkarIconsArrowRight = `${import.meta.env.BASE_URL}assets/figma/1d5df977-ea54-44b0-8d6d-0d732cfd6d9e.svg`;
const imgCodiconMicOffCompact = `${import.meta.env.BASE_URL}assets/figma/e29cf1cc-f3e5-4634-b78e-6903aa68c395.svg`;
const imgBitcoinIconsPowerFilled = `${import.meta.env.BASE_URL}assets/figma/b6790007-537b-4403-b5be-4069ffa11ce7.svg`;
const imgAtIconsPlay = `${import.meta.env.BASE_URL}assets/figma/21875c19-fe04-49e1-875c-d71827ecd0fe.svg`;

function Home05({ className }: { className?: string }) {
  return (
    <div className={className || "relative size-[24px]"} data-node-id="1080:504" data-name="home-05">
      <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgHome05} />
    </div>
  );
}

function Menu01({ className }: { className?: string }) {
  return (
    <div className={className || "relative size-[24px]"} data-node-id="1080:500" data-name="menu-01">
      <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgMenu01} />
    </div>
  );
}

function CalendarCheck01({ className }: { className?: string }) {
  return (
    <div className={className || "relative size-[24px]"} data-node-id="1080:510" data-name="calendar-check-01">
      <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgCalendarCheck01} />
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

function Bell01({ className }: { className?: string }) {
  return (
    <div className={className || "relative size-[24px]"} data-node-id="1080:497" data-name="bell-01">
      <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgBell01} />
    </div>
  );
}

type BarProps = {
  className?: string;
  name?: "menu-01" | "bell-01" | "home-05" | "users-03" | "calendar-check-01";
  select?: boolean;
};

function Bar({ className, name = "menu-01", select = false }: BarProps) {
  const isBell01AndNotSelect = name === "bell-01" && !select;
  const isCalendarCheck01AndNotSelect = name === "calendar-check-01" && !select;
  const isHome05AndSelect = name === "home-05" && select;
  const isMenu01AndSelect = name === "menu-01" && select;
  const isUsers03AndNotSelect = name === "users-03" && !select;
  return (
    <div className={className || `content-stretch flex items-center p-[8px] relative ${isHome05AndSelect ? "bg-[rgba(255,255,255,0.2)] rounded-[42px]" : isMenu01AndSelect ? "bg-[rgba(255,255,255,0.2)] rounded-[41px]" : ""}`} id={isHome05AndSelect ? "node-1080_562" : isMenu01AndSelect ? "node-1080_565" : isCalendarCheck01AndNotSelect ? "node-1080_525" : isUsers03AndNotSelect ? "node-1080_527" : name === "home-05" && !select ? "node-1080_526" : isBell01AndNotSelect ? "node-1080_528" : "node-1080_529"}>
      {name === "menu-01" && <Menu01 className="relative shrink-0 size-[24px]" />}
      {name === "home-05" && <Home05 className="relative shrink-0 size-[24px]" />}
      {isBell01AndNotSelect && <Bell01 className="relative shrink-0 size-[24px]" />}
      {isUsers03AndNotSelect && <Users03 className="relative shrink-0 size-[24px]" />}
      {isCalendarCheck01AndNotSelect && <CalendarCheck01 className="relative shrink-0 size-[24px]" />}
    </div>
  );
}

export default function Component() {
  return (
    <div className="bg-[rgba(255,255,255,0.1)] relative size-full" data-node-id="1144:552" data-name="마이룸">
      <div className="absolute bg-[rgba(255,255,255,0.1)] content-stretch flex items-center justify-between left-[144px] p-[16px] rounded-[1000px] top-[480px] w-[1008px]" data-node-id="1144:553">
        <div className="content-stretch flex h-[29px] items-center relative shrink-0 w-[172px]" data-node-id="1144:554">
          <div className="absolute content-stretch flex items-center left-[12px] top-0" data-node-id="1144:555">
            <p className="[word-break:break-word] font-['Pretendard:Medium'] leading-[normal] not-italic relative shrink-0 text-[22px] text-white whitespace-nowrap" data-node-id="1144:556">
              채팅 입력하기
            </p>
          </div>
        </div>
        <div className="bg-[rgba(255,255,255,0.1)] content-stretch flex items-center justify-end p-[12px] relative rounded-[1000px] shrink-0" data-node-id="1144:557">
          <div className="flex items-center justify-center relative shrink-0 size-[24px]" data-node-id="1144:558">
            <div className="flex-none rotate-90">
              <div className="relative size-[24px]" data-name="akar-icons:arrow-right">
                <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgAkarIconsArrowRight} />
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="absolute bg-[rgba(255,255,255,0.1)] content-stretch flex items-center justify-center left-[48px] p-[12px] rounded-[1000px] size-[80px] top-[480px]" data-node-id="1144:560">
        <div className="relative shrink-0 size-[32px]" data-node-id="1144:561" data-name="codicon:mic-off-compact">
          <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgCodiconMicOffCompact} />
        </div>
      </div>
      <div className="[word-break:break-word] absolute font-['Pretendard:Medium'] leading-[0] left-[48px] not-italic text-[18px] text-white top-[238px] w-[308px]" data-node-id="1144:563">
        <p className="leading-[1.6] mb-0">[김개똥]: 아니 방금 개꿀잼</p>
        <p className="leading-[1.6] mb-0">[제주사랑]: ㄹㅇㅋㅋ 이따 한번 더 ㄱ?</p>
        <p className="leading-[1.6] mb-0">[화이트하임]: 탁센님 내일 찐으로 만나실?</p>
        <p className="leading-[1.6]">[탁센]: 낼은 쫌;; 학원 가야돼요</p>
      </div>
      <div className="absolute bg-[rgba(255,255,255,0.1)] content-stretch flex gap-[10px] items-center justify-center left-[48px] px-[24px] py-[12px] rounded-[1000px] top-[41px]" data-node-id="1144:564">
        <div className="relative shrink-0 size-[24px]" data-node-id="1144:565" data-name="bitcoin-icons:power-filled">
          <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgBitcoinIconsPowerFilled} />
        </div>
        <p className="[word-break:break-word] font-['Pretendard:Medium'] leading-[normal] not-italic relative shrink-0 text-[20px] text-center text-white whitespace-nowrap" data-node-id="1144:568">
          종료하기
        </p>
      </div>
      <div className="absolute bg-[rgba(255,255,255,0.1)] content-stretch flex gap-[10px] items-center justify-center px-[24px] py-[12px] right-[48px] rounded-[1000px] top-[40px]" data-node-id="1144:569">
        <div className="relative shrink-0 size-[24px]" data-node-id="1144:570" data-name="at-icons:play">
          <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgAtIconsPlay} />
        </div>
        <p className="[word-break:break-word] font-['Pretendard:Medium'] leading-[normal] not-italic relative shrink-0 text-[20px] text-center text-white whitespace-nowrap" data-node-id="1144:572">
          시뮬레이션
        </p>
      </div>
      <div className="-translate-x-1/2 absolute bg-[rgba(255,255,255,0.2)] content-stretch flex gap-[16px] h-[53px] items-center left-1/2 p-[8px] rounded-[120px] top-[40px]" data-node-id="1144:573">
        <div className="content-stretch flex items-center p-[8px] relative shrink-0 size-[40px]" data-node-id="I1144:573;1080:636" data-name="bar">
          <Menu01 className="relative shrink-0 size-[24px]" />
        </div>
        <Bar className="content-stretch flex items-center p-[8px] relative shrink-0" name="bell-01" />
        <div className="bg-[rgba(255,255,255,0.2)] content-stretch flex items-center p-[8px] relative rounded-[42px] shrink-0" data-node-id="I1144:573;1080:642" data-name="bar">
          <Home05 className="relative shrink-0 size-[24px]" />
        </div>
        <Bar className="content-stretch flex items-center p-[8px] relative shrink-0" name="calendar-check-01" />
        <Bar className="content-stretch flex items-center p-[8px] relative shrink-0" name="users-03" />
      </div>
    </div>
  );
}
