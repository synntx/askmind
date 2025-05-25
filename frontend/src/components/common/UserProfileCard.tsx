import React from "react";

interface UserProfileCardProps {
  name: string;
  title?: string;
  avatarUrl?: string;
  profileUrl?: string;
  className?: string;
}

export const UserProfileCard: React.FC<UserProfileCardProps> = ({
  name: originalName,
  title,
  avatarUrl,
  profileUrl,
  className = "",
}) => {
  console.log({
    name: originalName,
    title: title,
    avatarUrl: avatarUrl,
    profileUrl: profileUrl,
    className: className,
  });
  const name = originalName.startsWith("user-content-")
    ? originalName.substring("user-content-".length)
    : originalName;

  const cardInnerContent = (
    <div className="flex items-center space-x-4">
      {avatarUrl ? (
        <img
          src={avatarUrl}
          alt={`Avatar of ${name}`}
          className="h-12 w-12 rounded-full object-cover"
          loading="lazy"
        />
      ) : (
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted text-2xl font-semibold text-muted-foreground">
          {name.substring(0, 1).toUpperCase()}
        </div>
      )}

      <div>
        <h3
          className={`text-lg font-semibold text-foreground tracking-tight ${profileUrl ? "hover:underline" : ""}`}
        >
          {name}
        </h3>
        {title && <p className="text-sm text-muted-foreground">{title}</p>}
      </div>
    </div>
  );

  const cardBaseClasses = `block p-4 rounded-lg transition-all duration-200 ease-in-out ${className}`;

  if (profileUrl) {
    return (
      <a
        href={profileUrl}
        target="_blank"
        rel="noopener noreferrer"
        className={`${cardBaseClasses} group no-underline`}
        title={`View profile of ${name}`}
      >
        {cardInnerContent}
      </a>
    );
  }

  return <div className={cardBaseClasses}>{cardInnerContent}</div>;
};
