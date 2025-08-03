import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Calendar,
  Target,
  AlertTriangle,
  CheckCircle,
  Clock
} from 'lucide-react';

interface AdvancedMetricsProps {
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

const AdvancedMetrics: React.FC<AdvancedMetricsProps> = ({ expenses, insights }) => {
  // Calculate advanced metrics
  const calculateMetrics = () => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    
    // Daily average this month
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const daysPassed = now.getDate();
    const totalSpent = insights.reduce((sum, insight) => sum + insight.total_spent, 0);
    const dailyAverage = totalSpent / daysPassed;
    const projectedMonthlySpend = dailyAverage * daysInMonth;
    
    // Budget utilization
    const totalBudget = insights.reduce((sum, insight) => sum + insight.budget_amount, 0);
    const budgetUtilization = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;
    
    // Spending velocity (trend)
    const last7Days = expenses.filter(expense => {
      const expenseDate = new Date(expense.date);
      const daysDiff = (now.getTime() - expenseDate.getTime()) / (1000 * 3600 * 24);
      return daysDiff <= 7;
    });
    
    const previous7Days = expenses.filter(expense => {
      const expenseDate = new Date(expense.date);
      const daysDiff = (now.getTime() - expenseDate.getTime()) / (1000 * 3600 * 24);
      return daysDiff > 7 && daysDiff <= 14;
    });
    
    const recentSpending = last7Days.reduce((sum, expense) => sum + expense.amount, 0);
    const previousSpending = previous7Days.reduce((sum, expense) => sum + expense.amount, 0);
    const spendingVelocity = previousSpending > 0 ? ((recentSpending - previousSpending) / previousSpending) * 100 : 0;
    
    // Categories over budget
    const categoriesOverBudget = insights.filter(insight => 
      insight.budget_amount > 0 && insight.total_spent > insight.budget_amount
    ).length;
    
    // Largest expense category
    const largestCategory = insights.reduce((max, insight) => 
      insight.total_spent > max.total_spent ? insight : max, 
      insights[0] || { category_name: 'None', total_spent: 0 }
    );
    
    // Days until month end
    const daysRemaining = daysInMonth - daysPassed;
    const remainingBudget = totalBudget - totalSpent;
    const dailyBudgetRemaining = daysRemaining > 0 ? remainingBudget / daysRemaining : 0;
    
    return {
      dailyAverage,
      projectedMonthlySpend,
      budgetUtilization,
      spendingVelocity,
      categoriesOverBudget,
      largestCategory,
      daysRemaining,
      dailyBudgetRemaining,
      totalBudget,
      totalSpent
    };
  };

  const metrics = calculateMetrics();

