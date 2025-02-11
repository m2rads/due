# Due - Financial Management App

A monorepo containing a React Native mobile app and Express.js backend for financial management.

## What's inside?

This Turborepo includes the following packages/apps:

### Apps

- `apps/mobile`: React Native mobile app
- `apps/backend`: Express.js backend server with Plaid integration

### Packages

- `packages/ui`: Shared React Native UI components
- `packages/typescript-config`: Shared TypeScript configurations

## Prerequisites

- Node.js >= 18
- Yarn
- iOS: XCode and CocoaPods
- Android: Android Studio and SDK

## Getting Started

1. Install dependencies:
```sh
yarn install
```

2. Start the backend server:
```sh
yarn backend
```

3. Run the mobile app:

For iOS:
```sh
yarn mobile:ios
```

For Android:
```sh
yarn mobile:android
```

## Development

- Start Metro bundler:
```sh
yarn mobile:dev
```

- Run tests:
```sh
yarn test
```

- Lint code:
```sh
yarn lint
```

## Project Structure

```
due/
├── apps/
│   ├── mobile/          # React Native mobile app
│   └── backend/         # Express.js backend
├── packages/
│   ├── ui/             # Shared UI components
│   └── typescript-config/ # Shared TS config
```

## Useful Commands

- `yarn dev`: Run all development servers
- `yarn build`: Build all packages
- `yarn clean`: Clean all builds
- `yarn mobile:pods`: Install iOS pods
- `yarn mobile:clean`: Clean mobile build files

## Tech Stack

- React Native
- Express.js
- TypeScript
- Plaid API
- TailwindCSS (via NativeWind)
- Turbo Repo
