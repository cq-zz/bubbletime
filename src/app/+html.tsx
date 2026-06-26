import { ScrollViewStyleReset } from "expo-router/html";
import type { PropsWithChildren } from "react";

const base = process.env.EXPO_BASE_URL ?? "";

function p(path) {
  return `${base}${path}`;
}

export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no, viewport-fit=cover" />
        <meta name="theme-color" content="#0B0B1A" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <title>泡泡时光 - BubbleTime</title>
        <meta name="apple-mobile-web-app-title" content="泡泡时光" />
        <link rel="manifest" href={p("/manifest.json")} />
        <link rel="apple-touch-icon" href={p("/icons/icon-180.png")} />
        <link rel="apple-touch-startup-image" href={p("/icons/splash.png")} />
        <link rel="icon" type="image/png" sizes="32x32" href={p("/icons/icon-32.png")} />
        <link rel="icon" type="image/png" sizes="16x16" href={p("/icons/icon-16.png")} />
        <ScrollViewStyleReset />
        <script
          dangerouslySetInnerHTML={{
            __html: `
if ("serviceWorker" in navigator) {
  window.addEventListener("load", function () {
    navigator.serviceWorker
      .register("${p("/sw.js")}")
      .then(function (reg) {
        console.log("SW registered:", reg.scope);
      })
      .catch(function (err) {
        console.error("SW registration failed:", err);
      });
  });
}`,
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
