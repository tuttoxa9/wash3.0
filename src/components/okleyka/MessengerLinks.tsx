import type React from "react";
import { MessageSquare, MessageCircle, Phone } from "lucide-react";

interface MessengerLinksProps {
  phone: string;
}

const getDigits = (phone: string) => phone.replace(/\D/g, "");

/**
 * Renders compact TG / WA / Viber quick-link badges next to a client phone.
 * Only renders when `phone` is a non-empty string.
 */
const MessengerLinks: React.FC<MessengerLinksProps> = ({ phone }) => {
  if (!phone) return null;

  const digits = getDigits(phone);
  if (!digits) return null;

  const links = [
    {
      label: "TG",
      href: `https://t.me/+${digits}`,
      icon: <MessageSquare className="w-2.5 h-2.5" />,
      className:
        "bg-sky-500/10 text-sky-400 border border-sky-500/20 hover:bg-sky-500/20",
    },
    {
      label: "WA",
      href: `https://wa.me/${digits}`,
      icon: <MessageCircle className="w-2.5 h-2.5" />,
      className:
        "bg-green-500/10 text-green-400 border border-green-500/20 hover:bg-green-500/20",
    },
    {
      label: "Vb",
      href: `viber://chat?number=%2B${digits}`,
      icon: <Phone className="w-2.5 h-2.5" />,
      className:
        "bg-purple-500/10 text-purple-400 border border-purple-500/20 hover:bg-purple-500/20",
    },
  ];

  return (
    <span className="flex items-center gap-1 ml-1">
      {links.map(({ label, href, icon, className }) => (
        <a
          key={label}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          title={label}
          className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[9px] font-bold transition-colors ${className}`}
        >
          {icon}
          {label}
        </a>
      ))}
    </span>
  );
};

export default MessengerLinks;
