import Document, { Html, Head, Main, NextScript } from "next/document";
import React from "react";

class MyDocument extends Document {
  static async getInitialProps(ctx) {
    const initialProps = await Document.getInitialProps(ctx);
    return { ...initialProps };
  }

  render() {
    return (
      <Html lang="en" className="">
        <Head>
          <meta
            name="description"
            content="Browse Reddit better with Troddit. Grid views, single column mode, galleries, and a number of post styles. Login with Reddit to see your own subs, vote, and comment. Open source. "
          ></meta>

          <meta httpEquiv="Content-Type" content="text/html; charset=utf-8" />
          <link rel="manifest" href="/manifest.json" />
          <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
          <meta name="theme-color" content="#287453" />

          <meta name="application-name" content="troddit" />
          <meta name="apple-mobile-web-app-capable" content="yes" />
          <meta
            name="apple-mobile-web-app-status-bar-style"
            content="default"
          />
          <meta name="apple-mobile-web-app-title" content="troddit" />
          <meta name="format-detection" content="telephone=no" />
          <meta name="mobile-web-app-capable" content="yes" />
          {/* <meta
            name="msapplication-config"
            content="/icons/browserconfig.xml"
          /> */}
          <meta name="msapplication-TileColor" content="#384659" />
          <meta name="msapplication-tap-highlight" content="no" />

          <link rel="shortcut icon" href="/favicon.ico" />

          <meta name="twitter:card" content="summary" />
          <meta name="twitter:url" content="https://troddit.com" />
          <meta name="twitter:title" content="troddit" />
          <meta name="twitter:description" content="A web app for Reddit" />
          <meta
            name="twitter:image"
            content="https://troddit.com/icon-192.png"
          />
          {/* <meta name="twitter:creator" content="@DavidWShadow" /> */}
          <meta property="og:type" content="website" />
          {/* <meta property="og:title" content="troddit" />
          <meta property="og:description" content="A web app for Reddit" /> */}
          <meta property="og:site_name" content="troddit" />
          <meta property="og:url" content="https://troddit.com" />
          <meta
            property="og:image"
            content="https://troddit.com/icon-512.png"
          />
        </Head>
          <body>
            <Main />
            <NextScript />
          </body>
      </Html>
    );
  }
}

export default MyDocument;
