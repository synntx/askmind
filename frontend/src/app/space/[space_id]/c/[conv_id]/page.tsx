"use client";

import { useParams } from "next/navigation";
import React from "react";

const page = () => {
  const { conv_id, space_id } = useParams();

  return (
    <div>
      <p>space_id {space_id}</p>
      <p>conv_id {conv_id}</p>
    </div>
  );
};

export default page;
