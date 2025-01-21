# due

## Overview

This is a minimal, React Native app that implements Plaid Link and Plaid's Balance product. The app allows you to link a sample bank account and retrieve balance information associated with the account.

If you're looking for a more fully-featured quickstart, covering more API endpoints, available in more languages, and with explanations of the underlying flows, see the official [Plaid Quickstart](https://www.plaid.com/docs/quickstart). 

## Running the app

### 1. Set up your mobile development environment

You'll need to set up a mobile development environment to run the app on iOS or Android. 

Follow the environment setup instructions found in the official React Native docs: https://reactnative.dev/docs/environment-setup. You'll specifically need to follow the instructions under "React Native CLI Quickstart". Select your "Development OS" and follow the installation instructions for **both** iOS and Android (under "Target OS").

### 2. Install dependencies

1. Ensure you're using Node 20; you can run `nvm use` to make sure you are using a compatible version of Node for this project
2. Run `npm install` in the **TinyQuickstartReactNative/** folder
3. Navigate to the **ios/** folder and run `bundle install && pod install` to install all necessary iOS dependencies

### 3. Equip the app with API credentials

1. Copy the contents of **.env.example** to a new file called **.env**:
   ```bash
   cp .env.example .env
   ```

2. Fill out **.env** with the [client ID and Sandbox secrets found in your Plaid dashboard](https://dashboard.plaid.com/team/keys)
   > **Note:** Do not use quotes (`"`) around the credentials (i.e., `PLAID_CLIENT_ID=adn08a280hqdaj0ad`, not `PLAID_CLIENT_ID="adn08a280hqdaj0ad"`). Use the "Sandbox" secret when setting the `PLAID_SECRET` variable.

### 4. Configure OAuth

#### iOS Setup

Ensure the project has the following configurations set in Xcode:

1. Open **TinyQuickstartReactNative** in Xcode 
2. In the navigator on the left, click on "TinyQuickstartReactNative"
3. Click "TinyQuickstartReactNative" under "Targets"
4. Click "Signing & Capabilities"
5. Under "Signing":
   - Set "Team" to "None"
   - Set "Bundle Identifier" to `com.plaid.linkauth.ios.reactnative`
6. Under "Associated Domains", add `applinks:cdn-testing.plaid.com` as an entry
   > **Note:** If "Associated Domains" isn't present, you'll need to add it as a capability by clicking "+ Capability" (located near the "Signing & Capabilities" tab)

![Xcode configuration](./xcode-config.png)

#### Configure Redirect URI

1. In the ["API" section of the Plaid Dashboard](https://dashboard.plaid.com/team/api), add the following as a redirect URI:
   ```
   https://cdn-testing.plaid.com/link/v2/stable/sandbox-oauth-a2a-react-native-redirect.html
   ```

#### Android Setup

Configure your Android package name in the Plaid Dashboard:

1. In the ["API" section of the Plaid Dashboard](https://dashboard.plaid.com/team/api), add the following as an allowed Android package name:
   ```
   com.tinyquickstartreactnative
   ```

> **Note:** For more information on OAuth with Plaid, see the [OAuth Guide](https://plaid.com/docs/link/oauth/) in Plaid's documentation.

### 5. Start the backend server

In a terminal window, run `node server.js` in the **TinyQuickstartReactNative/** folder. This will run a local server on port 8080.

### 6. Run the app

Open a new terminal window and run one of the following commands in the **TinyQuickstartReactNative/** folder:

```bash
# To run on iOS
npx react-native run-ios

# To run on Android
npx react-native run-android
```

Both commands will:
- Start Metro
- Build the app
- Open a simulator/emulator
- Launch the app

> **Note for iOS:** If you encounter an error related to a simulator not being found, you can specify a simulator:
> ```bash
> npx react-native run-ios --simulator="iPhone 14"
> ```

Alternatively, you can:
1. Run `npx react-native start` in one terminal window (to start Metro)
2. Run `npm run ios` in a separate terminal window

#### Testing OAuth Flow

1. Type "oauth" into the search bar when prompted to select a bank
2. Select "Platypus OAuth Bank"
3. On the next screen, select the first instance of "Platypus OAuth Bank"
4. Click "Continue" when prompted
5. You'll be redirected to the login page for "First Platypus Bank"
6. Click "Sign in" to proceed
7. Link will connect the account and redirect you back to the app

## Troubleshooting

### MISSING_FIELDS error
If you encounter a **MISSING_FIELDS** error:
- Verify you properly filled out the **.env** file
- Ensure your client ID and Sandbox secret are correctly added to the corresponding variables

### Changes not reflecting in Simulator/Emulator

Try these steps:

1. **Reload Metro:**
   - Type 'R' in the Metro terminal window

2. **Restart backend server**

3. **For iOS:**
   - With simulator highlighted, click "Device" in toolbar
   - Select "Erase All Content and Settings"
   - Restart simulator
   - Rebuild: `npx react-native run-ios`

4. **For Android:**
   - Quit emulator
   - Open Android Studio
   - In "Device Manager":
     - Expand menu under "Actions"
     - Click "Wipe Data"
   - Restart emulator
   - Rebuild: `npx react-native run-android`

![Android Studio wipe data](./android-studio-wipe-data.png)