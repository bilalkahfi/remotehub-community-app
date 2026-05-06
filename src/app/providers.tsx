"use client";

import { AuthProvider } from "@/hooks/useAuth";
import { ThemeProvider } from "@/hooks/useTheme";
import { NotificationProvider } from "@/hooks/useNotifications";
import { Heartbeat } from "@/hooks/useHeartbeat";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <AuthProvider>
        <NotificationProvider>
          <Heartbeat />
          {children}
        </NotificationProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
