import { Role } from "@/lib/auth/roles";

export const BRAND = {
  name: "CareBridge",
  tagline: "Making healthcare easier to reach",
  shortDescription:
    "Patient-centered access to care, education, community support, scheduling, and telehealth-ready workflows.",
};

export const PUBLIC_NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/services", label: "Services" },
  { href: "/resources", label: "Resources" },
  { href: "/community", label: "Community" },
  { href: "/recipes", label: "Recipes" },
  { href: "/providers", label: "Providers" },
  { href: "/about", label: "About" },
  { href: "/faq", label: "FAQ" },
  { href: "/contact", label: "Contact" },
];

export function getRoleHomePath(role: Role | null | undefined) {
  if (role === "provider") return "/provider";
  if (role === "admin" || role === "organization_owner" || role === "support_staff") return "/admin";
  return "/portal";
}
