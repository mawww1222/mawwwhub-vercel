# MawwwHub LuaProtect — Vercel

Website siap deploy ke Vercel untuk upload/paste script Lua, melakukan transformasi obfuscation ringan di browser, lalu download hasilnya.

### Deploy

Upload folder ini ke GitHub, lalu di Vercel pilih **Add New → Project → Import Git Repository**. Biarkan framework terdeteksi sebagai **Next.js** dan gunakan pengaturan build default.

Tidak membutuhkan environment variable.

### Fitur

- Upload `.lua` / `.txt`
- Drag & drop
- Paste langsung
- Basic / Standard / Strong
- Remove comments
- Encode quoted strings
- Minify whitespace
- Copy hasil
- Download `.protected.lua`
- Source Lua diproses di browser pada build default

Proteksi ini bukan VM obfuscation dan bukan jaminan anti-analysis. Selalu uji hasil sebelum digunakan.
