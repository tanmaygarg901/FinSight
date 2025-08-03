import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { 
  TrendingUp, 
  AlertTriangle, 
  Target, 
  Calendar,
  DollarSign,
  Brain
} from 'lucide-react';

interface PredictiveAnalyticsProps {
  expenses: Array<{
    amount: number;
    date: string;
    category_id: string;
  }>;
  insights: Array<{
    category_name: string;
    total_spent: number;
    budget_amount: number;
    remaining_budget: number;
    transaction_count: number;
  }>;
}

interface Prediction {
  category: string;
  currentSpent: number;
  predictedTotal: number;
  budget: number;
  confidence: number;
  riskLevel: 'low' | 'medium' | 'high';
  daysRemaining: number;
}

const PredictiveAnalytics: React.FC<PredictiveAnalyticsProps> = ({ expenses, insights }) => {
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [monthlyProjection, setMonthlyProjection] = useState<any[]>([]);

  useEffect(() => {
    generatePredictions();
    generateMonthlyProjection();
  }, [expenses, insights]);

  const generatePredictions = () => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const daysPassed = now.getDate();
    const daysRemaining = daysInMonth - daysPassed;

    const newPredictions: Prediction[] = insights
      .filter(insight => insight.budget_amount > 0)
      .map(insight => {
        // Get historical spending pattern for this category
        const categoryExpenses = expenses.filter(expense => {
          // This is a simplified approach - in a real app, you'd match by category_id
          return true; // For now, we'll use aggregate data
        });

        // Simple linear regression based on current spending rate
        const spendingRate = insight.total_spent / daysPassed;
        const predictedTotal = spendingRate * daysInMonth;
        
        // Calculate confidence based on spending consistency
        const dailySpending = expenses.reduce((acc, expense) => {
          const date = expense.date;
          if (!acc[date]) acc[date] = 0;
          acc[date] += expense.amount;
          return acc;
        }, {} as Record<string, number>);

        const spendingValues = Object.values(dailySpending);
        const avgSpending = spendingValues.reduce((sum, val) => sum + val, 0) / spendingValues.length;
        const variance = spendingValues.reduce((sum, val) => sum + Math.pow(val - avgSpending, 2), 0) / spendingValues.length;
        const standardDeviation = Math.sqrt(variance);
        const coefficientOfVariation = avgSpending > 0 ? standardDeviation / avgSpending : 1;
        
        // Confidence decreases with higher variability
        const confidence = Math.max(0.3, 1 - coefficientOfVariation);

        // Determine risk level
        let riskLevel: 'low' | 'medium' | 'high' = 'low';
        const budgetUtilization = predictedTotal / insight.budget_amount;
        
        if (budgetUtilization > 1.2) riskLevel = 'high';
        else if (budgetUtilization > 0.9) riskLevel = 'medium';

        return {
          category: insight.category_name,
          currentSpent: insight.total_spent,
          predictedTotal,
          budget: insight.budget_amount,
          confidence,
          riskLevel,
          daysRemaining
        };
      });

    setPredictions(newPredictions);
  };

  const generateMonthlyProjection = () => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const daysPassed = now.getDate();

    // Calculate daily spending trend
    const dailySpending = expenses.reduce((acc, expense) => {
      const date = expense.date;
      if (!acc[date]) acc[date] = 0;
      acc[date] += expense.amount;
      return acc;
    }, {} as Record<string, number>);

    const sortedDays = Object.entries(dailySpending)
      .sort(([a], [b]) => new Date(a).getTime() - new Date(b).getTime());

    // Create projection data
    const projectionData = [];
    let cumulativeActual = 0;
    let cumulativePredicted = 0;

    // Calculate average daily spending
    const totalSpent = insights.reduce((sum, insight) => sum + insight.total_spent, 0);
    const avgDailySpending = totalSpent / daysPassed;

    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const actualSpending = dailySpending[dateStr] || 0;
      
      if (day <= daysPassed) {
        cumulativeActual += actualSpending;
        cumulativePredicted = cumulativeActual;
      } else {
        cumulativePredicted += avgDailySpending;
      }

      projectionData.push({
        day,
        actual: day <= daysPassed ? cumulativeActual : null,
        predicted: cumulativePredicted,
        isProjected: day > daysPassed
      });
    }

    setMonthlyProjection(projectionData);
  };

  const getRiskColor = (riskLevel: string) => {
    switch (riskLevel) {
      case 'high': return 'text-red-500 bg-red-50 dark:bg-red-900/20';
      case 'medium': return 'text-yellow-500 bg-yellow-50 dark:bg-yellow-900/20';
      case 'low': return 'text-green-500 bg-green-50 dark:bg-green-900/20';
      default: return 'text-gray-500 bg-gray-50 dark:bg-gray-900/20';
    }
  };

  const getRiskBadge = (riskLevel: string) => {
    const variants = {
      high: 'destructive',
      medium: 'secondary',
      low: 'outline'
    } as const;
    
    return <Badge variant={variants[riskLevel as keyof typeof variants]}>{riskLevel.toUpperCase()} RISK</Badge>;
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Brain className="h-5 w-5" />
            <span>Monthly Spending Projection</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={monthlyProjection}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
              <XAxis 
                dataKey="day" 
                stroke="#9ca3af"
                fontSize={12}
                tickFormatter={(value) => `Day ${value}`}
              />
              <YAxis 
                stroke="#9ca3af"
                fontSize={12}
                tickFormatter={(value) => `$${value}`}
              />
              <Tooltip 
                contentStyle={{
                  backgroundColor: '#1f2937',
                  border: '1px solid #374151',
                  borderRadius: '8px',
                  color: '#f9fafb'
                }}
                formatter={(value: number, name: string) => [
                  `$${value?.toFixed(2) || '0.00'}`, 
                  name === 'actual' ? 'Actual Spending' : 'Projected Spending'
                ]}
              />
              <Line
                type="monotone"
                dataKey="actual"
                stroke="#3b82f6"
                strokeWidth={3}
                dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
                connectNulls={false}
              />
              <Line
                type="monotone"
                dataKey="predicted"
                stroke="#10b981"
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={false}
              />
              <ReferenceLine 
                x={new Date().getDate()} 
                stroke="#ef4444" 
                strokeDasharray="2 2"
                label={{ value: "Today", position: "top" }}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Target className="h-5 w-5" />
            <span>Category Budget Predictions</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {predictions.map((prediction, index) => (
              <div key={index} className="p-4 border rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-semibold">{prediction.category}</h4>
                  {getRiskBadge(prediction.riskLevel)}
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-3">
                  <div className="text-center p-2 bg-gray-50 dark:bg-gray-800 rounded">
                    <p className="text-sm text-muted-foreground">Current Spent</p>
                    <p className="text-lg font-bold">${prediction.currentSpent.toFixed(2)}</p>
                  </div>
                  <div className="text-center p-2 bg-gray-50 dark:bg-gray-800 rounded">
                    <p className="text-sm text-muted-foreground">Predicted Total</p>
                    <p className="text-lg font-bold">${prediction.predictedTotal.toFixed(2)}</p>
                  </div>
                  <div className="text-center p-2 bg-gray-50 dark:bg-gray-800 rounded">
                    <p className="text-sm text-muted-foreground">Budget</p>
                    <p className="text-lg font-bold">${prediction.budget.toFixed(2)}</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Budget Utilization (Predicted)</span>
                    <span>{((prediction.predictedTotal / prediction.budget) * 100).toFixed(1)}%</span>
                  </div>
                  <Progress 
                    value={Math.min(100, (prediction.predictedTotal / prediction.budget) * 100)} 
                    className="h-2"
                  />
                  
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Confidence: {(prediction.confidence * 100).toFixed(0)}%</span>
                    <span>{prediction.daysRemaining} days remaining</span>
                  </div>
                </div>

                {prediction.predictedTotal > prediction.budget && (
                  <div className="mt-3 p-2 bg-red-50 dark:bg-red-900/20 rounded flex items-center space-x-2">
                    <AlertTriangle className="h-4 w-4 text-red-500" />
                    <span className="text-sm text-red-700 dark:text-red-300">
                      Projected to exceed budget by ${(prediction.predictedTotal - prediction.budget).toFixed(2)}
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PredictiveAnalytics;