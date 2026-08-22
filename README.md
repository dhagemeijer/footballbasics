# Football Basics

# Football Academy App - Functional Specification

## Overview
Create a web application called **"Football Basics"** for a youth football (soccer) academy for kids aged 7-12. The app enables players to view training programs, sign up for sessions, track their stats, and interact with trainers.

**IMPORTANT: The entire app must be in Dutch (Nederlands).** All interface text, labels, buttons, messages, and content should be in Dutch. This includes navigation, forms, notifications, and user-facing text throughout the application.

## User Roles & Authentication

### Role Types
1. **Player** - Academy members (kids aged 7-12)
2. **Trainer** - Coaches who can view sessions and stats
3. **Admin** - Full control over app (subset of Trainer role)

### Account Creation (Player)
- Players create accounts with:
  - First name only
  - Password
  - Selection of 1 cartoon-style football-themed avatar from 20 colorful options
- No email or phone number required (privacy protection for minors)
- Avatar options should be:
  - Cartoon-style illustrations
  - Football/soccer themed (balls, boots, jerseys, goal posts, whistles, etc.)
  - Bright, colorful, and kid-friendly
  - 20 distinct options

### Pre-configured Accounts
Create these accounts on app initialization:

**Admin Account:**
- Username: Dennis
- Password: @Football*Basics23
- Role: Trainer (with admin privileges - Dennis is both a trainer AND has full admin access)

**Trainer Accounts:**
- Username: Finn | Password: #Finn12 | Role: Trainer
- Username: Enzo | Password: %Enzo16 | Role: Trainer
- Username: Joris | Password: &Joris31 | Role: Trainer

### Login System
- Simple login with username and password
- Players can change their own password when logged in
- Session persistence using secure state management

## Core Features

### 1. Training Program View (All Users)
- Display upcoming training sessions with:
  - Date and time
  - Session focus/theme
  - Number of available spots
  - Current number of signups
- Allow filtering by date/week
- Show which sessions the current player is registered for

### 2. Session Sign-up (Players)
- Players can sign up for available training sessions
- Show confirmation when registered
- Display if session is full
- Allow players to cancel their registration

### 3. Training Focus Suggestions (Players)
- Players can suggest topics/skills they want to focus on in training
- Simple text input form
- Suggestions visible to trainers and admin

### 4. Session Comments (All Users)
- Players and trainers can leave comments on past sessions
- Display commenter name and role
- Timestamp for each comment
- Admin can moderate/delete inappropriate comments

### 5. Player Profile Page (Players)
- Display personal stats:
  - Number of sessions attended
  - Crossbars hit (total count)
  - Fastest running speed (in km/h or m/s)
  - Hardest shot speed (in km/h)
- Show selected avatar
- Option to change password
- Display name and role

### 6. Overall Stats Page (All Users)
- Leaderboard-style view showing all players and trainers
- Sortable columns:
  - Name
  - Role (Player/Trainer)
  - Sessions attended
  - Crossbars hit
  - Running speed
  - Shooting speed
- Visual indicators for top performers
- Include trainer stats alongside player stats

### 7. Admin Dashboard (Admin Only)

**Session Management:**
- Create new training sessions with:
  - Date and time
  - Session focus/description
  - Maximum number of participants
- Edit existing sessions
- Delete sessions
- View list of registered players per session

**Attendance & Stats Entry:**
- Mark players as attended/not attended for each session
- Automatically increment "sessions attended" count when marked present
- Enter individual stats per player:
  - Crossbars hit (during that session)
  - Running speed (best time/speed recorded)
  - Shooting speed (hardest shot recorded)
- Edit historical stats for any player
- View session-by-session history for each player

**User Management:**
- View all user accounts
- Create new player or trainer accounts
- Edit user details (name, role, password)
- Delete accounts
- Set number of available training sessions per player (quota system)

**Communication:**
- Send notifications/messages to all players
- Encourage players to sign up for upcoming sessions
- Broadcast announcements

## Technical Requirements

### Data Storage
- Use persistent storage for:
  - User accounts (username, password hash, role, avatar selection)
  - Player stats (sessions attended, crossbars, speeds)
  - Training sessions (date, time, description, capacity, registrations)
  - Comments and suggestions
  - Session history and attendance records

### Security
- Secure password storage (hashing)
- Role-based access control
- Admin-only routes protected
- Session management for logged-in users

### UI/UX Requirements
- Kid-friendly, colorful interface
- Large, clear buttons and text
- Intuitive navigation
- Mobile-responsive design
- Visual feedback for actions (success/error messages)
- Confirmation dialogs for important actions (delete, cancel registration)

### Navigation Structure
**All Users:**
- Home/Dashboard
- Training Program
- Overall Stats
- Profile (when logged in)

**Players:**
- My Sessions
- Suggest Training Focus

**Admin:**
- Admin Dashboard
  - Session Management
  - Attendance & Stats
  - User Management
  - Send Messages

## Key User Flows

### Player Registration Flow
1. Click "Create Account"
2. Enter first name
3. Create password
4. Select avatar from 20 options
5. Submit → Auto-login → Redirect to dashboard

### Session Sign-up Flow
1. View training program
2. Click session to see details
3. Click "Sign Up" if spots available
4. Confirmation message
5. Session appears in "My Sessions"

### Admin Attendance Flow
1. Navigate to Admin Dashboard → Attendance
2. Select training session from past sessions
3. View list of registered players
4. Check attendance for each player
5. Enter stats (crossbars, running speed, shooting speed)
6. Save → Automatically updates player's total sessions attended and stats

### Admin Session Creation Flow
1. Navigate to Admin Dashboard → Session Management
2. Click "Create New Session"
3. Enter date, time, focus, max participants
4. Save → Session appears in training program

## Visual Design Notes
**Brand Name:** Football Basics

**Color Scheme:**
- **Primary/Main color:** Black (#000000) - Used for backgrounds, main sections, headers
- **Secondary color:** White (#FFFFFF) - Used for text on black backgrounds, cards, content areas
- **Accent color:** Red (#bd1622) - Used for buttons, highlights, calls-to-action, important elements, and details

**Design Guidelines:**
- Black dominant backgrounds with white text for main sections
- Red accents for interactive elements (buttons, links, active states)
- White cards/panels on black backgrounds for content sections
- Red highlights for selected items, notifications, and important stats
- Football/soccer visual motifs throughout
- Card-based layouts for sessions and stats
- Progress bars or charts using the red accent color
- Playful, energetic typography suitable for kids
- High contrast for readability (black/white/red combination)
- Red underlines or borders for emphasis

## Initial Data
On first load, create:
- 4 trainer accounts (Dennis as admin, Finn, Enzo, Joris)
- 5-10 sample player accounts with varied stats
- 3-4 upcoming training sessions
- 2-3 past sessions with sample comments

## Success Metrics Display
- Total academy members
- Total sessions completed
- Most attended session type
- Top performers (most sessions, fastest runner, hardest shooter)

## Additional Features to Consider
- Badge/achievement system for milestones
- Photo gallery from sessions (admin upload)
- Season/progress tracking
- Training focus voting system
- Team assignments or groups

---

**Implementation Priority:**
1. Authentication system with role management
2. Player profile and stats tracking
3. Training session CRUD and sign-up system
4. Admin dashboard with attendance and stats entry
5. Comments and suggestions features
6. Notifications/messaging system
7. Overall stats leaderboard
8. Polish UI/UX with kid-friendly design

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://footballbasics.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/d08ec774-4962-4d78-91e9-53a0257735ed).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
