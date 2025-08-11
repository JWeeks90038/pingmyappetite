# Grubana

Grubana is a real-time street food discovery platform that connects users with local food trucks, trailers, and carts. This repository contains the frontend code for the Grubana web app, built with React, Firebase (Client SDK), and Map APIs.

🚀 **Live Demo:** https://grubana.vercel.app

🔒 **Note:** This repo includes only the frontend logic. The backend, including Firebase Cloud Functions, authentication rules, and analytics processing, is kept private for security.

## 🧩 Features
- 📍 Interactive map showing live food truck locations
- 🌶️ Real-time "ping" and "drop" system for customer engagement
- 🔥 Heatmap showing areas of high activity
- 🎯 Distance-based filtering and user tracking
- 📲 Mobile-responsive design with geolocation support

## 🛠️ Tech Stack
- React (Vite or CRA, depending on setup)
- Firebase (client-side only) – Firestore, Auth, Hosting
- Leaflet / Google Maps for real-time maps
- Chart.js for analytics visuals
- Vercel for deployment

## 📁 What's in this repo
- ✅ Fully functional frontend app
- ❌ No backend code or sensitive data
- 🧪 Example environment file: .env.example

## 🧼 Security Notice
All backend logic, private API keys, and Firestore rules are stored securely and not included in this public repo.

For more details on the Grubana project or a full-stack demo, feel free to reach out.

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react/README.md) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript and enable type-aware lint rules. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.
# Last updated: Mon Aug 11 12:34:37 PDT 2025
