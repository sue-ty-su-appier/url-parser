# TS URL Parser

https://sue-url-parser.netlify.app

A web-based URL parser and comparator built with **React**, **TypeScript**, and **TailwindCSS**, written with the help of [Cursor.ai](https://cursor.sh).
It allows you to parse URLs, view their components, inspect query parameters (including formatted JSON), and compare multiple URLs side-by-side.

## 🚀 Demo

You can prefill URLs by adding them as query parameters in the address bar:

```
?url1=https://example.com?a=1&b=2&url2=https://example.com?a=1&b=3
```

## ✨ Features

- **Parse URL Components**
  Extracts and displays:

  - Protocol
  - Host
  - Path
  - Query parameters (sorted alphabetically)

- **Multiple URL Comparison**

  - Compare up to **3 URLs** at once.
  - Highlights whether parameter keys & values match across URLs.

- **JSON Parameter Support**

  - Automatically detects JSON strings in query parameters.
  - Pretty-prints JSON with **Expand/Collapse** toggle.

- **Parameter Utilities**

  - **IP Lookup**: Opens IP information on [WhatIsMyIPAddress](https://whatismyipaddress.com).
  - **Timestamp Conversion**: Converts Unix timestamps (10 or 13 digits) to local time.
  - **URL Navigation**: Opens parameter values if they are valid URLs.
  - **Recursive Parsing**: Opens the parser with a parameter URL preloaded.

- **Prefill via Query String**

  - Support for `?url1=...&url2=...&url3=...` to share preloaded comparisons.

- **Responsive & Modern UI**

  - Built with **TailwindCSS** for clean and responsive layouts.
  - Minimalist, accessible, and mobile-friendly.

## 🛠 Tech Stack

- **Cursor.ai** – AI-assisted development
- **React** – Frontend library for building the UI
- **TypeScript** – Strongly typed JavaScript
- **TailwindCSS** – Utility-first CSS framework
- **Phosphor Icons** – For clean and consistent icons

## 📦 Installation & Setup

1. **Clone the repo**

   ```bash
   git clone https://github.com/your-username/url-parser.git
   cd url-parser
   ```

2. **Install dependencies**

   ```bash
   npm install
   # or
   yarn install
   ```

3. **Start development server**

   ```bash
   npm run dev
   ```

4. **Build for production**

   ```bash
   npm run build
   ```

5. **Preview production build**

   ```bash
   npm run preview
   ```

## 🖼 Usage

1. Paste one or more URLs into the provided fields.
2. View parsed results:

   - **Protocol** (e.g., `https`)
   - **Host** (e.g., `example.com`)
   - **Path** (e.g., `/path/to/page`)
   - **Parameters** with value inspection.

3. Compare URLs to check for parameter differences.
4. Use the parameter action buttons:

   - **Check IP**
   - **Convert Timestamp**
   - **Go to URL**
   - **Parse URL**
