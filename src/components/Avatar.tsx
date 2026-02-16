type Props = {
  name: string;
  src?: string | null;
  size?: "sm" | "md" | "lg";
  className?: string;
};

const sizeClasses = { sm: "w-8 h-8 text-xs", md: "w-10 h-10 text-sm", lg: "w-12 h-12 text-base" };

// Placeholder image for users without a picture (e.g. JWT users). Google users use avatarUrl.
const placeholderUrl = (displayName: string) =>
  `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName.trim() || "User")}&background=0d9488&color=fff&size=128`;

export function Avatar({ name, src, size = "md", className = "" }: Props) {
  const sizeClass = sizeClasses[size];
  const imageUrl = src && src.trim() ? src : placeholderUrl(name);

  return (
    <img
      src={imageUrl}
      alt={name || "User"}
      className={`rounded-full object-cover ${sizeClass} ${className}`}
      title={name || undefined}
    />
  );
}
