import type { SVGProps } from 'react';

export function TeleVerifyLogo(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 200 50"
      width="150"
      height="37.5"
      aria-label="TeleVerify Logo"
      {...props}
    >
      <rect width="200" height="50" fill="transparent" />
      <text
        x="10"
        y="35"
        fontFamily="Arial, sans-serif"
        fontSize="30"
        fontWeight="bold"
        fill="hsl(var(--primary))"
      >
        Tele<tspan fill="hsl(var(--accent))">Verify</tspan>
      </text>
      <path d="M155 15 L160 25 L155 35" stroke="hsl(var(--accent))" strokeWidth="2" fill="none" />
      <path d="M165 15 L170 25 L165 35" stroke="hsl(var(--accent))" strokeWidth="2" fill="none" />
    </svg>
  );
}
