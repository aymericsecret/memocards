import type { SVGProps } from "react";

type IconProps = Omit<SVGProps<SVGSVGElement>, "height" | "width"> & {
  size?: number;
};

function MaterialIcon({ children, size = 18, ...props }: IconProps) {
  return (
    <svg
      aria-hidden="true"
      fill="currentColor"
      height={size}
      viewBox="0 -960 960 960"
      width={size}
      {...props}
    >
      {children}
    </svg>
  );
}

export function CheckIcon(props: IconProps) {
  return (
    <MaterialIcon {...props}>
      <path d="M382-240 154-468l57-57 171 171 367-367 57 57-424 424Z" />
    </MaterialIcon>
  );
}
