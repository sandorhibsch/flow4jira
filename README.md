# Flow4Jira

Flow metrics and forecasting for Jira Boards 

## 🎯 Features

- **Aging Chart** – Age of items currently in the process, categorized by status. 
- **Cumulative Flow Diagram (CFD)** – Visualization of workflow over time
- **Cycle Time Scatterplot** – Cycle time of items over time and single item forecasting using percentiles
- **Monte Carlo Forecasting** – Probabilistic forecasts
  - "How many items are we going to finish in the next X days?"
  - "When can we finish X items?"
- **Configurable workflows** – Map Jira statuses in your board to workflow stages

## 📋 Requirements

- **Node.js** 20+ (LTS)
- **pnpm** (recommended) or npm
- **Jira Server** or **Jira Cloud** access

## 🚀 Quick Start

### 1. Clone repo or download and unpack

```bash
unzip flow4jira.zip
cd flow4jira
```

### 2. Set up environment

```bash
# Create environment file
cp .env.example .env

# .Edit the environment and enter your Jira credentials.
```

**For Jira Server:**
```env
JIRA_INSTANCE_TYPE=server
JIRA_BASE_URL=https://jira.your-company.com
JIRA_PERSONAL_ACCESS_TOKEN=your-token-here
DATABASE_URL="file:./data/flow4jira.db"
```

**For Jira Cloud:**
```env
JIRA_INSTANCE_TYPE=cloud
JIRA_BASE_URL=https://your-domain.atlassian.net
JIRA_EMAIL=your-email@example.com
JIRA_API_TOKEN=your-api-token
DATABASE_URL="file:./data/flow4jira.db"
```

### 3. Install dependencies

```bash
pnpm install
```

### 4. Initialize database

```bash
# Generate Prisma Client and create database
npx prisma db push
```

## Run the Electron app 
- Fill with you configuration the config.json.example and rename it to config.json
- Copy the config.json next to your application (for Mac, copy it to the /Users/your-user-name/Library/Application Support/Flow4Jira folder.)
- Make sure the configuration only uses either the jiraApiToken (basic auth) or the jiraPersonalAccessToken (Bearer token)
- The configuration is local; Flow4Jira doesn't store it anywhere.
