import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  UtensilsCrossed,
  Car,
  GraduationCap,
  Gamepad2,
  ShoppingBag,
  Heart,
  Receipt,
  PiggyBank,
  Upload,
  BarChart3,
  ArrowUpRight,
  ArrowDownRight,
  PieChart,
  Target,
  Calendar,
  Plus,
  Trash2,
  Brain,
  Settings,
  FileText,
  Sparkles,
  Zap
} from 'lucide-react';
import FileUpload from './FileUpload';
import AnalyticsDashboard from './analytics/AnalyticsDashboard';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

// Types
interface MetricCardProps {
  title: string;
  value: string;
  change: string;
  trend: "up" | "down" | "neutral";
  icon: React.ReactNode;
  budget?: string;
  remaining?: string;
}

interface ExpenseCategory {
  id: string;
  name: string;
  color: string;
  icon: string;
}

interface SpendingInsight {
  category_name: string;
  total_spent: number;
  budget_amount: number;
  remaining_budget: number;
  transaction_count: number;
}

// MetricCard Component
const MetricCard: React.FC<MetricCardProps> = ({ title, value, change, trend, icon, budget, remaining }) => {
  return (
    <Card className="group hover:shadow-2xl transition-all duration-300 bg-white/90 dark:bg-slate-800/90 backdrop-blur-xl border border-slate-200/50 dark:border-slate-700/50 shadow-xl hover:scale-105 rounded-2xl overflow-hidden">
      <CardContent className="p-6 relative">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 to-purple-50/50 dark:from-slate-800/50 dark:to-slate-900/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        <div className="relative z-10">
          <div className="flex items-start justify-between mb-4">
            <div className="space-y-1">
              <p className="text-sm font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wide">{title}</p>
              <p className="text-3xl font-bold text-slate-900 dark:text-white">{value}</p>
            </div>
            <div className="p-3 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl shadow-lg">
              {React.cloneElement(icon as React.ReactElement, { className: "h-6 w-6 text-white" })}
            </div>
          </div>
          
          {budget && (
            <div className="mb-4 p-3 bg-slate-50 dark:bg-slate-700/50 rounded-xl">
              <div className="flex justify-between text-xs font-medium text-slate-600 dark:text-slate-300 mb-2">
                <span>Budget: {budget}</span>
                <span>Remaining: {remaining}</span>
              </div>
              <Progress 
                value={budget && remaining ? ((parseFloat(budget.replace('$', '')) - parseFloat(remaining.replace('$', ''))) / parseFloat(budget.replace('$', ''))) * 100 : 0} 
                className="h-3 bg-slate-200 dark:bg-slate-600"
              />
            </div>
          )}
          
          <div className="flex items-center space-x-2">
            <div className={`p-1 rounded-full ${
              trend === "up" ? "bg-red-100 dark:bg-red-900/30" : 
              trend === "down" ? "bg-green-100 dark:bg-green-900/30" : 
              "bg-slate-100 dark:bg-slate-700"
            }`}>
              {trend === "up" ? (
                <ArrowUpRight className="h-4 w-4 text-red-600 dark:text-red-400" />
              ) : trend === "down" ? (
                <ArrowDownRight className="h-4 w-4 text-green-600 dark:text-green-400" />
              ) : (
                <div className="h-4 w-4" />
              )}
            </div>
            <span className={`text-sm font-medium ${
              trend === "up" ? "text-red-600 dark:text-red-400" : 
              trend === "down" ? "text-green-600 dark:text-green-400" : 
              "text-slate-600 dark:text-slate-300"
            }`}>
              {change}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// Dashboard Component
export const Dashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [showFileUpload, setShowFileUpload] = useState(false);
  const [showBudgetDialog, setShowBudgetDialog] = useState(false);
  const [uploadedData, setUploadedData] = useState<any>(null);
  const [spendingInsights, setSpendingInsights] = useState<SpendingInsight[]>([]);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [budgetCategory, setBudgetCategory] = useState('');
  const [budgetAmount, setBudgetAmount] = useState('');
  const [showTransactionDialog, setShowTransactionDialog] = useState(false);
  const [recentTransactions, setRecentTransactions] = useState<any[]>([]);
  const { toast } = useToast();

  // Icon mapping for categories
  const getIconComponent = (iconName: string) => {
    const icons: Record<string, React.ComponentType<any>> = {
      UtensilsCrossed,
      Car,
      GraduationCap,
      Gamepad2,
      ShoppingBag,
      Heart,
      Receipt,
      PiggyBank,
      DollarSign
    };
    return icons[iconName] || DollarSign;
  };

  // Fetch spending insights and categories
  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Get user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch categories
      const { data: categoriesData, error: categoriesError } = await supabase
        .from('expense_categories')
        .select('*')
        .order('name');

      if (categoriesError) throw categoriesError;
      setCategories(categoriesData || []);

      // Fetch spending insights using the database function
      const { data: insightsData, error: insightsError } = await supabase
        .rpc('calculate_spending_insights', {
          user_uuid: user.id
        });

      if (insightsError) throw insightsError;
      setSpendingInsights(insightsData || []);

      // Fetch recent transactions for management
      const { data: transactionsData, error: transactionsError } = await supabase
        .from('expenses')
        .select('id, amount, description, date, category_id')
        .eq('user_id', user.id)
        .order('date', { ascending: false })
        .limit(50);

      if (transactionsError) throw transactionsError;
      setRecentTransactions(transactionsData || []);

    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: "Error",
        description: "Failed to load your spending data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Separate savings from expenses
  const savingsInsights = spendingInsights.filter(insight => 
    insight.category_name.toLowerCase().includes('saving') || 
    insight.category_name.toLowerCase().includes('investment') ||
    insight.category_name.toLowerCase().includes('emergency fund')
  );
  const expenseInsights = spendingInsights.filter(insight => 
    !insight.category_name.toLowerCase().includes('saving') && 
    !insight.category_name.toLowerCase().includes('investment') &&
    !insight.category_name.toLowerCase().includes('emergency fund')
  );

  // Calculate summary metrics (excluding savings from expenses)
  const totalSpent = expenseInsights.reduce((sum, insight) => sum + insight.total_spent, 0);
  const totalSaved = savingsInsights.reduce((sum, insight) => sum + insight.total_spent, 0);
  const totalBudget = expenseInsights.reduce((sum, insight) => sum + insight.budget_amount, 0);
  const savingsBudget = savingsInsights.reduce((sum, insight) => sum + insight.budget_amount, 0);
  const totalRemaining = totalBudget - totalSpent;
  const transactionCount = expenseInsights.reduce((sum, insight) => sum + insight.transaction_count, 0);
  const savingsTransactionCount = savingsInsights.reduce((sum, insight) => sum + insight.transaction_count, 0);

  // Get current month name
  const currentMonth = new Date().toLocaleString('default', { month: 'long' });

  const handleFileUpload = (data: any) => {
    setUploadedData(data);
    setShowFileUpload(false);
    // Refresh data after upload
    fetchData();
  };

  const handleSetBudget = async () => {
    if (!budgetCategory || !budgetAmount) {
      toast({
        title: "Error",
        description: "Please select a category and enter a budget amount",
        variant: "destructive",
      });
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const currentDate = new Date();
      const { error } = await supabase
        .from('budgets')
        .upsert({
          user_id: user.id,
          category_id: budgetCategory,
          amount: parseFloat(budgetAmount),
          month: currentDate.getMonth() + 1,
          year: currentDate.getFullYear()
        }, {
          onConflict: 'user_id,category_id,month,year'
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Budget set successfully!",
      });

      setShowBudgetDialog(false);
      setBudgetCategory('');
      setBudgetAmount('');
      fetchData();
    } catch (error) {
      console.error('Error setting budget:', error);
      toast({
        title: "Error",
        description: "Failed to set budget",
        variant: "destructive",
      });
    }
  };

  const handleDeleteBudget = async (categoryId: string, categoryName: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Error",
          description: "You must be logged in to delete budgets",
          variant: "destructive",
        });
        return;
      }

      const currentDate = new Date();
      const { error } = await supabase
        .from('budgets')
        .delete()
        .eq('user_id', user.id)
        .eq('category_id', categoryId)
        .eq('month', currentDate.getMonth() + 1)
        .eq('year', currentDate.getFullYear());

      if (error) throw error;

      toast({
        title: "Success",
        description: `Budget for ${categoryName} deleted successfully`,
      });

      fetchData();
    } catch (error) {
      console.error('Error deleting budget:', error);
      toast({
        title: "Error",
        description: "Failed to delete budget",
        variant: "destructive",
      });
    }
  };

  const handleDeleteTransaction = async (transactionId: string, description: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Error",
          description: "You must be logged in to delete transactions",
          variant: "destructive",
        });
        return;
      }

      const { error } = await supabase
        .from('expenses')
        .delete()
        .eq('id', transactionId)
        .eq('user_id', user.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Transaction "${description}" deleted successfully`,
      });

      fetchData();
    } catch (error) {
      console.error('Error deleting transaction:', error);
      toast({
        title: "Error",
        description: "Failed to delete transaction",
        variant: "destructive",
      });
    }
  };

  const generateReport = () => {
    const reportData = {
      totalSpent,
      totalBudget,
      totalRemaining,
      transactionCount,
      spendingInsights,
      generatedAt: new Date().toISOString()
    };
    
    const dataStr = JSON.stringify(reportData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `financial-report-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
    
    toast({
      title: "Report Generated",
      description: "Your financial report has been downloaded",
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-cyan-50 dark:from-slate-900 dark:via-blue-900 dark:to-slate-800 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading your financial data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-blue-50 dark:from-slate-950 dark:via-slate-900 dark:to-blue-950 p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Enhanced Header */}
        <div className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl rounded-2xl p-6 shadow-xl border border-white/20 dark:border-slate-800/50">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
            <div className="space-y-2">
              <div className="flex items-center space-x-4">
                <div className="p-4 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl shadow-lg">
                  <Sparkles className="h-8 w-8 text-white" />
                </div>
                <div>
                  <h1 className="text-4xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 dark:from-white dark:to-slate-200 bg-clip-text text-transparent">
                    FinSight Analytics
                  </h1>
                  <p className="text-slate-600 dark:text-slate-300 font-medium text-lg">Advanced Financial Intelligence for {currentMonth}</p>
                </div>
              </div>
            </div>
            <div className="flex space-x-3">
              <Button 
                onClick={() => setShowFileUpload(true)}
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg px-6 py-3 rounded-xl font-semibold transition-all duration-200 hover:shadow-xl hover:scale-105"
              >
                <Plus className="mr-2 h-5 w-5" />
                Add Expenses
              </Button>
              <Button 
                onClick={generateReport}
                variant="outline"
                className="border-2 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 px-6 py-3 rounded-xl font-semibold transition-all duration-200 hover:shadow-lg"
              >
                <FileText className="mr-2 h-5 w-5" />
                Export Report
              </Button>
            </div>
          </div>
        </div>

        {/* Enhanced Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <MetricCard
            title="Total Spent"
            value={`$${totalSpent.toFixed(2)}`}
            change={totalBudget > 0 ? `${((totalSpent / totalBudget) * 100).toFixed(1)}% of budget` : "No budget set"}
            trend={totalSpent > totalBudget ? "up" : totalSpent < totalBudget * 0.8 ? "down" : "neutral"}
            icon={<DollarSign className="h-6 w-6 text-red-600" />}
            budget={totalBudget > 0 ? `$${totalBudget.toFixed(2)}` : undefined}
            remaining={totalBudget > 0 ? `$${Math.max(0, totalRemaining).toFixed(2)}` : undefined}
          />
          <MetricCard
            title="Total Saved"
            value={`$${totalSaved.toFixed(2)}`}
            change={savingsBudget > 0 ? `${((totalSaved / savingsBudget) * 100).toFixed(1)}% of savings goal` : `${savingsTransactionCount} savings transactions`}
            trend={totalSaved > 0 ? "down" : "neutral"}
            icon={<PiggyBank className="h-6 w-6 text-green-600" />}
            budget={savingsBudget > 0 ? `$${savingsBudget.toFixed(2)}` : undefined}
            remaining={savingsBudget > 0 ? `$${Math.max(0, savingsBudget - totalSaved).toFixed(2)}` : undefined}
          />
          <MetricCard
            title="Net Worth Change"
            value={totalSaved > totalSpent ? `+$${(totalSaved - totalSpent).toFixed(2)}` : `-$${(totalSpent - totalSaved).toFixed(2)}`}
            change={totalSaved > totalSpent ? "Positive month" : "Spending exceeded savings"}
            trend={totalSaved > totalSpent ? "down" : "up"}
            icon={<TrendingUp className="h-6 w-6 text-blue-600" />}
          />
          <MetricCard
            title="Avg per Transaction"
            value={transactionCount > 0 ? `$${(totalSpent / transactionCount).toFixed(2)}` : "$0.00"}
            change={`${transactionCount} expense transactions`}
            trend="neutral"
            icon={<Receipt className="h-6 w-6 text-purple-600" />}
          />
        </div>

        {/* Main Dashboard Content */}
        <div className="space-y-10">
          {/* Advanced Analytics Section */}
          <div className="space-y-6">
            <div className="bg-gradient-to-r from-purple-600 to-pink-600 rounded-2xl p-6 shadow-xl">
              <div className="flex items-center space-x-4">
                <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl">
                  <Brain className="h-7 w-7 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white">Advanced Analytics</h2>
                  <p className="text-purple-100 font-medium">AI-powered insights and predictions</p>
                </div>
              </div>
            </div>
            <AnalyticsDashboard onClose={() => {}} />
          </div>

          {/* Overview Section */}
          <div className="space-y-6">
            <div className="bg-gradient-to-r from-blue-600 to-cyan-600 rounded-2xl p-6 shadow-xl">
              <div className="flex items-center space-x-4">
                <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl">
                  <PieChart className="h-7 w-7 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white">Spending Overview</h2>
                  <p className="text-blue-100 font-medium">Your financial breakdown for {currentMonth}</p>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Spending by Category */}
              <div className="lg:col-span-2">
                <Card className="shadow-2xl border border-slate-200/50 dark:border-slate-700/50 bg-white/95 dark:bg-slate-800/95 backdrop-blur-xl rounded-2xl overflow-hidden">
                  <CardHeader className="bg-gradient-to-r from-slate-50 to-blue-50 dark:from-slate-800 dark:to-slate-700 border-b border-slate-200/50 dark:border-slate-600/50">
                    <CardTitle className="flex items-center space-x-3 text-slate-900 dark:text-white">
                      <div className="p-2 bg-blue-600 rounded-lg">
                        <PieChart className="h-5 w-5 text-white" />
                      </div>
                      <span className="text-xl font-bold">Spending by Category</span>
                    </CardTitle>
                    <CardDescription className="text-slate-600 dark:text-slate-300 font-medium">
                      Your spending breakdown for {currentMonth}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {spendingInsights.filter(insight => 
                        insight.total_spent > 0 && 
                        !insight.category_name.toLowerCase().includes('saving') &&
                        !insight.category_name.toLowerCase().includes('investment') &&
                        !insight.category_name.toLowerCase().includes('emergency fund')
                      ).length > 0 ? (
                        spendingInsights
                          .filter(insight => 
                            insight.total_spent > 0 && 
                            !insight.category_name.toLowerCase().includes('saving') &&
                            !insight.category_name.toLowerCase().includes('investment') &&
                            !insight.category_name.toLowerCase().includes('emergency fund')
                          )
                          .sort((a, b) => b.total_spent - a.total_spent)
                          .map((insight) => {
                            const category = categories.find(c => c.name === insight.category_name);
                            const IconComponent = category ? getIconComponent(category.icon) : DollarSign;
                            const percentage = totalSpent > 0 ? (insight.total_spent / totalSpent) * 100 : 0;
                            
                            return (
                              <div key={insight.category_name} className="group flex items-center justify-between p-5 bg-gradient-to-r from-white to-slate-50 dark:from-slate-700 dark:to-slate-800 rounded-xl border border-slate-200/50 dark:border-slate-600/50 hover:shadow-lg hover:scale-102 transition-all duration-300">
                                <div className="flex items-center space-x-4">
                                  <div 
                                    className="p-3 rounded-xl shadow-lg group-hover:scale-110 transition-transform duration-200"
                                    style={{ backgroundColor: category?.color || '#6366f1' }}
                                  >
                                    <IconComponent 
                                      className="h-6 w-6 text-white" 
                                    />
                                  </div>
                                  <div>
                                    <p className="font-bold text-slate-900 dark:text-white text-lg">{insight.category_name}</p>
                                    <p className="text-sm text-slate-600 dark:text-slate-300 font-medium">
                                      {insight.transaction_count} transactions
                                    </p>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <p className="font-bold text-2xl text-slate-900 dark:text-white">${insight.total_spent.toFixed(2)}</p>
                                  <p className="text-sm text-slate-600 dark:text-slate-300 font-semibold">{percentage.toFixed(1)}%</p>
                                </div>
                              </div>
                            );
                          })
                      ) : (
                        <div className="h-[300px] flex items-center justify-center">
                          <div className="text-center space-y-4">
                            <PieChart className="h-16 w-16 text-slate-400 mx-auto" />
                            <div>
                              <h3 className="text-lg font-semibold text-slate-600 dark:text-slate-300">No Expenses Yet</h3>
                              <p className="text-sm text-slate-500">Start tracking your expenses to see insights here</p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Sidebar */}
              <div className="space-y-6">
                {/* Budget Overview */}
                <Card className="shadow-2xl border border-slate-200/50 dark:border-slate-700/50 bg-white/95 dark:bg-slate-800/95 backdrop-blur-xl rounded-2xl overflow-hidden">
                  <CardHeader className="bg-gradient-to-r from-emerald-50 to-green-50 dark:from-slate-800 dark:to-slate-700 border-b border-slate-200/50 dark:border-slate-600/50">
                    <CardTitle className="flex items-center space-x-3 text-slate-900 dark:text-white">
                      <div className="p-2 bg-emerald-600 rounded-lg">
                        <Target className="h-5 w-5 text-white" />
                      </div>
                      <span className="text-xl font-bold">Budget Overview</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {spendingInsights.filter(insight => insight.budget_amount > 0).length > 0 ? (
                      spendingInsights
                        .filter(insight => insight.budget_amount > 0)
                        .map((insight) => {
                          const category = categories.find(c => c.name === insight.category_name);
                          const IconComponent = category ? getIconComponent(category.icon) : DollarSign;
                          const budgetUsed = (insight.total_spent / insight.budget_amount) * 100;
                          
                          return (
                            <div key={insight.category_name} className="space-y-2">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-2">
                                  <IconComponent 
                                    className="h-4 w-4" 
                                    style={{ color: category?.color }}
                                  />
                                  <span className="text-sm font-medium">{insight.category_name}</span>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <Badge 
                                    variant={budgetUsed > 100 ? "destructive" : budgetUsed > 80 ? "secondary" : "outline"}
                                    className="text-xs"
                                  >
                                    {budgetUsed.toFixed(0)}%
                                  </Badge>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleDeleteBudget(category?.id || '', insight.category_name)}
                                    className="h-6 w-6 p-0 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                </div>
                              </div>
                              <div className="space-y-1">
                                <Progress value={Math.min(budgetUsed, 100)} className="h-2" />
                                <div className="flex justify-between text-xs text-muted-foreground">
                                  <span>${insight.total_spent.toFixed(2)}</span>
                                  <span>${insight.budget_amount.toFixed(2)}</span>
                                </div>
                              </div>
                            </div>
                          );
                        })
                    ) : (
                      <div className="text-center py-4">
                        <p className="text-sm text-muted-foreground">No budgets set</p>
                        <p className="text-xs text-muted-foreground mt-1">Set budgets to track your spending goals</p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Top Categories */}
                <Card className="shadow-lg border-0 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm">
                  <CardHeader>
                    <CardTitle>Top Spending Categories</CardTitle>
                    <CardDescription>Your biggest expense categories this month</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {spendingInsights
                      .filter(insight => insight.total_spent > 0)
                      .sort((a, b) => b.total_spent - a.total_spent)
                      .slice(0, 5)
                      .map((insight) => {
                        const category = categories.find(c => c.name === insight.category_name);
                        const IconComponent = category ? getIconComponent(category.icon) : DollarSign;
                        
                        return (
                          <div key={insight.category_name} className="flex items-center justify-between p-3 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg cursor-pointer transition-colors">
                            <div className="flex items-center space-x-3">
                              <div 
                                className="p-2 rounded-full"
                                style={{ backgroundColor: category?.color + '20' }}
                              >
                                <IconComponent 
                                  className="h-4 w-4" 
                                  style={{ color: category?.color }}
                                />
                              </div>
                              <div>
                                <p className="font-medium text-sm">{insight.category_name}</p>
                                <p className="text-xs text-muted-foreground">{insight.transaction_count} transactions</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <span className="text-sm font-medium">${insight.total_spent.toFixed(2)}</span>
                            </div>
                          </div>
                        );
                      })}
                    {spendingInsights.filter(insight => insight.total_spent > 0).length === 0 && (
                      <div className="text-center py-4">
                        <p className="text-sm text-muted-foreground">No expenses yet</p>
                        <p className="text-xs text-muted-foreground mt-1">Start adding expenses to see your top categories</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>

          {/* Quick Actions Section */}
          <div className="space-y-6">
            <div className="bg-gradient-to-r from-green-600 to-emerald-600 rounded-2xl p-6 shadow-xl">
              <div className="flex items-center space-x-4">
                <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl">
                  <Zap className="h-7 w-7 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white">Quick Actions</h2>
                  <p className="text-green-100 font-medium">Manage your finances efficiently</p>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
              {/* Add Expense Card */}
              <Card className="shadow-2xl border border-slate-200/50 dark:border-slate-700/50 bg-white/95 dark:bg-slate-800/95 backdrop-blur-xl rounded-2xl overflow-hidden hover:shadow-3xl transition-all duration-300">
                <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-slate-800 dark:to-slate-700 border-b border-slate-200/50 dark:border-slate-600/50 text-center">
                  <div className="flex flex-col items-center space-y-3">
                    <div className="p-4 bg-blue-600 rounded-2xl shadow-lg">
                      <DollarSign className="h-8 w-8 text-white" />
                    </div>
                    <CardTitle className="text-xl font-bold text-slate-900 dark:text-white">Add Expense</CardTitle>
                    <CardDescription className="text-slate-600 dark:text-slate-300 font-medium">Track your spending</CardDescription>
                  </div>
                </CardHeader>
                <CardContent className="p-6">
                  <Button 
                    className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold py-4 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105"
                    onClick={() => setShowFileUpload(true)}
                  >
                    <Plus className="mr-2 h-5 w-5" />
                    Add New Expense
                  </Button>
                </CardContent>
              </Card>

              {/* Set Budget Card */}
              <Card className="shadow-2xl border border-slate-200/50 dark:border-slate-700/50 bg-white/95 dark:bg-slate-800/95 backdrop-blur-xl rounded-2xl overflow-hidden hover:shadow-3xl transition-all duration-300">
                <CardHeader className="bg-gradient-to-r from-emerald-50 to-green-50 dark:from-slate-800 dark:to-slate-700 border-b border-slate-200/50 dark:border-slate-600/50 text-center">
                  <div className="flex flex-col items-center space-y-3">
                    <div className="p-4 bg-emerald-600 rounded-2xl shadow-lg">
                      <Target className="h-8 w-8 text-white" />
                    </div>
                    <CardTitle className="text-xl font-bold text-slate-900 dark:text-white">Set Budget</CardTitle>
                    <CardDescription className="text-slate-600 dark:text-slate-300 font-medium">Manage spending limits</CardDescription>
                  </div>
                </CardHeader>
                <CardContent className="p-6">
                  <Dialog open={showBudgetDialog} onOpenChange={setShowBudgetDialog}>
                    <DialogTrigger asChild>
                      <Button className="w-full bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white font-semibold py-4 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105">
                        <Target className="mr-2 h-5 w-5" />
                        Set New Budget
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Set Budget</DialogTitle>
                        <DialogDescription>
                          Set a monthly budget for a specific category to track your spending goals.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="category">Category</Label>
                          <Select value={budgetCategory} onValueChange={setBudgetCategory}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select a category" />
                            </SelectTrigger>
                            <SelectContent>
                              {categories.map((category) => (
                                <SelectItem key={category.id} value={category.id}>
                                  {category.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label htmlFor="amount">Budget Amount</Label>
                          <Input
                            id="amount"
                            type="number"
                            placeholder="Enter budget amount"
                            value={budgetAmount}
                            onChange={(e) => setBudgetAmount(e.target.value)}
                          />
                        </div>
                      </div>
                      <DialogFooter>
                        <Button onClick={handleSetBudget}>Set Budget</Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </CardContent>
              </Card>

              {/* Generate Report Card */}
              <Card className="shadow-2xl border border-slate-200/50 dark:border-slate-700/50 bg-white/95 dark:bg-slate-800/95 backdrop-blur-xl rounded-2xl overflow-hidden hover:shadow-3xl transition-all duration-300">
                <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-slate-800 dark:to-slate-700 border-b border-slate-200/50 dark:border-slate-600/50 text-center">
                  <div className="flex flex-col items-center space-y-3">
                    <div className="p-4 bg-purple-600 rounded-2xl shadow-lg">
                      <BarChart3 className="h-8 w-8 text-white" />
                    </div>
                    <CardTitle className="text-xl font-bold text-slate-900 dark:text-white">Export Report</CardTitle>
                    <CardDescription className="text-slate-600 dark:text-slate-300 font-medium">Download financial data</CardDescription>
                  </div>
                </CardHeader>
                <CardContent className="p-6">
                  <Button 
                    className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold py-4 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105"
                    onClick={generateReport}
                  >
                    <FileText className="mr-2 h-5 w-5" />
                    Download Report
                  </Button>
                </CardContent>
              </Card>

              {/* Manage Transactions Card */}
              <Card className="shadow-2xl border border-slate-200/50 dark:border-slate-700/50 bg-white/95 dark:bg-slate-800/95 backdrop-blur-xl rounded-2xl overflow-hidden hover:shadow-3xl transition-all duration-300">
                <CardHeader className="bg-gradient-to-r from-red-50 to-orange-50 dark:from-slate-800 dark:to-slate-700 border-b border-slate-200/50 dark:border-slate-600/50 text-center">
                  <div className="flex flex-col items-center space-y-3">
                    <div className="p-4 bg-red-600 rounded-2xl shadow-lg">
                      <Trash2 className="h-8 w-8 text-white" />
                    </div>
                    <CardTitle className="text-xl font-bold text-slate-900 dark:text-white">Manage Data</CardTitle>
                    <CardDescription className="text-slate-600 dark:text-slate-300 font-medium">Delete transactions & budgets</CardDescription>
                  </div>
                </CardHeader>
                <CardContent className="p-6">
                  <Dialog open={showTransactionDialog} onOpenChange={setShowTransactionDialog}>
                    <DialogTrigger asChild>
                      <Button className="w-full bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700 text-white font-semibold py-4 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105">
                        <Settings className="mr-2 h-5 w-5" />
                        Manage Transactions
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle>Manage Transactions</DialogTitle>
                        <DialogDescription>
                          View and delete your transaction history. Be careful - deleted transactions cannot be recovered.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        {recentTransactions.length > 0 ? (
                          recentTransactions.map((transaction) => {
                            const category = categories.find(c => c.id === transaction.category_id);
                            const IconComponent = category ? getIconComponent(category.icon) : DollarSign;
                            
                            return (
                              <div key={transaction.id} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800 rounded-lg border">
                                <div className="flex items-center space-x-3">
                                  <div 
                                    className="p-2 rounded-lg"
                                    style={{ backgroundColor: category?.color + '20' }}
                                  >
                                    <IconComponent 
                                      className="h-4 w-4" 
                                      style={{ color: category?.color }}
                                    />
                                  </div>
                                  <div>
                                    <p className="font-medium text-sm">{transaction.description || 'No description'}</p>
                                    <p className="text-xs text-muted-foreground">
                                      {category?.name} • {new Date(transaction.date).toLocaleDateString()}
                                    </p>
                                  </div>
                                </div>
                                <div className="flex items-center space-x-3">
                                  <span className="font-semibold">${transaction.amount.toFixed(2)}</span>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleDeleteTransaction(transaction.id, transaction.description || 'transaction')}
                                    className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>
                            );
                          })
                        ) : (
                          <div className="text-center py-8">
                            <p className="text-muted-foreground">No transactions found</p>
                          </div>
                        )}
                      </div>
                    </DialogContent>
                  </Dialog>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>

        {/* File Upload Modal */}
        {showFileUpload && (
          <FileUpload
            onUploadComplete={handleFileUpload}
            onClose={() => setShowFileUpload(false)}
          />
        )}
      </div>
    </div>
  );
};

export default Dashboard;
