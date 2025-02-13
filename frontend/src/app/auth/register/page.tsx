import Link from "next/link";

export default function Register() {
  return (
    <div className="w-full max-w-sm">
      <h2 className="text-2xl font-medium mb-8 text-center">
        Create an Account
      </h2>
      <form className="space-y-6">
        <div>
          <label
            htmlFor="name"
            className="block text-sm font-medium text-[#CACACA]"
          >
            Full Name
          </label>
          <input
            type="text"
            id="name"
            required
            placeholder="Harsh"
            className="mt-1 block w-full border border-[#282828]  bg-[#1A1A1A] text-sm placeholder:text-sm placeholder-[#767676] rounded-md p-2 focus:outline-none focus:border-[#8A92E3]/40"
          />
        </div>
        <div>
          <label
            htmlFor="email"
            className="block text-sm font-medium text-[#CACACA]"
          >
            Email
          </label>
          <input
            type="email"
            id="email"
            required
            placeholder="yourname@example.com"
            className="mt-1 block w-full border border-[#282828]  bg-[#1A1A1A] text-sm placeholder:text-sm placeholder-[#767676] rounded-md p-2 focus:outline-none focus:border-[#8A92E3]/40"
          />
        </div>
        <div>
          <label
            htmlFor="password"
            className="block text-sm font-medium text-[#CACACA]"
          >
            Password
          </label>
          <input
            type="password"
            id="password"
            required
            placeholder="secure-password..."
            className="mt-1 block w-full border border-[#282828]  bg-[#1A1A1A] text-sm placeholder:text-sm placeholder-[#767676] rounded-md p-2 focus:outline-none focus:border-[#8A92E3]/40"
          />
        </div>
        <button
          type="submit"
          className="w-full bg-[#D3D3D3] text-black font-medium py-2 rounded-md transition-colors"
        >
          Register
        </button>
      </form>
      <p className="mt-4 text-center text-sm text-[#CACACA]">
        Already have an account?{" "}
        <Link href="/auth/login" className="text-[#8A92E3] hover:underline">
          Login here
        </Link>
      </p>
    </div>
  );
}
