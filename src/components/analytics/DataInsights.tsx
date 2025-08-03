import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Brain, 
  Lightbulb, 
  TrendingUp, 
  AlertCircle, 
  Target,
  Calendar,
  DollarSign,
  PieChart
} from 'lucide-react';

interface DataInsightsProps {
  expenses: Array<{
    amount: number;
    date: string;
    category_id: string;
    description: string;
  }>;
  insights: Array<{
    category_name: string;
    total_spent: number;
    budget_amount: number;
    remaining_budget: number;
    transaction_count: number;
  }>;
  categories: Array<{
    id: string;
    name: string;
    color: string;
  }>;
}

interface Insight {
  type: 'warning' | 'suggestion' | 'achievement' | 'trend';
  title: string;
  description: string;
  action?: string;
  priority: 'high' | 'medium' | 'low';
  category?: string;
  value?: number;
}

const DataInsights: React.FC<DataInsightsProps> = ({ expenses, insights, categories }) => {
  const [generatedInsights, setGeneratedInsights] = useState<Insight[]>([]);

  useEffect(() => {
    generateInsights();
  }, [expenses, insights]);

  const generateInsights = () => {
    const newInsights: Insight[] = [];
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    // 1. Budget Analysis
    insights.forEach(insight => {
      if (insight.budget_amount > 0) {
        const utilizationRate = (insight.total_spent / insight.budget_amount) * 100;
        
        if (utilizationRate > 100) {
          newInsights.push({
            type: 'warning',
            title: `Over Budget: ${insight.category_name}`,
            description: `You've exceeded your ${insight.category_name} budget by $${(insight.total_spent - insight.budget_amount).toFixed(2)} (${(utilizationRate - 100).toFixed(1)}% over)`,
            action: 'Consider reducing spending in this category',
            priority: 'high',
            category: insight.category_name,
            value: insight.total_spent - insight.budget_amount
          });
        } else if (utilizationRate > 80) {
          newInsights.push({
            type: 'warning',
            title: `Approaching Budget Limit: ${insight.category_name}`,
            description: `You've used ${utilizationRate.toFixed(1)}% of your ${insight.category_name} budget with ${new Date(currentYear, currentMonth + 1, 0).getDate() - now.getDate()} days remaining`,
            action: 'Monitor spending closely',
            priority: 'medium',
            category: insight.category_name
          });
        }
      }
    });

    // 2. Spending Patterns
    const dailySpending = expenses.reduce((acc, expense) => {
      const date = expense.date;
      if (!acc[date]) acc[date] = 0;
      acc[date] += expense.amount;
      return acc;
    }, {} as Record<string, number>);

    const spendingDays = Object.keys(dailySpending).length;
    const totalSpent = Object.values(dailySpending).reduce((sum, amount) => sum + amount, 0);
    const avgDailySpending = totalSpent / spendingDays;

    // Find highest spending days
    const highSpendingDays = Object.entries(dailySpending)
      .filter(([_, amount]) => amount > avgDailySpending * 2)
      .sort(([_, a], [__, b]) => b - a);

    if (highSpendingDays.length > 0) {
      const [date, amount] = highSpendingDays[0];
      newInsights.push({
        type: 'trend',
        title: 'High Spending Day Detected',
        description: `Your highest spending day was ${new Date(date).toLocaleDateString()} with $${amount.toFixed(2)} spent (${((amount / avgDailySpending - 1) * 100).toFixed(0)}% above average)`,
        action: 'Review what caused this spike',
        priority: 'medium',
        value: amount
      });
    }

    // 3. Category Insights
    const sortedCategories = insights
      .filter(i => i.total_spent > 0)
      .sort((a, b) => b.total_spent - a.total_spent);

    if (sortedCategories.length > 0) {
      const topCategory = sortedCategories[0];
      const totalSpent = sortedCategories.reduce((sum, cat) => sum + cat.total_spent, 0);
      const percentage = (topCategory.total_spent / totalSpent) * 100;

      if (percentage > 40) {
        newInsights.push({
          type: 'warning',
          title: 'Spending Concentration Risk',
          description: `${percentage.toFixed(1)}% of your spending is in ${topCategory.category_name}. Consider diversifying your expenses.`,
          action: 'Review if this allocation aligns with your priorities',
          priority: 'medium',
          category: topCategory.category_name
        });
      }
    }

    // 4. Frequency Analysis
    insights.forEach(insight => {
      if (insight.transaction_count > 0) {
        const avgTransactionSize = insight.total_spent / insight.transaction_count;
        
        if (insight.transaction_count > 20 && avgTransactionSize < 10) {
          newInsights.push({
            type: 'suggestion',
            title: `Frequent Small Purchases: ${insight.category_name}`,
            description: `You made ${insight.transaction_count} transactions averaging $${avgTransactionSize.toFixed(2)} each. These small purchases add up to $${insight.total_spent.toFixed(2)}.`,
            action: 'Consider bundling purchases or setting spending limits',
            priority: 'low',
            category: insight.category_name
          });
        }
      }
    });

    // 5. Positive Insights
    const categoriesUnderBudget = insights.filter(i => 
      i.budget_amount > 0 && i.total_spent < i.budget_amount * 0.8
    );

    if (categoriesUnderBudget.length > 0) {
      const bestCategory = categoriesUnderBudget.reduce((best, current) => 
        (current.budget_amount - current.total_spent) > (best.budget_amount - best.total_spent) ? current : best
      );

      newInsights.push({
        type: 'achievement',
        title: `Great Budget Management: ${bestCategory.category_name}`,
        description: `You're $${(bestCategory.budget_amount - bestCategory.total_spent).toFixed(2)} under budget in ${bestCategory.category_name}!`,
        action: 'Keep up the good work',
        priority: 'low',
        category: bestCategory.category_name
      });
    }

    // 6. Trend Analysis
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

    if (previousSpending > 0) {
      const changePercent = ((recentSpending - previousSpending) / previousSpending) * 100;
      
      if (Math.abs(changePercent) > 20) {
        newInsights.push({
          type: changePercent > 0 ? 'warning' : 'achievement',
          title: `Spending Trend: ${changePercent > 0 ? 'Increasing' : 'Decreasing'}`,
          description: `Your spending ${changePercent > 0 ? 'increased' : 'decreased'} by ${Math.abs(changePercent).toFixed(1)}% compared to the previous week`,
          action: changePercent > 0 ? 'Consider what caused this increase' : 'Great job reducing spending!',
          priority: Math.abs(changePercent) > 50 ? 'high' : 'medium'
        });
      }
    }

    // Sort by priority
    const priorityOrder = { high: 3, medium: 2, low: 1 };
    newInsights.sort((a, b) => priorityOrder[b.priority] - priorityOrder[a.priority]);

    setGeneratedInsights(newInsights);
  };

  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'warning': return AlertCircle;
      case 'suggestion': return Lightbulb;
      case 'achievement': return Target;
      case 'trend': return TrendingUp;
      default: return Brain;
    }
  };

  const getInsightColor = (type: string) => {
    switch (type) {
      case 'warning': return 'text-red-500 bg-red-50 dark:bg-red-900/20';
      case 'suggestion': return 'text-blue-500 bg-blue-50 dark:bg-blue-900/20';
      case 'achievement': return 'text-green-500 bg-green-50 dark:bg-green-900/20';
      case 'trend': return 'text-purple-500 bg-purple-50 dark:bg-purple-900/20';
      default: return 'text-gray-500 bg-gray-50 dark:bg-gray-900/20';
    }
  };

  const getPriorityBadge = (priority: string) => {
    const variants = {
      high: 'destructive',
      medium: 'secondary',
      low: 'outline'
    } as const;
    
    return <Badge variant={variants[priority as keyof typeof variants]}>{priority.toUpperCase()}</Badge>;
  };

  const groupedInsights = generatedInsights.reduce((acc, insight) => {
    if (!acc[insight.type]) acc[insight.type] = [];
    acc[insight.type].push(insight);
    return acc;
  }, {} as Record<string, Insight[]>);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Brain className="h-5 w-5" />
          <span>AI-Powered Insights</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="all" className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="warning">Warnings</TabsTrigger>
            <TabsTrigger value="suggestion">Tips</TabsTrigger>
            <TabsTrigger value="achievement">Wins</TabsTrigger>
            <TabsTrigger value="trend">Trends</TabsTrigger>
          </TabsList>
          
          <TabsContent value="all" className="mt-6">
            <div className="space-y-4">
              {generatedInsights.length > 0 ? (
                generatedInsights.map((insight, index) => {
                  const Icon = getInsightIcon(insight.type);
                  return (
                    <div key={index} className="p-4 border rounded-lg hover:shadow-md transition-shadow">
                      <div className="flex items-start space-x-3">
                        <div className={`p-2 rounded-full ${getInsightColor(insight.type)}`}>
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center justify-between">
                            <h4 className="font-semibold">{insight.title}</h4>
                            {getPriorityBadge(insight.priority)}
                          </div>
                          <p className="text-sm text-muted-foreground">{insight.description}</p>
                          {insight.action && (
                            <p className="text-sm font-medium text-blue-600 dark:text-blue-400">
                              💡 {insight.action}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-8">
                  <Brain className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">No insights available yet. Add more expenses to get personalized recommendations!</p>
                </div>
              )}
            </div>
          </TabsContent>
          
          {Object.entries(groupedInsights).map(([type, insights]) => (
            <TabsContent key={type} value={type} className="mt-6">
              <div className="space-y-4">
                {insights.map((insight, index) => {
                  const Icon = getInsightIcon(insight.type);
                  return (
                    <div key={index} className="p-4 border rounded-lg">
                      <div className="flex items-start space-x-3">
                        <div className={`p-2 rounded-full ${getInsightColor(insight.type)}`}>
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center justify-between">
                            <h4 className="font-semibold">{insight.title}</h4>
                            {getPriorityBadge(insight.priority)}
                          </div>
                          <p className="text-sm text-muted-foreground">{insight.description}</p>
                          {insight.action && (
                            <p className="text-sm font-medium text-blue-600 dark:text-blue-400">
                              💡 {insight.action}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default DataInsights;