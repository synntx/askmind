"use client";

import React from "react";

const page = () => {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <h1 className="text-xl">Register Now</h1>
      <form
        className="space-y-6 w-80"
        // onSubmit={(e) => {
        //   e.preventDefault();
        //   signIn({ email, password });
        // }}
      >
        <div className="">
          <input
            type="email"
            autoFocus
            id="email"
            className=""
            placeholder="Email address"
            // value={email}
            // onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div className="">
          <input
            type="password"
            id="password"
            className=""
            placeholder="Password"
            // value={password}
            // onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        <button
          type="submit"
          className="w-full bg py-1.5 text-lg font-medium bg-gray-950 dark:text-gray-950 dark:bg-gray-200 rounded-md    hover:opacity-90 duration-300"
          // disabled={!email || password.length < 6}
        >
          Log in
        </button>
      </form>
    </div>
  );
};

export default page;
