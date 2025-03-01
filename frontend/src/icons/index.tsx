import React from "react";

type IconProps = {
  className?: string;
};

const EditLight: React.FC<IconProps> = ({ className }) => {
  return (
    <svg
      className={className}
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

const TrashLight: React.FC<IconProps> = ({ className }) => {
  return (
    <svg
      className={className}
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

const Ellipse: React.FC<IconProps> = ({ className }) => {
  return (
    <svg
      className={className}
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

const Grid: React.FC<IconProps> = ({ className }) => {
  return (
    <svg
      className={className}
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

const List: React.FC<IconProps> = ({ className }) => {
  return (
    <svg
      className={className}
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

const LoadingIcon: React.FC<IconProps> = ({ className }) => {
  return (
    <svg className={className} viewBox="0 0 24 24">
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

export { EditLight, TrashLight, Ellipse, Grid, List, LoadingIcon };
