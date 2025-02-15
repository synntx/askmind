import Link from "next/link";

export default function Login() {
  return (
    <div className="w-full max-w-sm">
      <h2 className="text-2xl font-medium mb-8 text-center">Login</h2>
      <form className="space-y-6">
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
            placeholder="yourname@email.com"
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
            placeholder="your-password..."
            className="mt-1 block w-full border border-[#282828]  bg-[#1A1A1A] text-sm placeholder:text-sm placeholder-[#767676] rounded-md p-2 focus:outline-none focus:border-[#8A92E3]/40"
          />
        </div>
        <button
          type="submit"
          className="w-full bg-[#D3D3D3] text-black font-medium py-2 rounded-md transition-colors focus:outline-[#8A92E3]/40"
        >
          Login
        </button>
      </form>
      <p className="mt-4 text-center text-sm text-[#CACACA]">
        {"Don't have an account? "}
        <Link href="/auth/register" className="text-[#8A92E3] hover:underline">
          Create a new one
        </Link>
      </p>
    </div>
  );
}
