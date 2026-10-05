import "./globals.css";
import "./brand-solid.css";
export const metadata = {
  title: "INDEX — SEO Command Center",
  description: "Your website network. One clear view.",
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
