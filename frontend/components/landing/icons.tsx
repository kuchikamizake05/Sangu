import type { SVGProps } from "react";

function Svg({ children, ...props }: SVGProps<SVGSVGElement>) {
  return <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>{children}</svg>;
}

export function KeyIcon(props: SVGProps<SVGSVGElement>) {
  return <Svg {...props}><circle cx="7.5" cy="15.5" r="4" /><path d="m10.5 12.5 8.5-8.5m-3 3 3 3" /></Svg>;
}

export function BellIcon(props: SVGProps<SVGSVGElement>) {
  return <Svg {...props}><path d="M6 8a6 6 0 0 1 12 0c0 7 3 8 3 8H3s3-1 3-8" /><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" /></Svg>;
}

export function EyeIcon(props: SVGProps<SVGSVGElement>) {
  return <Svg {...props}><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" /><circle cx="12" cy="12" r="3" /></Svg>;
}

export function ShieldIcon(props: SVGProps<SVGSVGElement>) {
  return <Svg {...props}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" /></Svg>;
}

export function LockIcon(props: SVGProps<SVGSVGElement>) {
  return <Svg {...props}><rect x="4" y="11" width="16" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></Svg>;
}

export function ClockIcon(props: SVGProps<SVGSVGElement>) {
  return <Svg {...props}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></Svg>;
}

export function MapPinIcon(props: SVGProps<SVGSVGElement>) {
  return <Svg {...props}><path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 0 1 16 0Z" /><circle cx="12" cy="10" r="3" /></Svg>;
}

export function ChatIcon(props: SVGProps<SVGSVGElement>) {
  return <Svg {...props}><path d="M21 11.5a8.5 8.5 0 0 1-8.5 8.5 8.4 8.4 0 0 1-3.9-.9L3 20l.9-5.6A8.5 8.5 0 1 1 21 11.5Z" /></Svg>;
}

export function ChevronDownIcon(props: SVGProps<SVGSVGElement>) {
  return <Svg width="16" height="16" {...props}><path d="m6 9 6 6 6-6" /></Svg>;
}

export function CheckIcon(props: SVGProps<SVGSVGElement>) {
  return <Svg width="16" height="16" {...props}><path d="m4 12.5 5 5L20 6.5" /></Svg>;
}
