// Adapted from Figma node 1144:742; original assets stored locally.
import { h } from '../../components/dom';

const imgMark = `${import.meta.env.BASE_URL}assets/figma/6e8c93fc-bf2a-4c42-b722-01d8109ca664.svg`;
const imgImage101 = `${import.meta.env.BASE_URL}assets/figma/aa511c8c-32be-41cf-af80-9b631c60f66e.png`;
const imgSubtract = `${import.meta.env.BASE_URL}assets/figma/de7a12dc-c90e-40f4-9464-4a90f61c8913.svg`;

function Mark({ className }: { className?: string }) {
  return (
    <div className={className || "relative size-[24px]"} data-node-id="1072:520" data-name="mark">
      <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgMark} />
    </div>
  );
}

export default function Component() {
  return (
    <div className="bg-[#8c8c8c] relative size-full" data-node-id="1144:742" data-name="동네">
      <div className="absolute h-[811px] left-[-47px] top-[-58px] w-[1266px]" data-node-id="1144:745" data-name="image 101">
        <img alt="" className="absolute inset-0 max-w-none object-cover pointer-events-none size-full" src={imgImage101} />
      </div>
      <Mark className="absolute left-[580px] size-[24px] top-[271px]" />
      <div className="absolute h-[864.73px] left-[-201px] top-[-112px] w-[1410px]" data-node-id="1144:747" data-name="Subtract">
        <div className="absolute inset-[-0.46%_-0.28%]">
          <img alt="" className="block max-w-none size-full" src={imgSubtract} />
        </div>
      </div>
    </div>
  );
}