  const MetricCard = ({ 
    title, 
    value, 
    subtitle, 
    icon: Icon, 
    trend, 
    color = "default" 
  }: {
    title: string;
    value: string;
    subtitle: string;
    icon: React.ComponentType<any>;
    trend?: "up" | "down" | "neutral";
    color?: "default" | "success" | "warning" | "danger";
  }) => {
    const colorClasses = {
      default: "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400",
      success: "bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400",
      warning: "bg-yellow-50 dark:bg-yellow-900/20 text-yellow-600 dark:text-yellow-400",
      danger: "bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400"
    };

    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">{title}</p>
              <div className="flex items-center space-x-2">
                <p className="text-2xl font-bold">{value}</p>
                {trend && (
                  <div className={`flex items-center ${
                    trend === "up" ? "text-red-500" : 
                    trend === "down" ? "text-green-500" : 
                    "text-gray-500"
                  }`}>
                    {trend === "up" ? (
                      <TrendingUp className="h-4 w-4" />
                    ) : trend === "down" ? (
                      <TrendingDown className="h-4 w-4" />
                    ) : null}
                  </div>
                )}
              </div>
              <p className="text-sm text-muted-foreground">{subtitle}</p>
            </div>
            <div className={`p-3 rounded-full ${colorClasses[color]}`}>
              <Icon className="h-6 w-6" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Daily Average"
          value={`$${metrics.dailyAverage.toFixed(2)}`}
          subtitle="This month's spending rate"
          icon={Calendar}
          color="default"
        />
        
        <MetricCard
          title="Projected Monthly"
          value={`$${metrics.projectedMonthlySpend.toFixed(2)}`}
          subtitle={`${metrics.daysRemaining} days remaining`}
          icon={TrendingUp}
          trend={metrics.projectedMonthlySpend > metrics.totalBudget ? "up" : "down"}
          color={metrics.projectedMonthlySpend > metrics.totalBudget ? "warning" : "success"}
        />
        
        <MetricCard
          title="Budget Utilization"
          value={`${metrics.budgetUtilization.toFixed(1)}%`}
          subtitle={`$${(metrics.totalBudget - metrics.totalSpent).toFixed(2)} remaining`}
          icon={Target}
          color={metrics.budgetUtilization > 100 ? "danger" : metrics.budgetUtilization > 80 ? "warning" : "success"}
        />
        
        <MetricCard
          title="Spending Velocity"
          value={`${Math.abs(metrics.spendingVelocity).toFixed(1)}%`}
          subtitle="vs. previous week"
          icon={DollarSign}
          trend={metrics.spendingVelocity > 0 ? "up" : metrics.spendingVelocity < 0 ? "down" : "neutral"}
          color={metrics.spendingVelocity > 10 ? "warning" : "default"}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5" />
              <span>Budget Alerts</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {metrics.categoriesOverBudget > 0 ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <AlertTriangle className="h-4 w-4 text-red-500" />
                    <span className="text-sm font-medium">Categories Over Budget</span>
                  </div>
                  <Badge variant="destructive">{metrics.categoriesOverBudget}</Badge>
                </div>
                
                {insights
                  .filter(insight => insight.budget_amount > 0 && insight.total_spent > insight.budget_amount)
                  .map((insight, index) => (
                    <div key={index} className="flex items-center justify-between p-2 border rounded">
                      <span className="text-sm">{insight.category_name}</span>
                      <span className="text-sm text-red-500 font-medium">
                        ${(insight.total_spent - insight.budget_amount).toFixed(2)} over
                      </span>
                    </div>
                  ))
                }
              </div>
            ) : (
              <div className="flex items-center space-x-2 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span className="text-sm text-green-700 dark:text-green-300">All categories within budget</span>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Clock className="h-5 w-5" />
              <span>Spending Insights</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Largest Category: {metrics.largestCategory.category_name}</span>
                  <span>${metrics.largestCategory.total_spent.toFixed(2)}</span>
                </div>
                <Progress 
                  value={metrics.totalSpent > 0 ? (metrics.largestCategory.total_spent / metrics.totalSpent) * 100 : 0} 
                  className="h-2"
                />
              </div>
              
              <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Daily Budget Remaining</span>
                  <span className="text-sm font-bold text-blue-600 dark:text-blue-400">
                    ${Math.max(0, metrics.dailyBudgetRemaining).toFixed(2)}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  For the next {metrics.daysRemaining} days
                </p>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div className="text-center p-2 bg-gray-50 dark:bg-gray-800 rounded">
                  <p className="text-lg font-bold">{insights.reduce((sum, i) => sum + i.transaction_count, 0)}</p>
                  <p className="text-xs text-muted-foreground">Total Transactions</p>
                </div>
                <div className="text-center p-2 bg-gray-50 dark:bg-gray-800 rounded">
                  <p className="text-lg font-bold">
                    ${insights.length > 0 ? (metrics.totalSpent / insights.reduce((sum, i) => sum + i.transaction_count, 0)).toFixed(2) : '0.00'}
                  </p>
                  <p className="text-xs text-muted-foreground">Avg Transaction</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdvancedMetrics;