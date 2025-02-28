# Self-Contained Document Scanning and Matching System

## What Is This Application?
This is a simple web tool that lets users upload and scan text documents (like .txt files) and find similar documents they’ve scanned before. It’s great for organizing text files, checking for duplicates, or tracking important documents. There’s also a special admin area to manage user credits and see how the system is being used.

## Why Use It?
- **Easy Document Management**: Upload text files, see if they match others, and keep a history.
- **Credit System**: Everyone gets 20 free scans daily, with options to request more from an admin.
- **Admin Control**: Admins can approve credit requests and view analytics to understand usage.

## Getting Started

### What You’ll Need
- A computer with an internet browser (like Chrome, Firefox, or Edge).
- Node.js installed (a free program for running this app—get it from [nodejs.org](https://nodejs.org/)).

### Step-by-Step Setup
1. **Download the Files**:
   - Copy all the files in this folder to your computer (or clone the GitHub repository if you have it).

2. **Install Node.js** (if you don’t have it):
   - Go to [nodejs.org](https://nodejs.org/), download the latest version for your computer, and install it by following the instructions.

3. **Set Up the Folder**:
   - Open your computer’s file explorer, find the folder where you put these files, and make sure there’s a folder named `uploads` inside it (create it if it’s missing by right-clicking > New > Folder, and name it “uploads”).

4. **Install the App’s Tools**:
   - Open a program like Command Prompt (Windows), Terminal (Mac/Linux), or PowerShell (Windows).
   - Type:
     ```
     cd [path-to-your-folder]
     ```
     For example:
     ```
     cd C:\Users\AKASH\OneDrive\Desktop\self-contained-document-scanning\document-scanning-system\document-scanning-system
     ```
   - Then type:
     ```
     npm install
     ```
     This downloads the tools the app needs (it might take a minute).

5. **Start the App**:
   - In the same window, type:
     ```
     node server.js
     ```
   - You’ll see “Server running on http://localhost:3000” if it works. Leave this window open.

6. **Open the App**:
   - Open your web browser and go to: `http://localhost:3000`.
   - You’ll see the login page to get started.

---

### How to Use the App

#### For Regular Users
1. **Log In or Sign Up**:
   - If you’re new, enter a username and password, then click “Sign Up.”
   - If you have an account, enter your username and password, then click “Login.”

2. **Upload and Scan Documents**:
   - After logging in, you’ll see your dashboard.
   - Click “Choose File” (or browse for a file), pick a .txt file from your computer.
   - Click “Check Matches” to see if it matches any of your past scans (this doesn’t use up credits).
   - If you like, click “Upload” to save it (this uses 1 credit).
   - You get 20 free scans per day, resetting at midnight. If you run out, request more credits.

3. **Request More Credits**:
   - Click “Request Credits,” enter how many you need, and an admin will approve or deny it.

4. **View Past Scans**:
   - See your scanned files under “Past Scans,” and click “Find Matches” to check for similarities.

5. **Export History**:
   - Click “Export History” to download a list of your scans as a text file.

6. **Clear Form**:
   - Click “Clear” to reset the file input, matches, and upload button if you want to start over.

7. **Log Out**:
   - Click “Logout” to exit and return to the login page.

#### For Admins
- An admin (set up manually in the database) can log in and use the admin panel.
- **Manage Credit Requests**:
  - See a list of credit requests, approve or deny them with buttons, or approve all pending requests at once.
- **View Analytics**:
  - See stats like total users, scans per user, credits used, top users by scans, and credit request status.
  - Sort tables by clicking column headers.
- **Log Out**:
  - Click “Logout” to exit.

---

### Features
- **Document Scanning**: Upload .txt files and find similar ones.
- **Credit System**: 20 free daily scans, with admin-managed requests for more.
- **User Management**: Register, log in, and manage your scans.
- **Admin Tools**: Approve credits and view usage analytics.
- **Simple Design**: Easy-to-use interface with clear buttons and messages.

---

### Troubleshooting
- **App Won’t Start**: Make sure Node.js is installed and you followed the setup steps. Check the command window for error messages.
- **Can’t Log In**: Ensure your username and password are correct, or sign up if you’re new.
- **No Matches Found**: Upload more .txt files with similar text to see matches.
- **Credits Not Resetting**: Wait until midnight (your computer’s local time) for daily resets, or ask an admin for credits.

---

### Keeping It Safe
- Use a strong password for your account.
- Don’t share your login details with others.
- This app stores data locally on your computer, so it’s private unless shared.

---

### For Advanced Users (Optional)
- If you know programming, you can tweak the code in `server.js`, `script.js`, and HTML files to add features or change colors.
- The database (`database.sqlite`) stores all user data, documents, and requests—if you want to clear it, delete the file and restart the app for a fresh start (see instructions in the code’s documentation).

---

## Test Data

To test the application, use the sample documents provided in the `test_data` folder:

- `document1.txt`: A test document with the text "Hello world! This is a test document for scanning."
- `document2.txt`: Another test document with similar text ("Hello world! This is another test document for matching.") to demonstrate matching.
- `document3.txt`: A different document ("Completely different text for testing no matches.") to show no matches.

### How to Test
1. **Set Up the App**: Follow the setup instructions above to run the application locally.
2. **Register or Log In**:
   - Register a new user (e.g., username: `testuser`, password: `testpass`) or log in with an existing account.
3. **Upload Sample Documents**:
   - Go to the user dashboard, click "Choose File," select one of the sample `.txt` files (e.g., `document1.txt`), and click "Check Matches" to preview matches.
   - Click "Upload" to save it (this uses 1 credit).
   - Repeat with `document2.txt` to see matches with `document1.txt`.
   - Try `document3.txt` to verify no matches.
4. **Admin Testing** (Optional)**:
   - Log in as an admin (set `role = 'admin'` for a user in `database.sqlite` if needed, e.g., username: `admin`, password: `adminpass`).
   - Go to the admin dashboard, approve credit requests, and check analytics to see scan counts for `testuser`.
