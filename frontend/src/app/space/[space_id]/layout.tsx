import ConvSidebar from "@/components/conversation/convSidebar";

interface LayoutProps {
  children: React.ReactNode;
}

const Layout = ({ children }: LayoutProps) => {
  return (
    <div className="flex h-screen overflow-hidden">
      <ConvSidebar />
      <main className="flex-1">{children}</main>
    </div>
  );
};

export default Layout;
