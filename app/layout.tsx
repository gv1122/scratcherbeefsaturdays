import "./globals.css";

export const metadata = {
  title: "scratcherbeefsaturdays",
  description: "worldstar of brooklyn scratchers",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
