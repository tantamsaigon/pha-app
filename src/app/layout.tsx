import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@/context/AuthContext';

export const metadata: Metadata = {
  title: 'Sổ Tay Sức Khỏe',
  description: 'Trợ lý AI Phân tích Sức khỏe Cá nhân',
  icons: {
    icon: '/favicon.ico',                  // Icon cho tab trình duyệt
    apple: '/apple-touch-icon.png',        // Icon khi Thêm vào màn hình chính iPhone (iOS)
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Sổ Tay Sức Khỏe',             // Tên hiển thị mặc định dưới ứng dụng ở MH chính
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi">
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
