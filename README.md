# FinSight

A sophisticated personal finance tracking application with advanced data analytics, machine learning insights, and predictive modeling capabilities.

##  Features

### Core Functionality
- **Expense Tracking**: Comprehensive expense management with categorization
- **Budget Management**: Set and monitor budgets across different categories
- **Multi-format Data Import**: CSV upload with automatic data processing
- **Real-time Analytics**: Live dashboard with spending insights

### Advanced Analytics & Data Engineering
- **Interactive Visualizations**: 
  - Time series spending trends with area charts
  - Category breakdown with pie charts and bar charts
  - Budget vs actual performance analysis
  - Daily spending patterns and projections

- **Predictive Analytics**:
  - Machine learning-based spending predictions
  - Budget overrun risk assessment
  - Monthly projection modeling with confidence intervals
  - Trend analysis and forecasting

- **AI-Powered Insights**:
  - Automated spending pattern detection
  - Personalized financial recommendations
  - Anomaly detection for unusual spending
  - Risk assessment and alerts

- **Data Processing Pipeline**:
  - ETL processes for data cleaning and transformation
  - Real-time data aggregation and metrics calculation
  - Advanced SQL functions for complex analytics
  - Data export capabilities (CSV format)

### Technical Highlights
- **Database Engineering**: PostgreSQL with advanced functions and RLS
- **Real-time Updates**: Supabase integration with live data sync
- **Responsive Design**: Mobile-first approach with Tailwind CSS
- **Type Safety**: Full TypeScript implementation
- **Modern UI**: shadcn/ui components with custom analytics dashboards

## 🛠 Technology Stack

### Frontend
- **React 18** with TypeScript
- **Vite** for fast development and building
- **Tailwind CSS** for styling
- **shadcn/ui** for component library
- **Recharts** for data visualizations
- **React Query** for state management

### Backend & Database
- **Supabase** (PostgreSQL) for database and authentication
- **Row Level Security (RLS)** for data protection
- **Custom SQL functions** for analytics calculations
- **Real-time subscriptions** for live updates

### Analytics & Data Processing
- **Custom analytics engine** with TypeScript
- **Statistical calculations** for trends and predictions
- **Data aggregation pipelines** using SQL
- **Export functionality** for data portability

## Analytics Features

### 1. Advanced Metrics Dashboard
- Daily spending averages and projections
- Budget utilization tracking
- Spending velocity analysis
- Category performance metrics

### 2. Predictive Analytics
- Linear regression for spending forecasts
- Confidence interval calculations
- Risk assessment algorithms
- Budget overrun predictions

### 3. Data Visualizations
- Interactive time series charts
- Category breakdown visualizations
- Budget vs actual comparisons
- Trend analysis with projections

### 4. AI-Powered Insights
- Pattern recognition algorithms
- Automated anomaly detection
- Personalized recommendations
- Smart alerts and notifications

## 🗄 Database Schema

### Core Tables
- `expenses`: Transaction records with categorization
- `expense_categories`: Predefined spending categories
- `budgets`: Monthly budget allocations
- `data_uploads`: File upload tracking and metadata

### Advanced Functions
- `calculate_spending_insights()`: Complex analytics aggregation
- Real-time data processing with triggers
- Automated timestamp management

## Getting Started

### Prerequisites
- Node.js 18+ and npm
- Supabase account (for database)

### Installation
```bash
# Clone the repository
git clone <repository-url>
cd finbloom

# Install dependencies
npm install

# Start development server
npm run dev
```

### Environment Setup
The application uses Supabase for backend services. Database credentials are pre-configured for the demo environment.
