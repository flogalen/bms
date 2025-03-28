import "./globals.css";
import type { Metadata } from "next";
import { Inter as FontSans } from "next/font/google";
import { cn } from "@/lib/utils";
import { AuthProvider } from "@/providers/auth-provider";
import { ThemeProvider } from "next-themes"; // Import ThemeProvider
import { Toaster } from "@/components/ui/sonner"; // Import Toaster

const fontSans = FontSans({
  subsets: ["latin"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: "Business Management System",
  description: "A comprehensive business management system",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body
        className={cn(
          "min-h-screen bg-background font-sans antialiased",
          fontSans.variable
         )}
       >
         <ThemeProvider
           attribute="class"
           defaultTheme="system"
           enableSystem
           disableTransitionOnChange
         >
           <AuthProvider>{children}</AuthProvider>
           <Toaster /> {/* Add Toaster component */}
         </ThemeProvider>
       </body>
     </html>
  );
}
