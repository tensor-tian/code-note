import { SVGProps } from "react";
const SvgComponent = (props: SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    xmlSpace="preserve"
    width={16}
    height={16}
    className="icon"
    viewBox="0 0 1024 1024"
    {...props}
  >
    <rect width="100%" height="100%" fill="transparent" />
    <g>
      <path
        d="M912 820.1V203.9c28-9.9 48-36.6 48-67.9 0-39.8-32.2-72-72-72-31.3 0-58 20-67.9 48H203.9C194 84 167.3 64 136 64c-39.8 0-72 32.2-72 72 0 31.3 20 58 48 67.9v616.2C84 830 64 856.7 64 888c0 39.8 32.2 72 72 72 31.3 0 58-20 67.9-48h616.2c9.9 28 36.6 48 67.9 48 39.8 0 72-32.2 72-72 0-31.3-20-58-48-67.9zM888 112c13.3 0 24 10.7 24 24s-10.7 24-24 24-24-10.7-24-24 10.7-24 24-24zM136 912c-13.3 0-24-10.7-24-24s10.7-24 24-24 24 10.7 24 24-10.7 24-24 24zm0-752c-13.3 0-24-10.7-24-24s10.7-24 24-24 24 10.7 24 24-10.7 24-24 24zm704 680H184V184h656v656zm48 72c-13.3 0-24-10.7-24-24s10.7-24 24-24 24 10.7 24 24-10.7 24-24 24z"
        style={{
          stroke: "none",
          strokeWidth: 1,
          strokeDasharray: "none",
          strokeLinecap: "butt",
          strokeDashoffset: 0,
          strokeLinejoin: "miter",
          strokeMiterlimit: 4,
          fillRule: "nonzero",
          opacity: 1,
        }}
        transform="matrix(.87 0 0 .87 240.402 66.672)"
        vectorEffect="non-scaling-stroke"
      />
      <path
        d="M288 474h448c8.8 0 16-7.2 16-16V282c0-8.8-7.2-16-16-16H288c-8.8 0-16 7.2-16 16v176c0 8.8 7.2 16 16 16zm56-136h336v64H344v-64zm-56 420h448c8.8 0 16-7.2 16-16V566c0-8.8-7.2-16-16-16H288c-8.8 0-16 7.2-16 16v176c0 8.8 7.2 16 16 16zm56-136h336v64H344v-64z"
        style={{
          stroke: "none",
          strokeWidth: 1,
          strokeDasharray: "none",
          strokeLinecap: "butt",
          strokeDashoffset: 0,
          strokeLinejoin: "miter",
          strokeMiterlimit: 4,
          fillRule: "nonzero",
          opacity: 1,
        }}
        transform="matrix(.87 0 0 .87 236.13 62.53)"
        vectorEffect="non-scaling-stroke"
      />
    </g>
    <path
      d="M94.75 50c0 6.213-5.236 11.25-11.696 11.25H16.946C10.486 61.25 5.25 56.213 5.25 50s5.236-11.25 11.696-11.25h66.107c6.461 0 11.697 5.037 11.697 11.25z"
      style={{
        stroke: "#000",
        strokeWidth: 0,
        strokeDasharray: "none",
        strokeLinecap: "butt",
        strokeDashoffset: 0,
        strokeLinejoin: "miter",
        strokeMiterlimit: 4,
        fillRule: "nonzero",
        opacity: 1,
      }}
      transform="matrix(3.75 0 0 2.97 15.7 368.89)"
      vectorEffect="non-scaling-stroke"
    />
  </svg>
);
export default SvgComponent;
