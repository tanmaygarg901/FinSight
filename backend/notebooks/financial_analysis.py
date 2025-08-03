"""
Financial Data Science Analysis Notebook
Advanced analytics and machine learning for financial insights
Demonstrates data science techniques with Python, pandas, and scikit-learn
"""

import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns
from sklearn.cluster import KMeans
from sklearn.preprocessing import StandardScaler
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, confusion_matrix
import plotly.express as px
import plotly.graph_objects as go
from sqlalchemy import create_engine
import warnings
warnings.filterwarnings('ignore')

class FinancialDataScience:
    """
    Advanced financial data science analysis class
    Demonstrates machine learning and statistical analysis techniques
    """
    
    def __init__(self, database_url: str):
        self.engine = create_engine(database_url)
        self.scaler = StandardScaler()
        
    def load_transaction_data(self, user_id: int = None) -> pd.DataFrame:
        """
        Load and prepare transaction data for analysis
        Demonstrates SQL integration with pandas
        """
        query = """
        SELECT 
            t.id,
            t.user_id,
            t.amount,
            ABS(t.amount) as amount_abs,
            t.description,
            t.transaction_date,
            t.merchant,
            t.payment_method,
            t.is_recurring,
            c.name as category,
            c.category_type,
            EXTRACT(HOUR FROM t.transaction_date) as hour_of_day,
            EXTRACT(DOW FROM t.transaction_date) as day_of_week,
            EXTRACT(MONTH FROM t.transaction_date) as month,
            EXTRACT(YEAR FROM t.transaction_date) as year
        FROM transactions t
        JOIN categories c ON t.category_id = c.id
        """
        
        if user_id:
            query += f" WHERE t.user_id = {user_id}"
            
        df = pd.read_sql(query, self.engine)
        
        # Feature engineering
        df['is_weekend'] = df['day_of_week'].isin([0, 6])  # Sunday=0, Saturday=6
        df['transaction_month_year'] = pd.to_datetime(df[['year', 'month']].assign(day=1))
        df['days_since_first_transaction'] = (df['transaction_date'] - df['transaction_date'].min()).dt.days
        
        return df
    
    def spending_pattern_clustering(self, df: pd.DataFrame) -> pd.DataFrame:
        """
        K-means clustering analysis for spending patterns
        Demonstrates unsupervised machine learning techniques
        """
        print("🔍 Performing spending pattern clustering analysis...")
        
        # Prepare features for clustering
        monthly_features = df.groupby(['user_id', 'transaction_month_year', 'category']).agg({
            'amount_abs': ['sum', 'mean', 'count'],
            'is_weekend': 'mean',
            'hour_of_day': 'mean'
        }).reset_index()
        
        # Flatten column names
        monthly_features.columns = ['_'.join(col).strip() if col[1] else col[0] 
                                  for col in monthly_features.columns.values]
        
        # Pivot to get category spending as features
        pivot_features = monthly_features.pivot_table(
            index=['user_id_', 'transaction_month_year_'],
            columns='category_',
            values='amount_abs_sum',
            fill_value=0
        ).reset_index()
        
        # Select numeric columns for clustering
        feature_cols = [col for col in pivot_features.columns if col not in ['user_id_', 'transaction_month_year_']]
        X = pivot_features[feature_cols]
        
        # Standardize features
        X_scaled = self.scaler.fit_transform(X)
        
        # Perform K-means clustering
        kmeans = KMeans(n_clusters=4, random_state=42, n_init=10)
        clusters = kmeans.fit_predict(X_scaled)
        
        # Add cluster labels to dataframe
        pivot_features['spending_cluster'] = clusters
        
        # Analyze cluster characteristics
        cluster_analysis = []
        for cluster in range(4):
            cluster_data = X[clusters == cluster]
            cluster_profile = {
                'cluster': cluster,
                'size': len(cluster_data),
                'avg_total_spending': cluster_data.sum(axis=1).mean(),
                'top_categories': cluster_data.mean().nlargest(3).to_dict(),
                'spending_variance': cluster_data.sum(axis=1).std()
            }
            cluster_analysis.append(cluster_profile)
        
        print(f"✅ Identified {len(cluster_analysis)} distinct spending patterns")
        return pivot_features, cluster_analysis
    
    def expense_category_prediction(self, df: pd.DataFrame) -> dict:
        """
        Machine learning model to predict expense categories
        Demonstrates supervised learning with text features
        """
        print("🤖 Training expense category prediction model...")
        
        # Prepare features for classification
        expense_data = df[df['category_type'] == 'expense'].copy()
        
        # Text feature engineering
        expense_data['description_length'] = expense_data['description'].str.len()
        expense_data['has_numbers'] = expense_data['description'].str.contains(r'\d+').astype(int)
        expense_data['word_count'] = expense_data['description'].str.split().str.len()
        
        # Create dummy variables for categorical features
        feature_columns = ['amount_abs', 'hour_of_day', 'day_of_week', 'month', 
                          'is_weekend', 'description_length', 'has_numbers', 'word_count']
        
        # Add payment method dummies
        payment_dummies = pd.get_dummies(expense_data['payment_method'], prefix='payment')
        feature_df = pd.concat([expense_data[feature_columns], payment_dummies], axis=1)
        
        # Prepare target variable
        y = expense_data['category']
        X = feature_df.fillna(0)
        
        # Split data
        X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
        
        # Train Random Forest model
        rf_model = RandomForestClassifier(n_estimators=100, random_state=42)
        rf_model.fit(X_train, y_train)
        
        # Make predictions
        y_pred = rf_model.predict(X_test)
        
        # Model evaluation
        accuracy = rf_model.score(X_test, y_test)
        feature_importance = pd.DataFrame({
            'feature': X.columns,
            'importance': rf_model.feature_importances_
        }).sort_values('importance', ascending=False)
        
        print(f"✅ Model trained with {accuracy:.2%} accuracy")
        
        return {
            'model': rf_model,
            'accuracy': accuracy,
            'feature_importance': feature_importance.to_dict('records'),
            'classification_report': classification_report(y_test, y_pred, output_dict=True)
        }
    
    def financial_health_scoring(self, df: pd.DataFrame) -> pd.DataFrame:
        """
        Advanced financial health scoring algorithm
        Demonstrates complex business logic and statistical analysis
        """
        print("📊 Calculating comprehensive financial health scores...")
        
        # Calculate monthly financial metrics by user
        monthly_metrics = df.groupby(['user_id', 'transaction_month_year']).agg({
            'amount': lambda x: x[df.loc[x.index, 'category_type'] == 'income'].sum(),
            'amount_abs': [
                lambda x: x[df.loc[x.index, 'category_type'] == 'expense'].sum(),
                lambda x: x[df.loc[x.index, 'category_type'] == 'savings'].sum()
            ]
        }).reset_index()
        
        # Flatten column names
        monthly_metrics.columns = ['user_id', 'month', 'total_income', 'total_expenses', 'total_savings']
        
        # Calculate financial health metrics
        monthly_metrics['savings_rate'] = (monthly_metrics['total_savings'] / 
                                         monthly_metrics['total_income'].replace(0, np.nan)) * 100
        monthly_metrics['expense_ratio'] = (monthly_metrics['total_expenses'] / 
                                          monthly_metrics['total_income'].replace(0, np.nan)) * 100
        monthly_metrics['net_cash_flow'] = (monthly_metrics['total_income'] - 
                                          monthly_metrics['total_expenses'] - 
                                          monthly_metrics['total_savings'])
        
        # Calculate rolling averages for trend analysis
        monthly_metrics['savings_rate_3m'] = monthly_metrics.groupby('user_id')['savings_rate'].rolling(3).mean().reset_index(0, drop=True)
        monthly_metrics['expense_ratio_3m'] = monthly_metrics.groupby('user_id')['expense_ratio'].rolling(3).mean().reset_index(0, drop=True)
        
        # Financial health scoring algorithm
        def calculate_health_score(row):
            score = 0
            
            # Savings rate component (40% of score)
            if row['savings_rate'] >= 20:
                score += 40
            elif row['savings_rate'] >= 15:
                score += 30
            elif row['savings_rate'] >= 10:
                score += 20
            elif row['savings_rate'] >= 5:
                score += 10
            
            # Expense ratio component (30% of score)
            if row['expense_ratio'] <= 70:
                score += 30
            elif row['expense_ratio'] <= 80:
                score += 25
            elif row['expense_ratio'] <= 90:
                score += 15
            elif row['expense_ratio'] <= 100:
                score += 5
            
            # Cash flow component (20% of score)
            if row['net_cash_flow'] > 0:
                score += 20
            elif row['net_cash_flow'] >= -100:
                score += 10
            
            # Trend component (10% of score)
            if not pd.isna(row['savings_rate_3m']) and row['savings_rate'] > row['savings_rate_3m']:
                score += 5
            if not pd.isna(row['expense_ratio_3m']) and row['expense_ratio'] < row['expense_ratio_3m']:
                score += 5
            
            return min(100, max(0, score))
        
        monthly_metrics['health_score'] = monthly_metrics.apply(calculate_health_score, axis=1)
        
        # Assign health grades
        def assign_grade(score):
            if score >= 85:
                return 'Excellent'
            elif score >= 70:
                return 'Good'
            elif score >= 55:
                return 'Fair'
            else:
                return 'Needs Improvement'
        
        monthly_metrics['health_grade'] = monthly_metrics['health_score'].apply(assign_grade)
        
        print("✅ Financial health scores calculated successfully")
        return monthly_metrics
    
    def anomaly_detection(self, df: pd.DataFrame) -> pd.DataFrame:
        """
        Statistical anomaly detection for unusual transactions
        Demonstrates outlier detection techniques
        """
        print("🚨 Performing anomaly detection analysis...")
        
        # Calculate statistical thresholds by category and user
        anomaly_results = []
        
        for (user_id, category), group in df.groupby(['user_id', 'category']):
            if len(group) < 10:  # Skip categories with too few transactions
                continue
                
            amounts = group['amount_abs']
            
            # Statistical methods for anomaly detection
            Q1 = amounts.quantile(0.25)
            Q3 = amounts.quantile(0.75)
            IQR = Q3 - Q1
            
            # IQR method
            lower_bound = Q1 - 1.5 * IQR
            upper_bound = Q3 + 1.5 * IQR
            
            # Z-score method
            mean_amount = amounts.mean()
            std_amount = amounts.std()
            z_threshold = 2.5
            
            for idx, row in group.iterrows():
                amount = row['amount_abs']
                z_score = abs((amount - mean_amount) / std_amount) if std_amount > 0 else 0
                
                anomaly_flags = {
                    'transaction_id': row['id'],
                    'user_id': user_id,
                    'category': category,
                    'amount': amount,
                    'transaction_date': row['transaction_date'],
                    'description': row['description'],
                    'is_iqr_anomaly': amount < lower_bound or amount > upper_bound,
                    'is_zscore_anomaly': z_score > z_threshold,
                    'z_score': z_score,
                    'category_mean': mean_amount,
                    'category_std': std_amount
                }
                
                anomaly_results.append(anomaly_flags)
        
        anomaly_df = pd.DataFrame(anomaly_results)
        anomaly_df['is_anomaly'] = anomaly_df['is_iqr_anomaly'] | anomaly_df['is_zscore_anomaly']
        
        print(f"✅ Detected {anomaly_df['is_anomaly'].sum()} anomalous transactions")
        return anomaly_df
    
    def generate_insights_report(self, user_id: int) -> dict:
        """
        Generate comprehensive financial insights report
        Demonstrates end-to-end data science workflow
        """
        print(f"📈 Generating comprehensive financial insights for user {user_id}...")
        
        # Load data
        df = self.load_transaction_data(user_id)
        
        if df.empty:
            return {"error": "No transaction data found for user"}
        
        # Perform all analyses
        clustering_results, cluster_analysis = self.spending_pattern_clustering(df)
        ml_results = self.expense_category_prediction(df)
        health_scores = self.financial_health_scoring(df)
        anomalies = self.anomaly_detection(df)
        
        # Compile comprehensive report
        report = {
            "user_id": user_id,
            "analysis_date": pd.Timestamp.now().isoformat(),
            "data_summary": {
                "total_transactions": len(df),
                "date_range": {
                    "start": df['transaction_date'].min().isoformat(),
                    "end": df['transaction_date'].max().isoformat()
                },
                "total_amount": float(df['amount_abs'].sum()),
                "unique_categories": df['category'].nunique(),
                "unique_merchants": df['merchant'].nunique()
            },
            "spending_patterns": {
                "cluster_analysis": cluster_analysis,
                "dominant_cluster": int(clustering_results['spending_cluster'].mode().iloc[0])
            },
            "ml_insights": {
                "category_prediction_accuracy": ml_results['accuracy'],
                "top_predictive_features": ml_results['feature_importance'][:5]
            },
            "financial_health": {
                "current_score": float(health_scores['health_score'].iloc[-1]),
                "current_grade": health_scores['health_grade'].iloc[-1],
                "trend": "improving" if health_scores['health_score'].iloc[-1] > health_scores['health_score'].iloc[0] else "declining",
                "avg_savings_rate": float(health_scores['savings_rate'].mean()),
                "avg_expense_ratio": float(health_scores['expense_ratio'].mean())
            },
            "anomaly_detection": {
                "total_anomalies": int(anomalies['is_anomaly'].sum()),
                "anomaly_rate": float(anomalies['is_anomaly'].mean() * 100),
                "recent_anomalies": anomalies[anomalies['is_anomaly']].nlargest(5, 'transaction_date')[
                    ['transaction_date', 'category', 'amount', 'description']
                ].to_dict('records')
            }
        }
        
        print("✅ Comprehensive financial insights report generated successfully")
        return report

# Example usage and demonstration
if __name__ == "__main__":
    # Initialize the data science class
    DATABASE_URL = "postgresql://user:password@localhost/finsight"
    financial_ds = FinancialDataScience(DATABASE_URL)
    
    print("🚀 FinSight Financial Data Science Analysis")
    print("=" * 50)
    
    # Example analysis for user ID 1
    try:
        insights = financial_ds.generate_insights_report(user_id=1)
        print("\n📊 Analysis Complete!")
        print(f"Total Transactions Analyzed: {insights['data_summary']['total_transactions']}")
        print(f"Financial Health Score: {insights['financial_health']['current_score']:.1f}")
        print(f"Financial Health Grade: {insights['financial_health']['current_grade']}")
        print(f"Anomalies Detected: {insights['anomaly_detection']['total_anomalies']}")
        
    except Exception as e:
        print(f"❌ Analysis failed: {str(e)}")
        print("Note: Ensure database is running and contains sample data")
