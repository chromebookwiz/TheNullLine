# The Null Line Project

[![Vercel Deployment](https://img.shields.io/badge/Vercel-Black?style=for-the-badge&logo=vercel&logoColor=white)](https://thenullline.vercel.app)
[![License: CC BY 4.0](https://img.shields.io/badge/License-CC%20BY%204.0-lightgrey.svg?style=for-the-badge)](https://creativecommons.org/licenses/by/4.0/)

This repository contains the public site for The Null Line Project. It combines a document archive with a desktop-like front end: an orbital file selector on the landing page, draggable windows for apps and documents, and dynamic routes for individual texts.

## Overview

The app is built with Next.js and React. The homepage centers on a wheel-style navigator that opens project apps or source documents, while the rest of the site exposes the same writing through direct document routes under `/docs/[slug]`.

## What is in this repo

- A landing page with the orbital wheel UI and draggable window system
- Text documents stored in `NullTech/` and mirrored to `public/docs/`
- Interactive apps such as NullDeck, NullForge, NullHover, the community view, and the photonic visualization
- API routes for auth and donation-related actions

## Stack

- Next.js App Router
- React 19
- Framer Motion
- Three.js with React Three Fiber
- Tailwind CSS 4
- Mammoth for DOCX conversion

## Local development

1. Clone the repository.
2. Install dependencies with `npm install`.
3. Start the dev server with `npm run dev`.
4. Create a production build with `npm run build`.

## Notes

- The landing page wheel is intended to work with mouse wheel, touch swipe, keyboard navigation, and click selection.
- Documents are available both through the windowed interface and through static-friendly routes in `src/app/docs/[slug]`.
- The project includes interactive canvases, so production validation should always include a full build.

## License

All texts and documents in this repository are licensed under the [Creative Commons Attribution 4.0 International (CC BY 4.0)](https://creativecommons.org/licenses/by/4.0/) license.
