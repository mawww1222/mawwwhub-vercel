import './globals.css';

export const metadata = {
  title: 'MawwwHub LuaProtect',
  description: 'Client-side Lua source protector and compressor for personal projects.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
