import React from "react";

type IconProps = React.SVGProps<SVGSVGElement> & {
  className?: string;
};

const EditLight: React.FC<IconProps> = (props) => {
  return (
    <svg
      {...props}
      className={props.className}
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M6 21L5.81092 17.9747C5.37149 10.9438 10.9554 5 18 5V5L16.542 6.1664C14.3032 7.9574 13 10.669 13 13.536V13.536C13 15.7115 10.8448 17.2303 8.79604 16.4986L6 15.5"
        stroke="currentColor"
      />
    </svg>
  );
};

const TrashLight: React.FC<IconProps> = (props) => {
  return (
    <svg
      {...props}
      className={props.className}
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M9.5 14.5L9.5 11.5"
        stroke="currentColor"
        strokeLinecap="round"
      />
      <path
        d="M14.5 14.5L14.5 11.5"
        stroke="currentColor"
        strokeLinecap="round"
      />
      <path
        d="M3 6.5H21V6.5C19.5955 6.5 18.8933 6.5 18.3889 6.83706C18.1705 6.98298 17.983 7.17048 17.8371 7.38886C17.5 7.89331 17.5 8.59554 17.5 10V15.5C17.5 17.3856 17.5 18.3284 16.9142 18.9142C16.3284 19.5 15.3856 19.5 13.5 19.5H10.5C8.61438 19.5 7.67157 19.5 7.08579 18.9142C6.5 18.3284 6.5 17.3856 6.5 15.5V10C6.5 8.59554 6.5 7.89331 6.16294 7.38886C6.01702 7.17048 5.82952 6.98298 5.61114 6.83706C5.10669 6.5 4.40446 6.5 3 6.5V6.5Z"
        stroke="currentColor"
        strokeLinecap="round"
      />
      <path
        d="M9.5 3.50024C9.5 3.50024 10 2.5 12 2.5C14 2.5 14.5 3.5 14.5 3.5"
        stroke="currentColor"
        strokeLinecap="round"
      />
    </svg>
  );
};

const Ellipse: React.FC<IconProps> = (props) => {
  return (
    <svg
      {...props}
      className={props.className}
      xmlns="http://www.w3.org/2000/svg"
      width="9"
      height="9"
      viewBox="0 0 9 9"
      fill="none"
    >
      <path
        d="M9 4.5C9 6.98528 6.98528 9 4.5 9C2.01472 9 0 6.98528 0 4.5C0 2.01472 2.01472 0 4.5 0C6.98528 0 9 2.01472 9 4.5Z"
        fill="currentColor"
      />
    </svg>
  );
};

const Grid: React.FC<IconProps> = (props) => {
  return (
    <svg
      {...props}
      className={props.className}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
    >
      <rect
        x="4"
        y="4"
        width="6"
        height="6"
        rx="1"
        stroke="currentColor"
        strokeLinejoin="round"
      />
      <rect
        x="4"
        y="14"
        width="6"
        height="6"
        rx="1"
        stroke="currentColor"
        strokeLinejoin="round"
      />
      <rect
        x="14"
        y="14"
        width="6"
        height="6"
        rx="1"
        stroke="currentColor"
        strokeLinejoin="round"
      />
      <rect
        x="14"
        y="4"
        width="6"
        height="6"
        rx="1"
        stroke="currentColor"
        strokeLinejoin="round"
      />
    </svg>
  );
};

const List: React.FC<IconProps> = (props) => {
  return (
    <svg
      {...props}
      className={props.className}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
    >
      <path d="M5 7H19" stroke="currentColor" strokeLinecap="round" />
      <path d="M5 12H19" stroke="currentColor" strokeLinecap="round" />
      <path d="M5 17H19" stroke="currentColor" strokeLinecap="round" />
    </svg>
  );
};

const LoadingIcon: React.FC<IconProps> = (props) => {
  return (
    <svg {...props} className={props.className} viewBox="0 0 24 24">
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="1"
        fill="none"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
};

const CopyLight: React.FC<IconProps> = (props) => {
  return (
    <svg
      {...props}
      className={props.className}
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M8 8V5.2C8 4.0799 8 3.51984 8.21799 3.09202C8.40973 2.71569 8.71569 2.40973 9.09202 2.21799C9.51984 2 10.0799 2 11.2 2H18.8C19.9201 2 20.4802 2 20.908 2.21799C21.2843 2.40973 21.5903 2.71569 21.782 3.09202C22 3.51984 22 4.0799 22 5.2V12.8C22 13.9201 22 14.4802 21.782 14.908C21.5903 15.2843 21.2843 15.5903 20.908 15.782C20.4802 16 19.9201 16 18.8 16H16M5.2 22H12.8C13.9201 22 14.4802 22 14.908 21.782C15.2843 21.5903 15.5903 21.2843 15.782 20.908C16 20.4802 16 19.9201 16 18.8V11.2C16 10.0799 16 9.51984 15.782 9.09202C15.5903 8.71569 15.2843 8.40973 14.908 8.21799C14.4802 8 13.9201 8 12.8 8H5.2C4.0799 8 3.51984 8 3.09202 8.21799C2.71569 8.40973 2.40973 8.71569 2.21799 9.09202C2 9.51984 2 10.0799 2 11.2V18.8C2 19.9201 2 20.4802 2.21799 20.908C2.40973 21.2843 2.71569 21.5903 3.09202 21.782C3.51984 22 4.07989 22 5.2 22Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};

// New icon for the chat copy functionality
const CopyIcon: React.FC<IconProps> = (props) => {
  return (
    <svg
      {...props}
      className={props.className}
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
    </svg>
  );
};

// New checkmark icon for the copied state
const CheckmarkIcon: React.FC<IconProps> = (props) => {
  return (
    <svg
      {...props}
      className={props.className}
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke={props.stroke || "currentColor"}
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M20 6L9 17l-5-5"></path>
    </svg>
  );
};

export {
  EditLight,
  TrashLight,
  Ellipse,
  Grid,
  List,
  LoadingIcon,
  CopyLight,
  CopyIcon,
  CheckmarkIcon,
};
