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

### 2. Install dependencies

```bash
pnpm install
```

### 3. Run locally

```bash
pnpm dev
```

## License

Flow4Jira is licensed under the [Apache License 2.0](LICENSE).


