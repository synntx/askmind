import { useGetUser } from "@/hooks/useUser";
import { Loader2 } from "lucide-react";

function SettingsRow({ label, value }: { label: string, value: string }) {
  return (
    <div>
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="text-lg font-medium text-foreground">{value}</p>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="flex flex-col items-center justify-center gap-2">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      <p className="text-muted-foreground">Loading user data...</p>
    </div>
  );
}

function ErrorState({ message = "Failed to load user data" }) {
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <p className="text-destructive">{message}</p>
    </div>
  );
}

export default function UserSettings() {
  const { data: user, isLoading, error } = useGetUser();

  if (isLoading) {
    return <LoadingState />;
  }

  if (error || !user) {
    return <ErrorState message={error?.message || "User not found"} />;
  }

  return (
    <div className="w-full p-1">
      <div className="space-y-6">
        <div className="space-y-4 rounded-lg border p-4">
          <SettingsRow label="Name" value={`${user.first_name} ${user.last_name}`} />
          <SettingsRow label="Email" value={user.email} />
          <SettingsRow label="Space Limit" value={`${user.space_limit} spaces`} />
        </div>
      </div>
    </div>
  );
}
