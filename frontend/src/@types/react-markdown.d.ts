import React from "react";
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { Components } from "react-markdown";

declare module "react-markdown" {
  interface Components {
    "image-gallery"?: React.ElementType;
    "gallery-item"?: React.ElementType;
    "user-profile"?: React.ElementType;
  }
}
