import {cn} from "@/lib/utils";

interface CardHoverFrameProps {
  className?: string;
}

export function CardHoverFrame({className}: CardHoverFrameProps) {
  const frameClassName =
    "pointer-events-none absolute inset-0 rounded-[inherit] opacity-0 transition-opacity duration-300 ease-out group-hover:opacity-100";
  const cornerLineClassName =
    "absolute bg-white/68 transition-all duration-300 ease-out";

  return (
    <div className={cn(frameClassName, className)}>
      <div className="absolute inset-[1px] rounded-[inherit] border border-white/10" />

      <div className="absolute left-4 top-4 h-4 w-4 transition-all duration-300 ease-out group-hover:left-[1.1rem] group-hover:top-[1.1rem]">
        <span className={cn(cornerLineClassName, "left-0 top-0 h-px w-full")} />
        <span className={cn(cornerLineClassName, "left-0 top-0 h-full w-px")} />
      </div>

      <div className="absolute right-4 top-4 h-4 w-4 transition-all duration-300 ease-out group-hover:right-[1.1rem] group-hover:top-[1.1rem]">
        <span className={cn(cornerLineClassName, "right-0 top-0 h-px w-full")} />
        <span className={cn(cornerLineClassName, "right-0 top-0 h-full w-px")} />
      </div>

      <div className="absolute bottom-4 left-4 h-4 w-4 transition-all duration-300 ease-out group-hover:bottom-[1.1rem] group-hover:left-[1.1rem]">
        <span className={cn(cornerLineClassName, "bottom-0 left-0 h-px w-full")} />
        <span className={cn(cornerLineClassName, "bottom-0 left-0 h-full w-px")} />
      </div>

      <div className="absolute bottom-4 right-4 h-4 w-4 transition-all duration-300 ease-out group-hover:bottom-[1.1rem] group-hover:right-[1.1rem]">
        <span className={cn(cornerLineClassName, "bottom-0 right-0 h-px w-full")} />
        <span className={cn(cornerLineClassName, "bottom-0 right-0 h-full w-px")} />
      </div>
    </div>
  );
}
