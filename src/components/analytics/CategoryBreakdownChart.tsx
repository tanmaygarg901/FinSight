import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface CategoryBreakdownChartProps {
  data: Array<{
    category_name: string;
    total_spent: number;
    budget_amount: number;
    transaction_count: number;
  }>;
  categories: Array<{
    id: string;
    name: string;
    color: string;
    icon: string;
  }>;
}

const CategoryBreakdownChart: React.FC<CategoryBreakdownChartProps> = ({ data, categories }) => {
  const chartData = data
    .filter(item => item.total_spent > 0)
    .map(item => {
      const category = categories.find(c => c.name === item.category_name);
      return {
        name: item.category_name,
        value: item.total_spent,
        budget: item.budget_amount,
        transactions: item.transaction_count,
        color: category?.color || '#6b7280',
        percentage: 0 // Will be calculated below
      };
    });

  const totalSpent = chartData.reduce((sum, item) => sum + item.value, 0);
  chartData.forEach(item => {
    item.percentage = totalSpent > 0 ? (item.value / totalSpent) * 100 : 0;
  });

  const budgetComparisonData = data
    .filter(item => item.budget_amount > 0)
    .map(item => {
      const category = categories.find(c => c.name === item.category_name);
      return {
        category: item.category_name,
        spent: item.total_spent,
        budget: item.budget_amount,
        remaining: Math.max(0, item.budget_amount - item.total_spent),
        overBudget: Math.max(0, item.total_spent - item.budget_amount),
        color: category?.color || '#6b7280'
      };
    });

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-gray-800 p-3 rounded-lg border border-gray-600 shadow-lg">
          <p className="text-white font-medium">{data.name}</p>
          <p className="text-blue-400">{`Amount: $${data.value.toFixed(2)}`}</p>
          <p className="text-gray-300">{`${data.percentage.toFixed(1)}% of total`}</p>
          <p className="text-gray-300">{`${data.transactions} transactions`}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Spending Analysis</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="breakdown" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="breakdown">Category Breakdown</TabsTrigger>
            <TabsTrigger value="budget">Budget vs Actual</TabsTrigger>
          </TabsList>
          
          <TabsContent value="breakdown" className="mt-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <h3 className="text-lg font-semibold mb-4">Spending Distribution</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={chartData}
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                      label={({ percentage }) => `${percentage.toFixed(1)}%`}
                    >
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              
              <div>
                <h3 className="text-lg font-semibold mb-4">Category Details</h3>
                <div className="space-y-3 max-h-[300px] overflow-y-auto">
                  {chartData.map((item, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div 
                          className="w-4 h-4 rounded-full"
                          style={{ backgroundColor: item.color }}
                        />
                        <div>
                          <p className="font-medium">{item.name}</p>
                          <p className="text-sm text-gray-500">{item.transactions} transactions</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">${item.value.toFixed(2)}</p>
                        <p className="text-sm text-gray-500">{item.percentage.toFixed(1)}%</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="budget" className="mt-6">
            <div>
              <h3 className="text-lg font-semibold mb-4">Budget Performance</h3>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={budgetComparisonData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
                  <XAxis 
                    dataKey="category" 
                    stroke="#9ca3af"
                    fontSize={12}
                    angle={-45}
                    textAnchor="end"
                    height={80}
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
                    formatter={(value: number, name: string) => [`$${value.toFixed(2)}`, name]}
                  />
                  <Bar dataKey="budget" fill="#10b981" name="Budget" />
                  <Bar dataKey="spent" fill="#3b82f6" name="Spent" />
                  <Bar dataKey="overBudget" fill="#ef4444" name="Over Budget" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default CategoryBreakdownChart;