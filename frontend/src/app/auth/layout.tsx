export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen">
      <div className="hidden md:block relative w-1/2 bg-gray-100">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url('/bg.jpeg')` }}
        ></div>
        <div className="absolute inset-0 bg-black opacity-50"></div>
        <div className="relative h-full flex flex-col items-center justify-center text-center text-white px-10">
          <div className="flex mb-3 animate-reveal -ml-2">
            <h2 className="text-4xl font-bold tracking-tight">Ask</h2>
            <h2 className="text-4xl font-bold tracking-tight text-[#8A92E3]">
              Mind
            </h2>
          </div>
          <span className="text-white italic">
            {"Get it Done. Any Task, Any Time"}
          </span>
        </div>
      </div>
      <div className="w-full md:w-1/2 flex items-center justify-center p-8">
        {children}
      </div>
    </div>
  );
}
