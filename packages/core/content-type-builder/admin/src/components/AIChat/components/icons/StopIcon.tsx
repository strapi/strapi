interface StopIconProps extends React.SVGProps<SVGSVGElement> {}

export const StopIcon = (props: StopIconProps) => {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <rect x="2" y="2" width="11" height="11" rx="2" fill="white" />
    </svg>
  );
};
