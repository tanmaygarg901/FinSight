import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import SpendingTrendsChart from './SpendingTrendsChart';
import CategoryBreakdownChart from './CategoryBreakdownChart';
import AdvancedMetrics from './AdvancedMetrics';
import DataInsights from './DataInsights';
import PredictiveAnalytics from './PredictiveAnalytics';
import { 
  BarChart3, 
  PieChart, 
  TrendingUp, 
  Brain,
  Download,
  RefreshCw,
  Calendar,
  Zap
} from 'lucide-react';

interface AnalyticsDashboardProps {
  onClose: () => void;
}

const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({ onClose }) => {
  const [expenses, setExpenses] = useState<any[]>([]);
  const [insights, setInsights] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchAnalyticsData();
  }, []);

  const fetchAnalyticsData = async () => {
    try {
      setLoading(true);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch expenses
      const { data: expensesData, error: expensesError } = await supabase
        .from('expenses')
        .select(`
          *,
          expense_categories (
            name,
            color,
            icon
          )
        `)
        .eq('user_id', user.id)
        .order('date', { ascending: false });

      if (expensesError) throw expensesError;

      // Fetch categories
      const { data: categoriesData, error: categoriesError } = await supabase
        .from('expense_categories')
        .select('*')
        .order('name');

      if (categoriesError) throw categoriesError;

      // Fetch spending insights
      const { data: insightsData, error: insightsError } = await supabase
        .rpc('calculate_spending_insights', {
          user_uuid: user.id
        });

      if (insightsError) throw insightsError;

      setExpenses(expensesData || []);
      setCategories(categoriesData || []);
      setInsights(insightsData || []);

    } catch (error) {
      console.error('Error fetching analytics data:', error);
      toast({
        title: "Error",
        description: "Failed to load analytics data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const exportData = async () => {
    try {
      const csvData = expenses.map(expense => ({
        Date: expense.date,
        Amount: expense.amount,
        Description: expense.description,
        Category: expense.expense_categories?.name || 'Unknown',
        'Payment Method': expense.payment_method
      }));

      const csvContent = [
        Object.keys(csvData[0] || {}).join(','),
        ...csvData.map(row => Object.values(row).join(','))
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `expense-data-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);

      toast({
        title: "Export Successful",
        description: "Your expense data has been exported to CSV",
      });
    } catch (error) {
      toast({
        title: "Export Failed",
        description: "Failed to export data",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading analytics data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="shadow-2xl border border-slate-300 dark:border-slate-600 bg-slate-800 dark:bg-slate-900 backdrop-blur-xl rounded-2xl overflow-hidden">
        <CardHeader className="bg-slate-700 dark:bg-slate-800 border-b border-slate-600 dark:border-slate-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-3 bg-gradient-to-r from-purple-500 to-pink-600 rounded-xl shadow-lg">
                <BarChart3 className="h-6 w-6 text-white" />
              </div>
              <div>
                <CardTitle className="text-2xl font-bold text-white">Analytics Dashboard</CardTitle>
                <p className="text-slate-300 font-medium">
                  Comprehensive insights into your spending patterns
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={fetchAnalyticsData}
                className="border-slate-500 text-white hover:bg-slate-600 hover:border-slate-400"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={exportData}
                className="border-slate-500 text-white hover:bg-slate-600 hover:border-slate-400"
              >
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
            </div>
          </div>
        </CardHeader>
            
            <CardContent className="bg-slate-800 dark:bg-slate-900 p-6">
              <Tabs defaultValue="overview" className="w-full">
                <TabsList className="grid w-full grid-cols-5 bg-slate-700 dark:bg-slate-800 border border-slate-600">
                  <TabsTrigger 
                    value="overview" 
                    className="flex items-center gap-2 text-slate-300 data-[state=active]:bg-slate-600 data-[state=active]:text-white hover:text-white transition-colors"
                  >
                    <TrendingUp className="h-4 w-4" />
                    Overview
                  </TabsTrigger>
                  <TabsTrigger 
                    value="trends" 
                    className="flex items-center gap-2 text-slate-300 data-[state=active]:bg-slate-600 data-[state=active]:text-white hover:text-white transition-colors"
                  >
                    <BarChart3 className="h-4 w-4" />
                    Trends
                  </TabsTrigger>
                  <TabsTrigger 
                    value="breakdown" 
                    className="flex items-center gap-2 text-slate-300 data-[state=active]:bg-slate-600 data-[state=active]:text-white hover:text-white transition-colors"
                  >
                    <PieChart className="h-4 w-4" />
                    Breakdown
                  </TabsTrigger>
                  <TabsTrigger 
                    value="predictions" 
                    className="flex items-center gap-2 text-slate-300 data-[state=active]:bg-slate-600 data-[state=active]:text-white hover:text-white transition-colors"
                  >
                    <Zap className="h-4 w-4" />
                    Predictions
                  </TabsTrigger>
                  <TabsTrigger 
                    value="insights" 
                    className="flex items-center gap-2 text-slate-300 data-[state=active]:bg-slate-600 data-[state=active]:text-white hover:text-white transition-colors"
                  >
                    <Brain className="h-4 w-4" />
                    AI Insights
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="mt-6">
                  <AdvancedMetrics expenses={expenses} insights={insights} />
                </TabsContent>

                <TabsContent value="trends" className="mt-6">
                  <SpendingTrendsChart 
                    data={expenses.map(expense => ({
                      date: expense.date,
                      amount: expense.amount,
                      category: expense.expense_categories?.name || 'Unknown'
                    }))}
                  />
                </TabsContent>

                <TabsContent value="breakdown" className="mt-6">
                  <CategoryBreakdownChart 
                    data={insights}
                    categories={categories}
                  />
                </TabsContent>

                <TabsContent value="predictions" className="mt-6">
                  <PredictiveAnalytics 
                    expenses={expenses}
                    insights={insights}
                  />
                </TabsContent>
                <TabsContent value="insights" className="mt-6">
                  <DataInsights 
                    expenses={expenses}
                    insights={insights}
                    categories={categories}
                  />
                </TabsContent>
              </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default AnalyticsDashboard;