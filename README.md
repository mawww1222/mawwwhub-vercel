# MawwwHub LuaProtect — Vercel

A small Next.js app that runs a conservative Lua source transformation in the browser. It supports `.lua` / `.txt` upload, paste, protection levels, copy, and download.

## Deploy to Vercel

1. Create a GitHub repository and upload this folder.
2. In Vercel, choose **Add New → Project** and import the repository.
3. Keep the detected framework as **Next.js** and use the default build settings.
4. Deploy.

No environment variables are required for the default build.

## Run locally

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Notes

The default app performs the transformation client-side, so source code is not posted to a Vercel API. The transformer removes comments, optionally minifies whitespace, and can replace quoted strings with a small hex decoder expression.

This is not a strong VM/anti-analysis system and should be treated as source obfuscation rather than cryptographic protection. Always test protected output before releasing it.
