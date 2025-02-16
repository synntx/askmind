const Header = () => {
  return (
    <header>
      <div className="max-w-7xl mx-auto px-4 py-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex mb-3 animate-reveal">
            <h2 className="text-3xl tracking-tight">Ask</h2>
            <h2 className="text-3xl tracking-tight text-[#8A92E3]">Mind</h2>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <img
            src="https://github.com/shadcn.png"
            alt="Avatar"
            className="w-8 h-8 rounded-full"
          />
        </div>
      </div>
    </header>
  );
};

export default Header;
